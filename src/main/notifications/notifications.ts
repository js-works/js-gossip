import { render } from "lit-html";
import { html, unsafeStatic } from "lit-html/static.js";
import { repeat } from "lit-html/directives/repeat.js";
import type { TemplateResult } from "lit-html";

export type NotificationType = "info" | "success" | "warn" | "error";

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
}

type NotificationInput<C> = string | NotificationOptions<C>;

/** Returned by `info`/`success`/`warn`/`error` so callers can dismiss a specific notification. */
export interface NotificationHandle {
  id: number;
  dismiss(): void;
}

/**
 * Library-wide theme shared by notifications and dialogs. A free-form map of
 * CSS-variable overrides: any key is accepted (hence `Record<string, string>`),
 * and camelCase keys become kebab-case custom properties, e.g. `infoAccent` ->
 * the CSS variable `--info-accent`.
 *
 * Recognised notification keys (all optional): background, text, radius,
 * shadow, infoAccent, successAccent, warnAccent, errorAccent, titleColor,
 * messageColor, closeColor, closeHoverColor, closeHoverBackground,
 * progressColor, iconColor. `progressColor` overrides the countdown ring for
 * every type and `iconColor` overrides the built-in severity icons; omit them
 * and each uses its severity accent. The dialog half will add its own tokens to
 * the same object.
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
  titleColor: "#111827",
  messageColor: "#374151",
  closeColor: "#9ca3af",
  closeHoverColor: "#374151",
  closeHoverBackground: "rgba(0, 0, 0, 0.06)",
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

export interface NotificationsOptions<C> {
  /**
   * The rendering adapter, which also fixes the content type `C`. Use the
   * built-in {@link litAdapter} or {@link vanillaAdapter}, or build one with
   * {@link createReactAdapter}.
   */
  adapter: RenderAdapterFactory<C>;
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
   */
  autoIcons?: boolean | NotificationType[];
  /**
   * Cap the number of simultaneously visible notifications. When a new one
   * pushes the count past the cap, the oldest are dismissed. Omit for no cap.
   */
  maxVisible?: number;
}

// Shared per-severity opt-in check used by both the title and icon policies.
function policyEnabled(
  policy: boolean | NotificationType[] | undefined,
  type: NotificationType,
): boolean {
  return Array.isArray(policy) ? policy.includes(type) : policy === true;
}

// error/warn interrupt (assertive); info/success wait their turn (polite).
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
  // Auto-dismiss timer state (supports pause-on-hover).
  timer: number | null; // active setTimeout handle, or null while paused / none
  remaining: number; // ms left to run
  startedAt: number; // timestamp the current run began
}

export interface NotificationsController<C> {
  info(message: string): NotificationHandle;
  info(options: NotificationOptions<C>): NotificationHandle;
  success(message: string): NotificationHandle;
  success(options: NotificationOptions<C>): NotificationHandle;
  warn(message: string): NotificationHandle;
  warn(options: NotificationOptions<C>): NotificationHandle;
  error(message: string): NotificationHandle;
  error(options: NotificationOptions<C>): NotificationHandle;
  clear(): void;
}

// -------------------------------------------------------------------
// Render seam
// -------------------------------------------------------------------

/**
 * A fully-resolved per-notification "view model". The framework-agnostic core
 * computes all policy (title fallback, icon mode, role, severity prefix) and
 * hands the adapter pure data to project into DOM — the adapter contains no
 * policy. `dismissLabel`/`severity` are always plain strings; `icon`/`title`/
 * `message` are content of type `C`.
 */
export interface NotificationView<C> {
  id: number;
  type: NotificationType;
  role: "alert" | "status";
  duration: number;
  dismissLabel: string;
  iconMode: "custom" | "default" | "none";
  icon: C | null;
  severity: string | null;
  title: C | null;
  message: C;
}

/**
 * The only framework-coupled surface. Core owns state, timers, the custom
 * element, hover/dismiss delegation and animations; an adapter only projects a
 * keyed list of views into the container it was bound to.
 *
 * CONTRACT: `render` must apply its changes to the DOM **synchronously** before
 * returning. Right after calling it, the core reads hosts back by `data-id`
 * (to start the enter transform and to measure FLIP positions). lit and vanilla
 * are synchronous; the React adapter uses `flushSync` to honor this.
 */
export interface RenderAdapter<C> {
  render(views: NotificationView<C>[]): void;
}

export type RenderAdapterFactory<C> = (context: {
  container: HTMLElement;
  tag: string;
}) => RenderAdapter<C>;

const HORIZONTAL_TRANSITION = "transform 700ms ease-in-out";
const OFFSCREEN_DISTANCE = "120vw";
const EXIT_MS = 700;

// Cap-eviction exit: a quick fade in place (see remove()'s "fade" mode).
const FADE_TRANSITION = "opacity 500ms ease";
const FADE_MS = 500;

// Fired by the shadow-DOM close button; caught (composed + bubbling) on the
// container, which maps event.target (retargeted to the host) back to an id.
const DISMISS_EVENT = "internal-notification:dismiss";

// Global container chrome only. Everything about an individual notification now
// lives in the custom element's shadow root (see SHADOW_STYLES).
const containerStyles = `
.notifications-container {
  position: fixed;
  inset-inline-end: 20px;
  bottom: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  pointer-events: none;
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

/* Built-in severity icon: shown only when the policy opts in and the caller
   didn't provide their own. */
:host([icon-mode="default"]) .icon {
  display: inline-flex;
}

.icon svg {
  display: block;
  width: 1.4em;
  height: 1.4em;
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

/* Freezes together with the JS auto-dismiss timer, which also pauses on hover. */
:host(:hover) .progress-ring__value {
  animation-play-state: paused;
}

/* Sticky notifications (duration 0) have nothing to count down. */
:host([duration="0"]) .progress-ring {
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

@media (prefers-reduced-motion: reduce) {
  :host,
  .close {
    transition: none;
  }

  .progress-ring {
    display: none;
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
</div>
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

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = SHADOW_HTML;
      this.button = root.querySelector<HTMLButtonElement>("button.close");
      this.iconEl = root.querySelector<HTMLElement>(".icon");
      this.button?.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent(DISMISS_EVENT, { bubbles: true, composed: true }),
        );
      });
    }

    static get observedAttributes(): string[] {
      return ["dismiss-label", "duration", "type"];
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
      } else if (name === "type" && this.iconEl) {
        // Swap in the severity icon. Decorative only (aria-hidden), since the
        // severity is already conveyed by role + the sr-only prefix.
        const icon = value
          ? notificationIcons[value as NotificationType]
          : undefined;
        this.iconEl.innerHTML = icon ?? "";
      }
    }
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

export const litAdapter: RenderAdapterFactory<LitContent> = ({
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
              </${staticTag}>
            `,
          )}
        `,
        container,
      );
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

export const vanillaAdapter: RenderAdapterFactory<VanillaContent> = ({
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

        // Rebuild light-DOM slotted content. The host itself is reused (keyed
        // by id), so the shadow chrome and its running ring animation persist.
        host.replaceChildren(
          ...buildSlot("icon", view.icon),
          ...buildSlot("severity", view.severity),
          ...buildSlot("title", view.title),
          ...buildSlot("message", view.message),
        );

        if (container.children[index] !== host) {
          container.insertBefore(host, container.children[index] ?? null);
        }
      });
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
): RenderAdapterFactory<Node> {
  return ({ container, tag }) => {
    const root = react.createRoot(container);

    return {
      render(views) {
        const hosts = views.map((view) =>
          react.createElement(
            tag,
            {
              key: view.id,
              "data-id": view.id,
              type: view.type,
              role: view.role,
              duration: view.duration,
              "dismiss-label": view.dismissLabel,
              "icon-mode": view.iconMode,
            },
            view.icon !== null
              ? react.createElement(
                  "span",
                  { key: "i", slot: "icon" },
                  view.icon,
                )
              : null,
            view.severity !== null
              ? react.createElement(
                  "span",
                  { key: "s", slot: "severity" },
                  view.severity,
                )
              : null,
            view.title !== null
              ? react.createElement(
                  "span",
                  { key: "t", slot: "title" },
                  view.title,
                )
              : null,
            react.createElement(
              "span",
              { key: "m", slot: "message" },
              view.message,
            ),
          ),
        );

        // Synchronous commit so the core can read hosts back immediately.
        react.flushSync(() => {
          root.render(react.createElement(react.Fragment, null, ...hosts));
        });
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

export function createNotificationsController<C>(
  options: NotificationsOptions<C>,
): NotificationsController<C> {
  const { adapter, theme, getText, autoTitles, maxVisible } = options;
  // Icons are on by default (they were always shown before this option existed).
  const autoIcons = options.autoIcons ?? true;

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

  // Merge over the defaults and expose every entry as a CSS custom property on
  // the container. Variables inherit down to each host and pierce its shadow
  // root, so the theme is scoped per controller even though the element's
  // stylesheet lives in shadow DOM.
  const mergedTheme = { ...defaultTheme, ...theme };
  for (const [key, value] of Object.entries(mergedTheme)) {
    container.style.setProperty(toCssVariable(key), value);
  }

  document.body.appendChild(container);

  // Bind the chosen adapter to this controller's container + element tag.
  const renderer = adapter({ container, tag });

  const notifications: Notification<C>[] = [];
  let nextId = 0;

  // Close-button clicks arrive here as a composed, bubbling event; the event
  // target is retargeted to the host element, so we read its data-id.
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

  // Escape dismisses the most recent still-present notification. Note: this is a
  // document-level listener with no teardown (matches the "no destroy() yet"
  // decision), and it will also fire while a dialog is open — worth revisiting
  // at the library level once the dialog half exists.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    for (let i = notifications.length - 1; i >= 0; i--) {
      if (!notifications[i].removing) {
        remove(notifications[i].id);
        break;
      }
    }
  });

  function offscreenTransform(): string {
    const rtl = getComputedStyle(container).direction === "rtl";
    return `translateX(${rtl ? "-" : ""}${OFFSCREEN_DISTANCE})`;
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
      notification.timer !== null ||
      notification.duration <= 0
    ) {
      return;
    }

    startTimer(notification);
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
    // - "default": omitted + policy opts in -> shadow built-in for type.
    // - "none": `false`, or omitted with the policy off.
    const customIcon =
      notification.icon !== undefined && notification.icon !== false
        ? notification.icon
        : null;
    const iconMode: NotificationView<C>["iconMode"] =
      customIcon !== null
        ? "custom"
        : notification.icon === undefined &&
            policyEnabled(autoIcons, notification.type)
          ? "default"
          : "none";

    return {
      id: notification.id,
      type: notification.type,
      role: roleFor(notification.type),
      duration: notification.duration,
      dismissLabel: text("dismiss"),
      iconMode,
      icon: customIcon,
      severity,
      title,
      message: notification.message,
    };
  }

  function update(previous?: Map<number, DOMRect>) {
    renderer.render(notifications.map(toView));

    if (previous) {
      animateMovement(previous);
    }
  }

  // `mode` picks the exit animation:
  // - "slide" (default): timer/click dismissals glide off-screen sideways.
  // - "fade": cap-evictions dissolve quickly in place. A fade is layout-neutral
  //   (opacity only), so simultaneous evictions can't clobber one another the
  //   way concurrent sideways slides would, and by the time the slot collapses
  //   the element is already invisible — no blink, no jump.
  function remove(id: number, mode: "slide" | "fade" = "slide") {
    const notification = notifications.find((item) => item.id === id);

    if (!notification || notification.removing) {
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
    element.style.transition = HORIZONTAL_TRANSITION;

    requestAnimationFrame(() => {
      element.style.transform = offscreenTransform();
    });

    window.setTimeout(drop, EXIT_MS);
  }

  function enforceCap() {
    if (!maxVisible || maxVisible <= 0) {
      return;
    }

    const active = notifications.filter((item) => !item.removing);
    const excess = active.length - maxVisible;

    // Oldest first (array order == insertion order). Cap-evictions fade rather
    // than slide — a displaced notification quietly yields its space.
    for (let i = 0; i < excess; i++) {
      remove(active[i].id, "fade");
    }
  }

  function add(
    type: NotificationType,
    input: NotificationInput<C>,
  ): NotificationHandle {
    const previous = getPositions();

    // String shorthand: every adapter's content type includes plain strings.
    const opts: NotificationOptions<C> =
      typeof input === "string"
        ? ({ message: input } as unknown as NotificationOptions<C>)
        : input;
    const duration = opts.duration ?? 7000;

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
    };

    notifications.push(notification);
    update(previous);

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

      element.style.transition = HORIZONTAL_TRANSITION;
      element.style.transform = "translateX(0)";
    }

    startTimer(notification);
    enforceCap();

    return {
      id: notification.id,
      dismiss: () => remove(notification.id),
    };
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

// Looked up by the custom element from its `type` attribute at runtime. Kept
// after the icon literals (and accessed only inside a method) so the ordering
// works despite these consts living at the end of the module.
const notificationIcons: Record<NotificationType, string> = {
  info: infoIcon,
  success: successIcon,
  warn: warnIcon,
  error: errorIcon,
};
