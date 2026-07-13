import { render } from "lit-html";
import { html, unsafeStatic } from "lit-html/static.js";
import { repeat } from "lit-html/directives/repeat.js";
import type { TemplateResult } from "lit-html";

// -------------------------------------------------------------------
// This build adds, on top of the original core:
//   - destroy(): full teardown of listeners / container / adapter.
//   - placement: six logical corners (RTL-aware), replacing the hardcoded
//     bottom-end. `overflow: "queue"` as an alternative to maxVisible's evict.
//   - Mutable notifications: handle.update(...), a "loading" type, and
//     controller.promise(...) for the loading -> success/error pattern.
//   - Action buttons (Undo / Retry / ...), routed like the dismiss event so
//     behaviour stays in the core and the adapter stays "dumb".
//   - Deduplication via `key`, collapsing repeats into a single toast + count.
//   - Swipe-to-dismiss, pause-when-tab-hidden, and an opt-in aria-live region.
// Every new option defaults to the original behaviour, so this is a superset.
// -------------------------------------------------------------------

export type NotificationType =
  | "info"
  | "success"
  | "warn"
  | "error"
  | "loading";

/** A single action button rendered under the message. */
export interface NotificationAction<C> {
  /** Button label (content of type `C`). */
  label: C;
  /** Invoked on click, before dismissal. May be async. */
  onClick?: () => void | Promise<void>;
  /** Dismiss the notification after `onClick`. Defaults to `true`. */
  dismiss?: boolean;
}

export interface NotificationOptions<C> {
  /**
   * Heading shown above the message.
   * - omitted -> the controller's `autoTitles` policy decides (no heading
   *   unless enabled there).
   * - `false` -> no heading, regardless of the controller policy.
   * - content -> used as-is.
   */
  title?: C | false;
  /**
   * Icon shown to the left of the content, vertically centered.
   * - omitted -> the controller's `autoIcons` policy decides.
   * - `false` -> no icon, regardless of the controller policy.
   * - content -> used as-is, slotted into light DOM. With the lit adapter, use
   *   the `html` tag with a complete `<svg>…</svg>` (not lit's `svg` fragment
   *   tag, which only renders inside an existing `<svg>`).
   */
  icon?: C | false;
  message: C;
  duration?: number;
  /**
   * Dedupe key. A new notification whose key matches a still-present one
   * updates that one in place (content refreshed, timer reset) and bumps a
   * visible count instead of stacking a duplicate. Omit for no dedupe.
   */
  key?: string;
  /** Action buttons rendered under the message. */
  actions?: NotificationAction<C>[];
  /**
   * Whether the user can dismiss this notification (close button, Escape,
   * swipe). Defaults to `true`. Set `false` for e.g. an in-flight loading
   * toast; programmatic dismissal (the handle, timers, `clear`) still works.
   */
  dismissible?: boolean;
}

type NotificationInput<C> = string | NotificationOptions<C>;

/** Returned by `info`/`success`/`warn`/`error` so callers can control a specific notification. */
export interface NotificationHandle<C> {
  id: number;
  dismiss(): void;
  /**
   * Patch a live notification: any provided field replaces the current one,
   * omitted fields are left untouched. Changing `duration` resets the
   * countdown. No-ops once the notification has been dismissed.
   */
  update(options: Partial<NotificationOptions<C>>): void;
}

/** {@link promise} result: a handle plus the settled promise, so callers can await it. */
export interface PromiseHandle<C, T> extends NotificationHandle<C> {
  result: Promise<T>;
}

/** Messages for the three phases of {@link NotificationsController.promise}. */
export interface PromiseMessages<C, T> {
  loading: NotificationInput<C>;
  /** Static input, or a function of the resolved value. */
  success: NotificationInput<C> | ((value: T) => NotificationInput<C>);
  /** Static input, or a function of the rejection reason. */
  error: NotificationInput<C> | ((error: unknown) => NotificationInput<C>);
}

/**
 * Library-wide theme shared by notifications and dialogs. A free-form map of
 * CSS-variable overrides: any key is accepted (hence `Record<string, string>`),
 * and camelCase keys become kebab-case custom properties, e.g. `infoAccent` ->
 * the CSS variable `--info-accent`.
 *
 * Recognised notification keys (all optional): background, text, radius,
 * shadow, infoAccent, successAccent, warnAccent, errorAccent, loadingAccent,
 * titleColor, messageColor, closeColor, closeHoverColor, closeHoverBackground,
 * progressColor, iconColor, actionColor, solidText, darkBackground, darkText,
 * darkCloseColor. `progressColor` overrides the countdown ring for every type
 * and `iconColor` overrides the built-in severity icons; omit them and each
 * uses its severity accent. `actionColor` overrides the (link-style) action
 * label color, which otherwise follows each type's accent. `solidText` is the
 * light foreground used by the `"solid"` appearance (default white);
 * `darkBackground` / `darkText` / `darkCloseColor` style the `"dark"`
 * appearance — see NotificationsOptions.appearance. The dialog half will add
 * its own tokens to the same object.
 */
export type Theme = Record<string, string>;

export const defaultTheme: Theme = {
  background: "#ffffff",
  text: "#111827",
  radius: "5px",
  shadow: "0 10px 25px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.05)",
  infoAccent: "#2563eb",
  successAccent: "#16a34a",
  warnAccent: "#d97706",
  errorAccent: "#dc2626",
  loadingAccent: "#6b7280",
  titleColor: "#111827",
  messageColor: "#374151",
  closeColor: "#9ca3af",
  closeHoverColor: "#374151",
  closeHoverBackground: "rgba(0, 0, 0, 0.06)",
  solidText: "#ffffff",
  darkBackground: "#1f2937",
  darkText: "#f9fafb",
  darkCloseColor: "#9ca3af",
};

/**
 * Merge partial theme tokens over {@link defaultTheme} to produce a full theme.
 * Handy when you want to tweak a few tokens without restating every default.
 */
export function createTheme<Tokens extends Record<string, string>>(
  tokens: Tokens,
): Theme & Tokens {
  return { ...defaultTheme, ...tokens };
}

function toCssVariable(key: string): string {
  return "--" + key.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
}

/**
 * User-facing strings the controller may render but that aren't supplied per
 * notification: the close-button label and the per-severity words used as the
 * default heading and/or screen-reader prefix. Values are plain words ("Error",
 * not "Error:") — the composed punctuation is added by the core.
 */
export type NotificationTexts = Record<
  keyof typeof defaultNotificationTexts,
  string
>;

/** Guaranteed-complete en-US fallback. */
export const defaultNotificationTexts = {
  dismiss: "Dismiss notification",
  info: "Information",
  success: "Success",
  warn: "Warning",
  error: "Error",
  loading: "Loading",
};

/**
 * Optional, partial text resolver. Always returns plain strings (localized text
 * is never framework content). Called at render time so new notifications pick
 * up the current locale. Return `undefined` for any key you don't handle and
 * the en-US {@link defaultNotificationTexts} value is used instead.
 */
export type NotificationTextResolver = (
  key: keyof NotificationTexts,
) => string | undefined;

/**
 * Where the stack is anchored. Horizontal is logical (`start`/`end` follow the
 * container's writing direction, so `end` is right in LTR and left in RTL);
 * `center` anchors to the middle. Defaults to `"bottom-end"`, i.e. the original
 * bottom-right (bottom-left in RTL) behaviour.
 */
export type Placement =
  | "top-start"
  | "top-center"
  | "top-end"
  | "bottom-start"
  | "bottom-center"
  | "bottom-end";

/** How to react when more notifications arrive than {@link NotificationsOptions.maxVisible}. */
export type OverflowMode = "evict" | "queue";

/** Visual style of a notification card. See NotificationsOptions.appearance. */
export type NotificationAppearance = "light" | "dark" | "solid";

export interface NotificationsOptions<C> {
  /**
   * The rendering adapter, which also fixes the content type `C`. Use the
   * built-in {@link litNotificationAdapter} or {@link vanillaAdapter}, or build one with
   * {@link createReactAdapter}.
   */
  adapter: NotificationAdapterFatory<C>;
  theme?: Theme;
  getText?: NotificationTextResolver;
  /**
   * Whether a notification that omits its `title` falls back to the localized
   * severity word as a heading:
   * - `false` (default) -> no heading.
   * - `true` -> heading for every type.
   * - array -> heading only for the listed types, e.g. `["warn", "error"]`.
   *
   * A per-notification `title` (content, or `false` to suppress) overrides it.
   */
  autoTitles?: boolean | NotificationType[];
  /**
   * Whether the built-in severity icon is shown when a notification doesn't
   * supply its own `icon`:
   * - `true` (default) -> icon for every type.
   * - `false` -> no default icons.
   * - array -> icon only for the listed types, e.g. `["warn", "error"]`.
   *
   * A per-notification `icon` (content, or `false` to suppress) overrides it.
   * The `loading` spinner is always shown regardless of this policy.
   */
  autoIcons?: boolean | NotificationType[];
  /**
   * Cap the number of simultaneously visible notifications. When a new one
   * pushes the count past the cap, {@link OverflowMode} decides what happens.
   * Omit for no cap.
   */
  maxVisible?: number;
  /**
   * With `maxVisible` set: `"evict"` (default) dismisses the oldest to make
   * room; `"queue"` holds extras off-screen and shows them as slots free up.
   */
  overflow?: OverflowMode;
  /** Corner the stack is anchored to. Defaults to `"bottom-end"`. */
  placement?: Placement;
  /** Allow horizontal swipe-to-dismiss (toward the anchored edge). Default `true`. */
  dismissOnSwipe?: boolean;
  /** Freeze auto-dismiss timers while the tab is backgrounded. Default `true`. */
  pauseOnHidden?: boolean;
  /**
   * Announce notifications through a persistent visually-hidden `aria-live`
   * region instead of relying on a dynamically-inserted `role="alert"` host
   * (which several screen readers announce unreliably). When `true`, hosts get
   * `role="none"` and the region does the talking. Default `false` to preserve
   * the original per-host role behaviour.
   */
  liveRegion?: boolean;
  /**
   * Visual style of the cards:
   * - `"light"` (default) -> light card with a severity accent stripe.
   * - `"solid"` -> filled/inverted: the severity accent becomes the card
   *   background with light text (`solidText` token, default white) — e.g.
   *   white on a red error card.
   * - `"dark"` -> neutral dark card (`darkBackground`/`darkText` tokens) that
   *   keeps the severity color on the accent stripe, icon and countdown ring.
   *
   * Pass a single value to apply it to every type, or a per-type map to mix
   * them, e.g. `{ error: "solid" }` for solid errors but light everything else
   * (unlisted types fall back to `"light"`).
   */
  appearance?:
    | NotificationAppearance
    | Partial<Record<NotificationType, NotificationAppearance>>;
}

// Shared per-severity opt-in check used by both the title and icon policies.
function policyEnabled(
  policy: boolean | NotificationType[] | undefined,
  type: NotificationType,
): boolean {
  return Array.isArray(policy) ? policy.includes(type) : policy === true;
}

// error/warn interrupt (assertive); info/success/loading wait their turn (polite).
function roleFor(type: NotificationType): "alert" | "status" {
  return type === "error" || type === "warn" ? "alert" : "status";
}

interface Notification<C> {
  id: number;
  type: NotificationType;
  title?: C | false;
  icon?: C | false;
  message: C;
  duration: number;
  removing: boolean;
  // While removing, which exit is playing. Slide victims must be excluded from
  // the FLIP shuffle (it would clobber their sideways transform); fade victims
  // must be included (opacity doesn't conflict with FLIP, and staying in the
  // shuffle keeps them gliding instead of snapping when the list reflows).
  exitMode: "slide" | "fade" | null;
  // Auto-dismiss timer state (supports pause-on-hover / pause-on-hidden).
  timer: number | null; // active setTimeout handle, or null while paused / none
  remaining: number; // ms left to run
  startedAt: number; // timestamp the current run began
  // Dedupe / actions / gating.
  key?: string;
  count: number; // >1 after dedupe collapse; shown as a ×N badge
  actions: NotificationAction<C>[];
  dismissible: boolean;
  // Queue mode: created but held off-screen until a visible slot frees up.
  queued: boolean;
}

export interface NotificationsController<C> {
  info(message: string): NotificationHandle<C>;
  info(options: NotificationOptions<C>): NotificationHandle<C>;
  success(message: string): NotificationHandle<C>;
  success(options: NotificationOptions<C>): NotificationHandle<C>;
  warn(message: string): NotificationHandle<C>;
  warn(options: NotificationOptions<C>): NotificationHandle<C>;
  error(message: string): NotificationHandle<C>;
  error(options: NotificationOptions<C>): NotificationHandle<C>;
  /**
   * Show a loading notification that transitions to success or error when the
   * promise settles. Returns the handle plus `.result` (the settled promise,
   * which rejects if the input does — attach your own `.catch` if needed).
   */
  promise<T>(
    promise: Promise<T>,
    messages: PromiseMessages<C, T>,
  ): PromiseHandle<C, T>;
  clear(): void;
  /** Tear down: cancel timers, drop notifications, remove listeners + container. */
  destroy(): void;
}

// -------------------------------------------------------------------
// Render seam
// -------------------------------------------------------------------

/**
 * A fully-resolved per-notification "view model". The framework-agnostic core
 * computes all policy (title fallback, icon mode, role, severity prefix) and
 * hands the adapter pure data to project into DOM — the adapter contains no
 * policy. `dismissLabel`/`severity` are always plain strings; `icon`/`title`/
 * `message` and each action `label` are content of type `C`.
 */
export interface NotificationView<C> {
  id: number;
  type: NotificationType;
  role: "alert" | "status" | "none";
  duration: number;
  dismissLabel: string;
  iconMode: "custom" | "default" | "none";
  icon: C | null;
  severity: string | null;
  title: C | null;
  message: C;
  actions: { label: C }[];
  dismissible: boolean;
  count: number;
  /** Visual style (see NotificationsOptions.appearance). */
  appearance: NotificationAppearance;
}

/**
 * The only framework-coupled surface. Core owns state, timers, the custom
 * element, hover/dismiss/action delegation and animations; an adapter only
 * projects a keyed list of views into the container it was bound to.
 *
 * CONTRACT: `render` must apply its changes to the DOM **synchronously** before
 * returning. Right after calling it, the core reads hosts back by `data-id`
 * (to start the enter transform and to measure FLIP positions). lit and vanilla
 * are synchronous; the React adapter uses `flushSync` to honor this. `destroy`
 * is optional cleanup (e.g. unmounting a React root).
 */
export interface NotificationAdapter<C> {
  render(views: NotificationView<C>[]): void;
  destroy?(): void;
}

export type NotificationAdapterFatory<C> = (context: {
  container: HTMLElement;
  tag: string;
}) => NotificationAdapter<C>;

const ENTER_EXIT_TRANSITION = "transform 700ms ease-in-out";
const OFFSCREEN_DISTANCE = "120vw";
const OFFSCREEN_DISTANCE_V = "120vh";
const EXIT_MS = 700;

// Cap-eviction exit: a quick fade in place (see remove()'s "fade" mode).
const FADE_TRANSITION = "opacity 500ms ease";
const FADE_MS = 500;

// Fired by the shadow-DOM close button and by swipe-to-dismiss; caught
// (composed + bubbling) on the container, which maps event.target (retargeted
// to the host) back to an id.
const DISMISS_EVENT = "internal-notification:dismiss";

// Global chrome + anything targeting the slotted action buttons. Placement is
// applied as inline styles per controller (see applyPlacement); a single
// notification's own box lives in the custom element's shadow root (see
// SHADOW_STYLES). The action buttons are the exception: they're slotted
// light-DOM <button>s, and ::slotted() styling of native form controls is
// unreliable across engines, so we style them here in the document scope where
// they actually live — which cleanly overrides the UA button chrome. Theme
// tokens still resolve, since the buttons inherit the container's CSS vars.
const containerStyles = `
.notifications-container {
  position: fixed;
  z-index: 10000;
  display: flex;
  gap: 12px;
  pointer-events: none;
}
.notifications-liveregion {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Action buttons rendered as inline text links (not filled buttons).

   These are light-DOM buttons, so the host app's own global button styles
   (design-system resets, bare element rules, Tailwind/Bootstrap base layers)
   land on them too. To reliably out-rank that without !important, every rule
   here carries the extra [data-id] (raising specificity to (0,3,1)) and the
   base rule performs a FULL reset of the properties frameworks typically set —
   not just border/background — so a stray app declaration can't re-boxify the
   link. If your app forces button styles with !important, override via the
   --action-color token or add your own higher-specificity rule. */
.notifications-container [data-id] button[slot="action"] {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  display: inline;
  width: auto;
  min-width: 0;
  height: auto;
  min-height: 0;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 2px;
  background: none;
  box-shadow: none;
  font: inherit;
  font-size: 0.9em;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: normal;
  text-transform: none;
  text-align: inherit;
  text-decoration: none;
  vertical-align: baseline;
  color: var(--action-color, var(--info-accent, #2563eb));
  cursor: pointer;
  transition: opacity 150ms ease;
}

.notifications-container [data-id][type="success"] button[slot="action"] {
  color: var(--action-color, var(--success-accent, #16a34a));
}

.notifications-container [data-id][type="warn"] button[slot="action"] {
  color: var(--action-color, var(--warn-accent, #d97706));
}

.notifications-container [data-id][type="error"] button[slot="action"] {
  color: var(--action-color, var(--error-accent, #dc2626));
}

.notifications-container [data-id][type="loading"] button[slot="action"] {
  color: var(--action-color, var(--loading-accent, #6b7280));
}

/* Hover feedback is a subtle dim rather than an underline: these actions sit in
   their own row (not inline in prose), where semibold accent text already reads
   as actionable, so the underline convention isn't needed and reads dated. */
.notifications-container [data-id] button[slot="action"]:hover {
  opacity: 0.75;
  background: none;
}

.notifications-container [data-id] button[slot="action"]:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* Solid appearance: light links on the accent-colored card (same dim-on-hover). */
.notifications-container [data-id][appearance="solid"] button[slot="action"] {
  color: var(--solid-text, #ffffff);
}

@media (prefers-reduced-motion: reduce) {
  .notifications-container [data-id] button[slot="action"] {
    transition: none;
  }
}
`;

// Shadow-root stylesheet for a single notification. Theme tokens reach here as
// inherited CSS custom properties (they pierce the shadow boundary).
const SHADOW_STYLES = `
:host {
  position: relative;
  box-sizing: border-box;
  width: min(450px, calc(100vw - 40px));
  padding: 14px 18px 14px 22px;
  background: var(--background, #ffffff);
  color: var(--text, #111827);
  border-radius: var(--radius, 5px);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 1em;
  line-height: 1.5;
  box-shadow: var(
    --shadow,
    0 10px 25px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.05)
  );
  overflow: hidden;
  pointer-events: auto;
  transform: translateX(0);
  display: flex;
  align-items: center;
  gap: 12px;
  /* Let vertical scroll pass through while we own horizontal swipe. */
  touch-action: pan-y;
}

.accent {
  position: absolute;
  inset-inline-start: 0.25em;
  top: 0.25em;
  bottom: 0.25em;
  width: 4px;
  border-radius: 2em;
  background: var(--info-accent, #2563eb);
}

:host([type="success"]) .accent {
  background: var(--success-accent, #16a34a);
}

:host([type="warn"]) .accent {
  background: var(--warn-accent, #d97706);
}

:host([type="error"]) .accent {
  background: var(--error-accent, #dc2626);
}

:host([type="loading"]) .accent {
  background: var(--loading-accent, #6b7280);
}

.icon {
  flex: none;
  display: none;
  align-items: center;
  justify-content: center;
  color: var(--icon-color, var(--info-accent, #2563eb));
}

:host([type="success"]) .icon {
  color: var(--icon-color, var(--success-accent, #16a34a));
}

:host([type="warn"]) .icon {
  color: var(--icon-color, var(--warn-accent, #d97706));
}

:host([type="error"]) .icon {
  color: var(--icon-color, var(--error-accent, #dc2626));
}

:host([type="loading"]) .icon {
  color: var(--icon-color, var(--loading-accent, #6b7280));
}

/* Built-in severity icon: shown only when the policy opts in and the caller
   didn't provide their own (loading always opts in). */
:host([icon-mode="default"]) .icon {
  display: inline-flex;
}

.icon svg {
  display: block;
  width: 1.4em;
  height: 1.4em;
}

/* The loading spinner rotates; everything else is static. */
:host([type="loading"]) .icon svg {
  animation: notif-spin 0.75s linear infinite;
}

@keyframes notif-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Caller-supplied icon (light-DOM slot): sized to match the built-in, but not
   tinted — a custom icon keeps its own colors. */
.icon-slot {
  flex: none;
  display: none;
  align-items: center;
  justify-content: center;
}

:host([icon-mode="custom"]) .icon-slot {
  display: inline-flex;
}

::slotted([slot="icon"]) {
  display: block;
  width: 1.4em;
  height: 1.4em;
}

slot {
  display: contents;
}

.content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

::slotted([slot="title"]) {
  font-weight: 600;
  color: var(--title-color, #111827);
}

::slotted([slot="message"]) {
  color: var(--message-color, #374151);
}

/* Screen-reader-only severity prefix. Absolute so it never affects layout. */
::slotted([slot="severity"]) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 4px;
}

:host(:not([has-actions])) .actions {
  display: none;
}

/* The action buttons themselves are styled at the document level (see
   containerStyles) — ::slotted() is unreliable for native form controls. This
   element only lays them out via the slot above. */

.count {
  flex: none;
  align-self: center;
  font-size: 0.8em;
  font-weight: 600;
  opacity: 0.55;
  color: var(--message-color, #374151);
}

.close-wrap {
  flex: none;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.4em;
  height: 2.4em;
  margin-inline-end: -0.4em;
}

/* Non-dismissible + nothing to count down: the whole affordance collapses. */
:host([dismissible="false"][duration="0"]) .close-wrap {
  display: none;
}

.progress-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  pointer-events: none;
  display: block;
}

.progress-ring__value {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  /* r is chosen so the circumference is exactly 100 user units, so the dash
     values read as a simple 0..100 "percent remaining". */
  stroke-dasharray: 100;
  stroke-dashoffset: 0;
  stroke: var(--progress-color, var(--info-accent, #2563eb));
  animation: notif-countdown var(--notif-duration, 7000ms) linear forwards;
  /* Driven to "paused" by the controller when the tab is hidden. */
  animation-play-state: var(--notif-play-state, running);
}

:host([type="success"]) .progress-ring__value {
  stroke: var(--progress-color, var(--success-accent, #16a34a));
}

:host([type="warn"]) .progress-ring__value {
  stroke: var(--progress-color, var(--warn-accent, #d97706));
}

:host([type="error"]) .progress-ring__value {
  stroke: var(--progress-color, var(--error-accent, #dc2626));
}

/* Freezes together with the JS auto-dismiss timer, which also pauses on hover.
   More specific than the var rule above, so hover always wins. */
:host(:hover) .progress-ring__value {
  animation-play-state: paused;
}

/* Sticky notifications (duration 0), incl. loading, have nothing to count down. */
:host([duration="0"]) .progress-ring {
  display: none;
}

/* Hide the button (but keep the ring) when the user can't dismiss. */
:host([dismissible="false"]) .close {
  display: none;
}

@keyframes notif-countdown {
  to {
    stroke-dashoffset: 100;
  }
}

.close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2em;
  height: 2em;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--close-color, #9ca3af);
  cursor: pointer;
  border-radius: 50%;
  transition: color 150ms ease, background 150ms ease;
}

.close:hover {
  color: var(--close-hover-color, #374151);
  background: var(--close-hover-background, rgba(0, 0, 0, 0.06));
}

.close svg {
  display: block;
  width: 1.15em;
  height: 1.15em;
}

/* -------------------------------------------------------------------------
   Appearance variants (see NotificationsOptions.appearance). Placed after the
   per-type rules above so they win on equal-specificity ties by source order.

   "solid": the whole card takes the severity accent as its background, with a
   light foreground (--solid-text, default white). Good for e.g. white-on-red
   errors.
   ------------------------------------------------------------------------- */
:host([appearance="solid"]) {
  background: var(--info-accent, #2563eb);
  color: var(--solid-text, #ffffff);
}

:host([appearance="solid"][type="success"]) {
  background: var(--success-accent, #16a34a);
}

:host([appearance="solid"][type="warn"]) {
  background: var(--warn-accent, #d97706);
}

:host([appearance="solid"][type="error"]) {
  background: var(--error-accent, #dc2626);
}

:host([appearance="solid"][type="loading"]) {
  background: var(--loading-accent, #6b7280);
}

/* The whole card is the accent now, so the little stripe is redundant. */
:host([appearance="solid"]) .accent {
  display: none;
}

:host([appearance="solid"]) .icon,
:host([appearance="solid"]) ::slotted([slot="title"]),
:host([appearance="solid"]) ::slotted([slot="message"]),
:host([appearance="solid"]) .count {
  color: var(--solid-text, #ffffff);
}

:host([appearance="solid"]) .close {
  color: var(--solid-text, #ffffff);
  opacity: 0.85;
}

:host([appearance="solid"]) .close:hover {
  color: var(--solid-text, #ffffff);
  opacity: 1;
  background: rgba(255, 255, 255, 0.18);
}

:host([appearance="solid"]) .progress-ring__value {
  stroke: var(--solid-text, #ffffff);
  opacity: 0.85;
}

/* "dark": a neutral dark card (--dark-background) with light text
   (--dark-text). Unlike "solid", the severity color is *kept* for the accent
   stripe, icon and countdown ring — so it reads as a dark-mode toast rather
   than a colored one. */
:host([appearance="dark"]) {
  background: var(--dark-background, #1f2937);
  color: var(--dark-text, #f9fafb);
}

:host([appearance="dark"]) ::slotted([slot="title"]),
:host([appearance="dark"]) ::slotted([slot="message"]),
:host([appearance="dark"]) .count {
  color: var(--dark-text, #f9fafb);
}

:host([appearance="dark"]) .close {
  color: var(--dark-close-color, #9ca3af);
}

:host([appearance="dark"]) .close:hover {
  color: var(--dark-text, #f9fafb);
  background: rgba(255, 255, 255, 0.1);
}

@media (prefers-reduced-motion: reduce) {
  :host,
  .close {
    transition: none;
  }

  .progress-ring,
  :host([type="loading"]) .icon svg {
    animation: none;
  }
}
`;

const SHADOW_HTML = `
<style>${SHADOW_STYLES}</style>
<span class="accent"></span>
<span class="icon" aria-hidden="true"></span>
<span class="icon-slot" aria-hidden="true"><slot name="icon"></slot></span>
<div class="content">
  <slot name="severity"></slot>
  <slot name="title"></slot>
  <slot name="message"></slot>
  <div class="actions"><slot name="action"></slot></div>
</div>
<span class="count" aria-hidden="true"></span>
<div class="close-wrap">
  <svg class="progress-ring" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
    <circle class="progress-ring__value" cx="18" cy="18" r="15.9155"></circle>
  </svg>
  <button class="close" type="button">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false">
      <line x1="6" y1="6" x2="18" y2="18"></line>
      <line x1="18" y1="6" x2="6" y2="18"></line>
    </svg>
  </button>
</div>
`;

// Resolved lazily on first controller creation so importing this module never
// touches the DOM (SSR-safe) and the element class only references HTMLElement
// when actually running in a browser. Returns the plain tag string; adapters
// decide how to use it.
let tagCache: string | null = null;

function ensureElementRegistered(): string {
  if (tagCache) {
    return tagCache;
  }

  class NotificationElement extends HTMLElement {
    private button: HTMLButtonElement | null = null;
    private iconEl: HTMLElement | null = null;
    private ringEl: SVGElement | null = null;
    private countEl: HTMLElement | null = null;

    // Swipe state.
    private dragging = false;
    private dragStartX = 0;
    private dx = 0;
    private swipeDir: "left" | "right" | null = null;

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = SHADOW_HTML;
      this.button = root.querySelector<HTMLButtonElement>("button.close");
      this.iconEl = root.querySelector<HTMLElement>(".icon");
      this.ringEl = root.querySelector<SVGElement>(".progress-ring__value");
      this.countEl = root.querySelector<HTMLElement>(".count");
      this.button?.addEventListener("click", () => this.emitDismiss());

      this.addEventListener("pointerdown", this.onPointerDown);
      this.addEventListener("pointermove", this.onPointerMove);
      this.addEventListener("pointerup", this.onPointerUp);
      this.addEventListener("pointercancel", this.onPointerUp);
    }

    private emitDismiss(): void {
      this.dispatchEvent(
        new CustomEvent(DISMISS_EVENT, { bubbles: true, composed: true }),
      );
    }

    static get observedAttributes(): string[] {
      return ["dismiss-label", "duration", "type", "count"];
    }

    attributeChangedCallback(
      name: string,
      _oldValue: string | null,
      value: string | null,
    ): void {
      if (name === "dismiss-label") {
        this.button?.setAttribute("aria-label", value ?? "");
      } else if (name === "duration") {
        // Feed the ring's animation-duration via a custom property. Kept off
        // the renderer's radar (attribute, not inline style) so it never
        // collides with the imperative slide transform written to the style.
        this.style.setProperty("--notif-duration", `${value ?? "0"}ms`);
        // A duration change on a persistent host (e.g. loading -> success via
        // update/promise) must restart the countdown from full, otherwise the
        // already-"finished" forwards animation leaves an empty ring.
        if (value && value !== "0" && this.ringEl) {
          this.ringEl.style.animation = "none";
          void this.ringEl.getBoundingClientRect();
          this.ringEl.style.animation = "";
        }
      } else if (name === "type" && this.iconEl) {
        // Swap in the severity icon. Decorative only (aria-hidden), since the
        // severity is already conveyed by role + the sr-only prefix.
        const icon = value
          ? notificationIcons[value as NotificationType]
          : undefined;
        this.iconEl.innerHTML = icon ?? "";
      } else if (name === "count" && this.countEl) {
        const n = Number(value);
        this.countEl.textContent = n > 1 ? `×${n}` : "";
      }
    }

    // --- swipe-to-dismiss ---------------------------------------------------
    // Only toward the anchored edge (matching the exit slide's direction, read
    // from the container's data-swipe). Buttons and non-dismissible hosts are
    // exempt. On release past threshold we just emit the dismiss event and let
    // the core run its normal slide-out from wherever the finger left off.

    private onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0 && event.pointerType === "mouse") {
        return;
      }
      if ((event.target as HTMLElement | null)?.closest("button")) {
        return;
      }
      if (this.getAttribute("dismissible") === "false") {
        return;
      }
      const dir = this.closest<HTMLElement>(".notifications-container")?.dataset
        .swipe;
      if (dir !== "left" && dir !== "right") {
        return;
      }
      this.swipeDir = dir;
      this.dragging = true;
      this.dx = 0;
      this.dragStartX = event.clientX;
      this.style.transition = "none";
      this.setPointerCapture(event.pointerId);
    };

    private onPointerMove = (event: PointerEvent): void => {
      if (!this.dragging) {
        return;
      }
      let dx = event.clientX - this.dragStartX;
      // Clamp to the anchored direction so an "away" drag doesn't pull it out.
      dx = this.swipeDir === "right" ? Math.max(0, dx) : Math.min(0, dx);
      this.dx = dx;
      const width = this.offsetWidth || 1;
      const progress = Math.min(1, Math.abs(dx) / width);
      this.style.transform = `translateX(${dx}px)`;
      this.style.opacity = String(1 - progress * 0.6);
    };

    private onPointerUp = (): void => {
      if (!this.dragging) {
        return;
      }
      this.dragging = false;
      const width = this.offsetWidth || 1;
      const threshold = Math.max(60, width * 0.3);
      if (Math.abs(this.dx) > threshold) {
        this.emitDismiss();
      } else {
        // Snap back.
        this.style.transition = "transform 200ms ease, opacity 200ms ease";
        this.style.transform = "";
        this.style.opacity = "";
      }
    };
  }

  // Grab the first unused "internal-notification-N" tag.
  let n = 1;
  let tag = `internal-notification-${n}`;
  while (customElements.get(tag)) {
    n += 1;
    tag = `internal-notification-${n}`;
  }

  customElements.define(tag, NotificationElement);
  tagCache = tag;
  return tag;
}

// -------------------------------------------------------------------
// Adapters
// -------------------------------------------------------------------

/**
 * lit-html adapter. Content is a lit `TemplateResult` or a plain string. The
 * keyed `repeat` is essential: an unkeyed list would let lit reuse DOM nodes by
 * position, leaking the imperative slide-out transform onto whichever
 * notification lands in that slot after a re-render.
 */
export type LitContent = string | TemplateResult;

export const litNotificationAdapter: NotificationAdapterFatory<LitContent> = ({
  container,
  tag,
}) => {
  const staticTag = unsafeStatic(tag);

  return {
    render(views) {
      render(
        html`
          ${repeat(
            views,
            (view) => view.id,
            (view) => html`
              <${staticTag}
                data-id=${view.id}
                type=${view.type}
                role=${view.role}
                duration=${view.duration}
                dismiss-label=${view.dismissLabel}
                icon-mode=${view.iconMode}
                dismissible=${String(view.dismissible)}
                count=${view.count}
                ?has-actions=${view.actions.length > 0}
                appearance=${view.appearance}
              >
                ${
                  view.icon !== null
                    ? html`<span slot="icon">${view.icon}</span>`
                    : ""
                }
                ${
                  view.severity !== null
                    ? html`<span slot="severity">${view.severity}</span>`
                    : ""
                }
                ${
                  view.title !== null
                    ? html`<span slot="title">${view.title}</span>`
                    : ""
                }
                <span slot="message">${view.message}</span>
                ${view.actions.map(
                  (action, index) => html`
                    <button
                      slot="action"
                      type="button"
                      data-action-index=${index}
                    >
                      ${action.label}
                    </button>
                  `,
                )}
              </${staticTag}>
            `,
          )}
        `,
        container,
      );
    },
    destroy() {
      container.replaceChildren();
    },
  };
};

/**
 * Framework-free adapter. Content is a plain string or a DOM `Node`. Does its
 * own keyed reconciliation of the host list.
 */
export type VanillaContent = string | Node;

function setAttrIfChanged(el: Element, name: string, value: string) {
  // Avoid re-triggering attributeChangedCallback (e.g. re-injecting the icon)
  // when nothing actually changed.
  if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
}

function toggleAttr(el: Element, name: string, on: boolean) {
  if (on) {
    if (!el.hasAttribute(name)) {
      el.setAttribute(name, "");
    }
  } else if (el.hasAttribute(name)) {
    el.removeAttribute(name);
  }
}

function buildSlot(
  slot: string,
  content: VanillaContent | null,
): HTMLElement[] {
  if (content === null) {
    return [];
  }
  const span = document.createElement("span");
  span.setAttribute("slot", slot);
  if (typeof content === "string") {
    span.textContent = content;
  } else {
    span.appendChild(content);
  }
  return [span];
}

function buildActions(actions: { label: VanillaContent }[]): HTMLElement[] {
  return actions.map((action, index) => {
    const button = document.createElement("button");
    button.setAttribute("slot", "action");
    button.type = "button";
    button.dataset.actionIndex = String(index);
    if (typeof action.label === "string") {
      button.textContent = action.label;
    } else {
      button.appendChild(action.label);
    }
    return button;
  });
}

export const vanillaAdapter: NotificationAdapterFatory<VanillaContent> = ({
  container,
  tag,
}) => {
  return {
    render(views) {
      const existing = new Map<number, HTMLElement>();
      container
        .querySelectorAll<HTMLElement>("[data-id]")
        .forEach((el) => existing.set(Number(el.dataset.id), el));

      const desired = new Set(views.map((view) => view.id));
      existing.forEach((el, id) => {
        if (!desired.has(id)) {
          el.remove();
        }
      });

      views.forEach((view, index) => {
        let host = existing.get(view.id);
        if (!host) {
          host = document.createElement(tag);
          host.dataset.id = String(view.id);
        }

        setAttrIfChanged(host, "type", view.type);
        setAttrIfChanged(host, "role", view.role);
        setAttrIfChanged(host, "duration", String(view.duration));
        setAttrIfChanged(host, "dismiss-label", view.dismissLabel);
        setAttrIfChanged(host, "icon-mode", view.iconMode);
        setAttrIfChanged(host, "dismissible", String(view.dismissible));
        setAttrIfChanged(host, "count", String(view.count));
        toggleAttr(host, "has-actions", view.actions.length > 0);
        setAttrIfChanged(host, "appearance", view.appearance);

        // Rebuild light-DOM slotted content. The host itself is reused (keyed
        // by id), so the shadow chrome and its running ring animation persist.
        host.replaceChildren(
          ...buildSlot("icon", view.icon),
          ...buildSlot("severity", view.severity),
          ...buildSlot("title", view.title),
          ...buildSlot("message", view.message),
          ...buildActions(view.actions),
        );

        if (container.children[index] !== host) {
          container.insertBefore(host, container.children[index] ?? null);
        }
      });
    },
    destroy() {
      container
        .querySelectorAll<HTMLElement>("[data-id]")
        .forEach((el) => el.remove());
    },
  };
};

/**
 * Minimal structural view of the React APIs the adapter needs — declared
 * locally so this module never imports (or forces a dependency on) React.
 * Supply the real functions when building the adapter.
 */
export interface ReactRuntime<Node = unknown> {
  Fragment: unknown;
  createElement: (
    type: unknown,
    props: unknown,
    ...children: unknown[]
  ) => Node;
  createRoot: (container: Element) => {
    render: (node: Node) => void;
    unmount: () => void;
  };
  flushSync: (callback: () => void) => void;
}

/**
 * React adapter, built by injecting React's `createElement`/`createRoot`/
 * `flushSync`/`Fragment` — keeping React out of this module's dependencies.
 * Content is whatever your React types call a node (pass the type param):
 *
 *   import * as React from "react";
 *   import { createRoot } from "react-dom/client";
 *   import { flushSync } from "react-dom";
 *   const reactAdapter = createReactAdapter<React.ReactNode>({
 *     Fragment: React.Fragment,
 *     createElement: React.createElement,
 *     createRoot,
 *     flushSync,
 *   });
 *
 * `flushSync` is required so `render` commits synchronously (see RenderAdapter).
 */
export function createReactAdapter<Node = unknown>(
  react: ReactRuntime<Node>,
): NotificationAdapterFatory<Node> {
  return ({ container, tag }) => {
    const root = react.createRoot(container);

    return {
      render(views) {
        const hosts = views.map((view) => {
          const children: Node[] = [];

          if (view.icon !== null) {
            children.push(
              react.createElement(
                "span",
                { key: "i", slot: "icon" },
                view.icon,
              ),
            );
          }
          if (view.severity !== null) {
            children.push(
              react.createElement(
                "span",
                { key: "s", slot: "severity" },
                view.severity,
              ),
            );
          }
          if (view.title !== null) {
            children.push(
              react.createElement(
                "span",
                { key: "t", slot: "title" },
                view.title,
              ),
            );
          }
          children.push(
            react.createElement(
              "span",
              { key: "m", slot: "message" },
              view.message,
            ),
          );
          view.actions.forEach((action, index) => {
            children.push(
              react.createElement(
                "button",
                {
                  key: `a${index}`,
                  slot: "action",
                  type: "button",
                  "data-action-index": index,
                },
                action.label,
              ),
            );
          });

          return react.createElement(
            tag,
            {
              key: view.id,
              "data-id": view.id,
              type: view.type,
              role: view.role,
              duration: view.duration,
              "dismiss-label": view.dismissLabel,
              "icon-mode": view.iconMode,
              dismissible: String(view.dismissible),
              count: view.count,
              "has-actions": view.actions.length > 0 ? "" : undefined,
              appearance: view.appearance,
            },
            ...children,
          );
        });

        // Synchronous commit so the core can read hosts back immediately.
        react.flushSync(() => {
          root.render(react.createElement(react.Fragment, null, ...hosts));
        });
      },
      destroy() {
        root.unmount();
      },
    };
  };
}

function injectContainerStyles() {
  if (document.getElementById("notifications-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "notifications-styles";
  style.textContent = containerStyles;
  document.head.appendChild(style);
}

function splitPlacement(placement: Placement): {
  vertical: "top" | "bottom";
  horizontal: "start" | "center" | "end";
} {
  const [vertical, horizontal] = placement.split("-") as [
    "top" | "bottom",
    "start" | "center" | "end",
  ];
  return { vertical, horizontal };
}

// Anchor the container. Applied as inline styles so two controllers can live in
// different corners; the newest notification always sits nearest the anchored
// edge (column for bottom, column-reverse for top).
function applyPlacement(container: HTMLElement, placement: Placement) {
  const { vertical, horizontal } = splitPlacement(placement);
  const s = container.style;

  s.flexDirection = vertical === "top" ? "column-reverse" : "column";
  s.top = vertical === "top" ? "20px" : "auto";
  s.bottom = vertical === "bottom" ? "20px" : "auto";

  if (horizontal === "center") {
    s.left = "50%";
    s.transform = "translateX(-50%)";
    s.insetInlineStart = "auto";
    s.insetInlineEnd = "auto";
    s.alignItems = "center";
  } else {
    s.left = "auto";
    s.transform = "none";
    s.insetInlineEnd = horizontal === "end" ? "20px" : "auto";
    s.insetInlineStart = horizontal === "start" ? "20px" : "auto";
    s.alignItems = horizontal === "end" ? "flex-end" : "flex-start";
  }
}

export function createNotificationsController<C>(
  options: NotificationsOptions<C>,
): NotificationsController<C> {
  const { adapter, theme, getText, autoTitles, maxVisible } = options;
  // Icons are on by default (they were always shown before this option existed).
  const autoIcons = options.autoIcons ?? true;
  const placement = options.placement ?? "bottom-end";
  const overflow = options.overflow ?? "evict";
  const dismissOnSwipe = options.dismissOnSwipe ?? true;
  const pauseOnHidden = options.pauseOnHidden ?? true;
  const liveRegion = options.liveRegion ?? false;
  const appearanceOption = options.appearance ?? "light";

  // Resolve the appearance for a type: a single value applies to all; a
  // per-type map falls back to "light" for anything unlisted.
  function appearanceFor(type: NotificationType): NotificationAppearance {
    return typeof appearanceOption === "string"
      ? appearanceOption
      : (appearanceOption[type] ?? "light");
  }

  injectContainerStyles();
  const tag = ensureElementRegistered();

  function text(key: keyof NotificationTexts): string {
    return getText?.(key) ?? defaultNotificationTexts[key];
  }

  const reducedMotionQuery =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;

  function prefersReducedMotion(): boolean {
    return reducedMotionQuery?.matches ?? false;
  }

  const container = document.createElement("div");
  container.className = "notifications-container";
  applyPlacement(container, placement);

  // Merge over the defaults and expose every entry as a CSS custom property on
  // the container. Variables inherit down to each host and pierce its shadow
  // root, so the theme is scoped per controller even though the element's
  // stylesheet lives in shadow DOM.
  const mergedTheme = { ...defaultTheme, ...theme };
  for (const [key, value] of Object.entries(mergedTheme)) {
    container.style.setProperty(toCssVariable(key), value);
  }

  document.body.appendChild(container);

  // Resolve the swipe-dismiss direction (physical, RTL-aware) once the
  // container is in the DOM. The custom element reads container.dataset.swipe.
  (function computeSwipeData() {
    const { horizontal } = splitPlacement(placement);
    if (!dismissOnSwipe || horizontal === "center") {
      container.dataset.swipe = "off";
      return;
    }
    const rtl = getComputedStyle(container).direction === "rtl";
    const toRight = (horizontal === "end") !== rtl;
    container.dataset.swipe = toRight ? "right" : "left";
  })();

  // Persistent aria-live regions (opt-in). More reliable than announcing via a
  // freshly-inserted role="alert" host.
  let politeRegion: HTMLElement | null = null;
  let assertiveRegion: HTMLElement | null = null;
  if (liveRegion) {
    politeRegion = document.createElement("div");
    politeRegion.className = "notifications-liveregion";
    politeRegion.setAttribute("aria-live", "polite");
    politeRegion.setAttribute("role", "status");

    assertiveRegion = document.createElement("div");
    assertiveRegion.className = "notifications-liveregion";
    assertiveRegion.setAttribute("aria-live", "assertive");
    assertiveRegion.setAttribute("role", "alert");

    container.append(politeRegion, assertiveRegion);
  }

  // Bind the chosen adapter to this controller's container + element tag.
  const renderer = adapter({ container, tag });

  const notifications: Notification<C>[] = [];
  let nextId = 0;
  let destroyed = false;

  // Close-button clicks and swipes arrive here as a composed, bubbling event;
  // the event target is retargeted to the host element, so we read its data-id.
  container.addEventListener(DISMISS_EVENT, (event) => {
    const host = event.target as HTMLElement | null;
    if (!host) {
      return;
    }
    const id = Number(host.dataset.id);
    if (!Number.isNaN(id)) {
      remove(id);
    }
  });

  // Action-button clicks (light-DOM slotted buttons). Behaviour lives here,
  // keyed by the button's data-action-index — the adapter only renders labels.
  container.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-action-index]",
    );
    if (!button) {
      return;
    }
    const host = button.closest<HTMLElement>("[data-id]");
    if (!host) {
      return;
    }
    const id = Number(host.dataset.id);
    const index = Number(button.dataset.actionIndex);
    const notification = notifications.find((item) => item.id === id);
    const action = notification?.actions[index];
    if (!action) {
      return;
    }
    action.onClick?.();
    if (action.dismiss !== false) {
      remove(id);
    }
  });

  // Pause auto-dismiss while the pointer is over a notification; resume on
  // leave. Delegated on the container (mouseover/out bubble, unlike
  // enter/leave), so adapters needn't wire per-host listeners. pause/resume are
  // effectively idempotent, and a stray resume immediately followed by a pause
  // during intra-card movement recomputes ~0 elapsed, so the countdown doesn't
  // drift.
  container.addEventListener("mouseover", (event) => {
    const host = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-id]",
    );
    if (host) {
      pause(Number(host.dataset.id));
    }
  });

  container.addEventListener("mouseout", (event) => {
    const host = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-id]",
    );
    if (host) {
      resume(Number(host.dataset.id));
    }
  });

  // Escape dismisses the most recent still-present, dismissible notification.
  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") {
      return;
    }

    for (let i = notifications.length - 1; i >= 0; i--) {
      const notification = notifications[i];
      if (
        !notification.removing &&
        !notification.queued &&
        notification.dismissible
      ) {
        remove(notification.id);
        break;
      }
    }
  }
  document.addEventListener("keydown", onKeyDown);

  // Freeze timers + the CSS ring while the tab is backgrounded, so a
  // notification doesn't silently expire off-screen.
  function onVisibilityChange() {
    if (document.hidden) {
      pauseAll();
      container.style.setProperty("--notif-play-state", "paused");
    } else {
      container.style.setProperty("--notif-play-state", "running");
      resumeAll();
    }
  }
  if (pauseOnHidden) {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  function offscreenTransform(): string {
    const { vertical, horizontal } = splitPlacement(placement);
    if (horizontal === "center") {
      return `translateY(${vertical === "top" ? "-" : ""}${OFFSCREEN_DISTANCE_V})`;
    }
    const rtl = getComputedStyle(container).direction === "rtl";
    const toRight = (horizontal === "end") !== rtl;
    return `translateX(${toRight ? "" : "-"}${OFFSCREEN_DISTANCE})`;
  }

  function startTimer(notification: Notification<C>) {
    if (notification.duration <= 0 || notification.remaining <= 0) {
      return;
    }

    notification.startedAt = Date.now();
    notification.timer = window.setTimeout(() => {
      notification.timer = null;
      remove(notification.id);
    }, notification.remaining);
  }

  function pause(id: number) {
    const notification = notifications.find((item) => item.id === id);

    if (!notification || notification.timer === null) {
      return;
    }

    window.clearTimeout(notification.timer);
    notification.timer = null;
    notification.remaining = Math.max(
      0,
      notification.remaining - (Date.now() - notification.startedAt),
    );
  }

  function resume(id: number) {
    const notification = notifications.find((item) => item.id === id);

    if (
      !notification ||
      notification.removing ||
      notification.queued ||
      notification.timer !== null ||
      notification.duration <= 0
    ) {
      return;
    }

    startTimer(notification);
  }

  function pauseAll() {
    for (const notification of notifications) {
      pause(notification.id);
    }
  }

  function resumeAll() {
    // Won't override a hover pause: with a hidden tab there's no pointer, and
    // resume() is a no-op for anything already running.
    for (const notification of notifications) {
      resume(notification.id);
    }
  }

  function getPositions() {
    const positions = new Map<number, DOMRect>();

    container.querySelectorAll<HTMLElement>("[data-id]").forEach((element) => {
      positions.set(
        Number(element.dataset.id),
        element.getBoundingClientRect(),
      );
    });

    return positions;
  }

  function animateMovement(previous: Map<number, DOMRect>) {
    if (prefersReducedMotion()) {
      return;
    }

    requestAnimationFrame(() => {
      container
        .querySelectorAll<HTMLElement>("[data-id]")
        .forEach((element) => {
          const id = Number(element.dataset.id);

          // Skip notifications that are sliding out: they're gliding off-screen
          // via their own transform, which a FLIP translateY here would stomp
          // on. Fade-exiting ones are deliberately NOT skipped — opacity doesn't
          // conflict with the shuffle, and keeping them in it makes them glide
          // to their new slot instead of snapping (the "jump" while fading).
          const notification = notifications.find((item) => item.id === id);
          if (notification?.removing && notification.exitMode === "slide") {
            return;
          }

          const oldPosition = previous.get(id);

          if (!oldPosition) {
            return;
          }

          const newPosition = element.getBoundingClientRect();
          const deltaY = oldPosition.top - newPosition.top;

          if (deltaY !== 0) {
            element.animate(
              [
                { transform: `translateY(${deltaY}px)` },
                { transform: "translateY(0)" },
              ],
              {
                duration: 400,
                easing: "ease-in-out",
              },
            );
          }
        });
    });
  }

  // Resolve a notification into the fully-computed view model the adapter
  // renders. All policy (title fallback, severity prefix, icon mode) lives here
  // so adapters stay dumb.
  function toView(notification: Notification<C>): NotificationView<C> {
    // A visible default heading (the severity word) is shown only when the
    // caller omitted the title AND the controller policy opts this type in.
    const defaultTitleShown =
      notification.title === undefined &&
      policyEnabled(autoTitles, notification.type);

    // Resolve the heading: `false` -> none; omitted -> policy default or none;
    // otherwise the caller's value.
    let title: C | null;
    if (notification.title === false) {
      title = null;
    } else if (notification.title === undefined) {
      title = defaultTitleShown
        ? (text(notification.type) as unknown as C)
        : null;
    } else {
      title = notification.title;
    }

    // The hidden severity prefix is redundant only when a visible default
    // heading already states the severity. Punctuation is composed here so
    // every adapter renders the same string.
    const severity = defaultTitleShown ? null : `${text(notification.type)}: `;

    // Resolve the icon into one of three modes:
    // - "custom": caller supplied one -> slot it (light DOM).
    // - "default": omitted + policy opts in (or loading) -> shadow built-in.
    // - "none": `false`, or omitted with the policy off.
    const customIcon =
      notification.icon !== undefined && notification.icon !== false
        ? notification.icon
        : null;
    let iconMode: NotificationView<C>["iconMode"];
    if (customIcon !== null) {
      iconMode = "custom";
    } else if (
      notification.type === "loading" ||
      (notification.icon === undefined &&
        policyEnabled(autoIcons, notification.type))
    ) {
      // The spinner IS the loading affordance, so it ignores the icon policy.
      iconMode = notification.icon === false ? "none" : "default";
    } else {
      iconMode = "none";
    }

    return {
      id: notification.id,
      type: notification.type,
      role: liveRegion ? "none" : roleFor(notification.type),
      duration: notification.duration,
      dismissLabel: text("dismiss"),
      iconMode,
      icon: customIcon,
      severity,
      title,
      message: notification.message,
      actions: notification.actions.map((action) => ({ label: action.label })),
      dismissible: notification.dismissible,
      count: notification.count,
      appearance: appearanceFor(notification.type),
    };
  }

  function update(previous?: Map<number, DOMRect>) {
    // Queued notifications exist in state but aren't rendered yet.
    renderer.render(notifications.filter((item) => !item.queued).map(toView));

    if (previous) {
      animateMovement(previous);
    }
  }

  // Compose the announcement from what's actually on screen (works for any
  // content type, since we read the rendered light-DOM text).
  function announce(notification: Notification<C>) {
    if (!liveRegion) {
      return;
    }
    const host = container.querySelector<HTMLElement>(
      `[data-id="${notification.id}"]`,
    );
    const titleText =
      host?.querySelector('[slot="title"]')?.textContent?.trim() ?? "";
    const messageText =
      host?.querySelector('[slot="message"]')?.textContent?.trim() ?? "";
    const message = [text(notification.type), titleText, messageText]
      .filter(Boolean)
      .join(" ");

    const region =
      roleFor(notification.type) === "alert" ? assertiveRegion : politeRegion;
    if (!region) {
      return;
    }
    // Clear then set on the next frame so repeated identical text still fires.
    region.textContent = "";
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }

  // Play the enter slide for a freshly-rendered host.
  function playEnter(notification: Notification<C>) {
    const element = container.querySelector<HTMLElement>(
      `[data-id="${notification.id}"]`,
    );

    if (element && !prefersReducedMotion()) {
      element.style.transform = offscreenTransform();

      // Force the browser to commit the off-screen start position before the
      // transition is enabled. Without this reflow the two style writes collapse
      // into a single computed change and the notification pops in instead of
      // sliding.
      void element.offsetWidth;

      element.style.transition = ENTER_EXIT_TRANSITION;
      element.style.transform = "";
    }
  }

  // `mode` picks the exit animation:
  // - "slide" (default): timer/click/swipe dismissals glide off-screen.
  // - "fade": cap-evictions dissolve quickly in place. A fade is layout-neutral
  //   (opacity only), so simultaneous evictions can't clobber one another the
  //   way concurrent sideways slides would, and by the time the slot collapses
  //   the element is already invisible — no blink, no jump.
  function remove(id: number, mode: "slide" | "fade" = "slide") {
    const notification = notifications.find((item) => item.id === id);

    if (!notification || notification.removing) {
      return;
    }

    // A queued notification isn't on screen: just drop it, no animation.
    if (notification.queued) {
      const index = notifications.findIndex((item) => item.id === id);
      if (index !== -1) {
        notifications.splice(index, 1);
      }
      return;
    }

    notification.removing = true;
    notification.exitMode = mode;

    if (notification.timer !== null) {
      window.clearTimeout(notification.timer);
      notification.timer = null;
    }

    const drop = () => {
      const index = notifications.findIndex((item) => item.id === id);

      if (index === -1) {
        return;
      }

      const previous = getPositions();

      notifications.splice(index, 1);
      update(previous);
      promoteQueued();
    };

    const element = container.querySelector<HTMLElement>(`[data-id="${id}"]`);

    // No node to animate, or the user prefers reduced motion: drop immediately.
    if (!element || prefersReducedMotion()) {
      drop();
      return;
    }

    if (mode === "fade") {
      element.style.transition = FADE_TRANSITION;

      requestAnimationFrame(() => {
        element.style.opacity = "0";
      });

      window.setTimeout(drop, FADE_MS);
      return;
    }

    // The at-rest translateX(0) has already been painted in previous frames, so
    // enabling the transition and then flipping the transform in the next frame
    // animates cleanly.
    element.style.transition = ENTER_EXIT_TRANSITION;

    requestAnimationFrame(() => {
      element.style.transform = offscreenTransform();
    });

    window.setTimeout(drop, EXIT_MS);
  }

  function visibleCount(): number {
    return notifications.filter((item) => !item.removing && !item.queued)
      .length;
  }

  // Evict mode: trim the oldest visible notifications past the cap (fade exit).
  function enforceCap() {
    if (!maxVisible || maxVisible <= 0) {
      return;
    }

    const active = notifications.filter(
      (item) => !item.removing && !item.queued,
    );
    const excess = active.length - maxVisible;

    // Oldest first (array order == insertion order). Cap-evictions fade rather
    // than slide — a displaced notification quietly yields its space.
    for (let i = 0; i < excess; i++) {
      remove(active[i].id, "fade");
    }
  }

  // Queue mode: when a slot frees up, promote the oldest waiting notification.
  function promoteQueued() {
    if (overflow !== "queue" || !maxVisible || maxVisible <= 0) {
      return;
    }
    if (visibleCount() >= maxVisible) {
      return;
    }
    const next = notifications.find((item) => item.queued);
    if (!next) {
      return;
    }

    const previous = getPositions();
    next.queued = false;
    update(previous);
    playEnter(next);
    startTimer(next);
    announce(next);
  }

  function toOptions(input: NotificationInput<C>): NotificationOptions<C> {
    // String shorthand: every adapter's content type includes plain strings.
    return typeof input === "string"
      ? ({ message: input } as unknown as NotificationOptions<C>)
      : input;
  }

  function handleFor(id: number): NotificationHandle<C> {
    return {
      id,
      dismiss: () => remove(id),
      update: (opts) => patch(id, opts),
    };
  }

  // Patch a live notification in place. `type` is internal-only (used by
  // promise/dedupe); the public handle.update never changes type.
  function patch(
    id: number,
    changes: Partial<NotificationOptions<C>> & { type?: NotificationType },
  ) {
    if (destroyed) {
      return;
    }
    const notification = notifications.find((item) => item.id === id);
    if (!notification || notification.removing) {
      return;
    }

    if (changes.type !== undefined) notification.type = changes.type;
    if (changes.title !== undefined) notification.title = changes.title;
    if (changes.icon !== undefined) notification.icon = changes.icon;
    if (changes.message !== undefined) notification.message = changes.message;
    if (changes.actions !== undefined) notification.actions = changes.actions;
    if (changes.dismissible !== undefined)
      notification.dismissible = changes.dismissible;
    if (changes.key !== undefined) notification.key = changes.key;

    if (changes.duration !== undefined) {
      notification.duration = changes.duration;
      notification.remaining = changes.duration;
      if (notification.timer !== null) {
        window.clearTimeout(notification.timer);
        notification.timer = null;
      }
      if (!notification.queued) {
        startTimer(notification);
      }
    }

    if (!notification.queued) {
      update();
      announce(notification);
    }
  }

  function add(
    type: NotificationType,
    input: NotificationInput<C>,
  ): NotificationHandle<C> {
    if (destroyed) {
      return { id: -1, dismiss() {}, update() {} };
    }

    const opts = toOptions(input);

    // Dedupe: fold a repeat with the same key into the existing notification.
    if (opts.key) {
      const existing = notifications.find(
        (item) => item.key === opts.key && !item.removing,
      );
      if (existing) {
        existing.count += 1;
        patch(existing.id, {
          type,
          title: opts.title,
          icon: opts.icon,
          message: opts.message,
          actions: opts.actions,
          dismissible: opts.dismissible,
          duration: opts.duration ?? existing.duration,
        });
        return handleFor(existing.id);
      }
    }

    const previous = getPositions();
    const duration = opts.duration ?? (type === "loading" ? 0 : 7000);

    const notification: Notification<C> = {
      id: nextId++,
      type,
      title: opts.title,
      icon: opts.icon,
      message: opts.message,
      duration,
      removing: false,
      exitMode: null,
      timer: null,
      remaining: duration,
      startedAt: 0,
      key: opts.key,
      count: 1,
      actions: opts.actions ?? [],
      dismissible: opts.dismissible ?? true,
      queued: false,
    };

    notifications.push(notification);

    // Queue mode: hold this one off-screen if we're already at the cap.
    if (
      overflow === "queue" &&
      maxVisible &&
      maxVisible > 0 &&
      visibleCount() > maxVisible
    ) {
      notification.queued = true;
      return handleFor(notification.id);
    }

    update(previous);
    playEnter(notification);
    startTimer(notification);
    announce(notification);

    // Evict mode handles the cap here; queue mode already gated above.
    if (overflow === "evict") {
      enforceCap();
    }

    return handleFor(notification.id);
  }

  return {
    info(input: NotificationInput<C>) {
      return add("info", input);
    },
    success(input: NotificationInput<C>) {
      return add("success", input);
    },
    warn(input: NotificationInput<C>) {
      return add("warn", input);
    },
    error(input: NotificationInput<C>) {
      return add("error", input);
    },
    promise<T>(
      promise: Promise<T>,
      messages: PromiseMessages<C, T>,
    ): PromiseHandle<C, T> {
      const handle = add("loading", {
        duration: 0,
        ...toOptions(messages.loading),
      });

      const settle = (
        type: "success" | "error",
        resolver: PromiseMessages<C, T>["success" | "error"],
        value: unknown,
      ) => {
        const resolved =
          typeof resolver === "function"
            ? (resolver as (v: unknown) => NotificationInput<C>)(value)
            : resolver;
        patch(handle.id, { type, duration: 5000, ...toOptions(resolved) });
      };

      const result = Promise.resolve(promise).then(
        (value) => {
          settle("success", messages.success, value);
          return value;
        },
        (error) => {
          settle("error", messages.error, error);
          throw error;
        },
      );

      return Object.assign(handle, { result });
    },
    clear() {
      for (const notification of notifications) {
        if (notification.timer !== null) {
          window.clearTimeout(notification.timer);
          notification.timer = null;
        }
      }

      notifications.length = 0;
      update();
    },
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;

      for (const notification of notifications) {
        if (notification.timer !== null) {
          window.clearTimeout(notification.timer);
          notification.timer = null;
        }
      }
      notifications.length = 0;

      document.removeEventListener("keydown", onKeyDown);
      if (pauseOnHidden) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }

      renderer.destroy?.();
      container.remove();
    },
  };
}

// -------------------------------------------------------------------
// # Icons
// -------------------------------------------------------------------

const infoIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
  </svg>
`;

const successIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M3 14.5A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5h8a.5.5 0 0 1 0 1H3a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V8a.5.5 0 0 1 1 0v5a1.5 1.5 0 0 1-1.5 1.5z"/>
    <path d="m8.354 10.354 7-7a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0"/>
  </svg>
`;

const warnIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
  </svg>
`;

const errorIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z"/>
    <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
  </svg>
`;

// A single arc that spins via CSS (see :host([type="loading"]) .icon svg).
const loadingIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-opacity="0.25"/>
    <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
`;

// Looked up by the custom element from its `type` attribute at runtime. Kept
// after the icon literals (and accessed only inside a method) so the ordering
// works despite these consts living at the end of the module.
const notificationIcons: Record<NotificationType, string> = {
  info: infoIcon,
  success: successIcon,
  warn: warnIcon,
  error: errorIcon,
  loading: loadingIcon,
};
