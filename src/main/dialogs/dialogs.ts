// Ensure Symbol.dispose exists before any scope's [Symbol.dispose] is created (needed
// for `using` and for disposing a scope). Harmless if the runtime already provides it.
(Symbol as { dispose?: symbol }).dispose ??= Symbol.for("Symbol.dispose");

export { createDialogsController };

export type {
  ActionButtonType,
  BaseDialogConfig,
  DialogNotice,
  DialogsController,
  DialogsControllerConfig,
  DialogTexts,
  DialogRenderOverrides,
  ActionButtonRender,
  CloseButtonRender,
  NoticeRender,
  DialogScope,
  DialogType,
  FormAttempt,
  FormInteraction,
  Renderable,
  Styles,

  // FormDialogData is exposed as a *type* only (callers can name it but not `new` it)
  FormDialogData,

  // Dialog configs
  InfoDialogConfig,
  SuccessDialogConfig,
  WarnDialogConfig,
  ErrorDialogConfig,
  ConfirmDialogConfig,
  DecideDialogConfig,
  FormDialogConfig,

  // Dialog results
  InfoDialogResult,
  SuccessDialogResult,
  WarnDialogResult,
  ErrorDialogResult,
  ConfirmDialogResult,
  DecideDialogResult,
  FormDialogResult,
};

// -------------------------------------------------------------------
// # Public types
// -------------------------------------------------------------------

// Content the caller hands in (title, body, icon, notice message, and the values a render
// override returns). `C` is the caller's framework content type — a Lit TemplateResult, a
// React node, etc. — normally inferred from the configured `adapter`. `string` is always
// allowed: plain text needs no framework and the core turns it into a text node directly.
// There is deliberately no `Node` member — content flows through your framework, not raw
// DOM. `C` defaults to `never`, so an unconfigured controller is text-only; to hand in
// anything structured you declare a content type. That includes DOM nodes: handing in
// Nodes IS a content-type choice, so set `C = Node` (the core then inserts them directly,
// no adapter needed — see insertContent). A `never` default is meaningful here precisely
// because `Node` is not in the base union; leaving `C` with no default is worse, as TS
// silently falls back to the `object` constraint and reopens the loose-object hole.
type Renderable<C extends object = never> = C | string | null | undefined;

// The dialog element can't be generic (custom elements have no type parameter), so it and
// the internal plumbing below reuse the public types at `Renderable<any>` / ContentAdapter
// <any> rather than a separate erased type. `any` (not `object`) is deliberate: it's
// assignable in both directions, so a `Renderable<C>` flows in and out of the element with
// no casts. The public API stays fully typed on `C`; only this leaf plumbing is erased.

// Caller-supplied CSS for a dialog: a plain CSS string, scoped per-instance by the core.
type Styles = string;

type DialogType =
  | "info"
  | "success"
  | "warn"
  | "error"
  | "confirm"
  | "confirmCritical"
  | "decide"
  | "decideCritical"
  | "form"
  | "formCritical";

type ActionButtonType = "primary" | "secondary" | "danger" | "success";

/** Descriptor passed to a custom action-button renderer. */
interface ActionButtonRender {
  text: string;
  variant: ActionButtonType;
  loading: boolean;
  onClick: () => void;
}

/** Descriptor passed to a custom close-button renderer. */
interface CloseButtonRender {
  onClose: () => void;
}

/** Descriptor passed to a custom notice renderer. */
interface NoticeRender<C extends object = never> {
  variant: "info" | "success" | "warn" | "error";
  message: Renderable<C>;
}

/**
 * Optional per-part render overrides. Each is all-or-nothing: when provided, the library
 * renders nothing of its own for that part and inserts the returned Renderable instead
 * (so the caller can drop in their design system's components). A custom part supplies
 * its own states/animation from the descriptor — e.g. a custom action button shows its
 * own loading state, and a custom notice provides its own enter/leave animation.
 *
 * Overrides return `Renderable<C>`: a Node/string directly, or framework content when an
 * `adapter` is configured (their returns are checked against the same `C` as content).
 */
interface DialogRenderOverrides<C extends object = never> {
  actionButton?(button: ActionButtonRender): Renderable<C>;
  closeButton?(close: CloseButtonRender): Renderable<C>;
  notice?(notice: NoticeRender<C>): Renderable<C>;
}

interface DialogsControllerConfig<C extends object = never> {
  /**
   * Turns opaque framework content (e.g. a Lit TemplateResult) into a Node, and is the
   * source `C` is inferred from: pass `litDialogAdapter` and every `content`/`title`/
   * override-return on this controller is typed to that framework's content.
   */
  adapter?: ContentAdapter<C>;
  getText?(textKey: keyof DialogTexts): string | null;
  getDialogIcon?(dialogType: DialogType): Renderable<C> | null;
  autoIcons?: boolean;
  render?: DialogRenderOverrides<C>;
}

/** Caller overrides for button labels, keyed by button role. */
interface DialogButtonLabels {
  ok?: string;
  confirm?: string;
  decline?: string;
  cancel?: string;
  yes?: string;
  no?: string;
}

/**
 * A notice shown between the content and the buttons. A dialog can show two at once: a
 * persistent one set via config (like a form field's help text), which stays for the
 * life of the dialog, and a transient one raised on a form reject (like error text),
 * which appears below it and clears itself when the user edits the form.
 */
interface DialogNotice<C extends object = never> {
  type?: "info" | "success" | "warn" | "error"; // default "info"
  message: Renderable<C>;
}

interface BaseDialogConfig<C extends object = never> {
  title?: Renderable<C>;
  subtitle?: Renderable<C>;
  intro?: Renderable<C>;
  content?: Renderable<C>;
  outro?: Renderable<C>;
  styles?: Styles;
  buttons?: DialogButtonLabels;
  /** Initial notice. Forms can also raise one on a rejected attempt (see form()). */
  notice?: DialogNotice<C> | Renderable<C> | null;
  /**
   * Abort this dialog. When the signal aborts, the dialog closes immediately and the
   * call resolves `{ canceled: true, aborted: true }`. Combined with any scope-level
   * signal passed to `open()`.
   */
  abortSignal?: AbortSignal;
}

interface InfoDialogConfig<
  C extends object = never,
> extends BaseDialogConfig<C> {}
interface SuccessDialogConfig<
  C extends object = never,
> extends BaseDialogConfig<C> {}
interface WarnDialogConfig<
  C extends object = never,
> extends BaseDialogConfig<C> {}
interface ErrorDialogConfig<
  C extends object = never,
> extends BaseDialogConfig<C> {}
interface ConfirmDialogConfig<
  C extends object = never,
> extends BaseDialogConfig<C> {}
interface DecideDialogConfig<
  C extends object = never,
> extends BaseDialogConfig<C> {}
interface FormDialogConfig<
  C extends object = never,
> extends BaseDialogConfig<C> {}

interface DialogsFunctions<C extends object = never> {
  info(config: InfoDialogConfig<C>): Promise<InfoDialogResult>;
  success(config: SuccessDialogConfig<C>): Promise<SuccessDialogResult>;
  warn(config: WarnDialogConfig<C>): Promise<WarnDialogResult>;
  error(config: ErrorDialogConfig<C>): Promise<ErrorDialogResult>;
  confirm(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult>;
  confirmCritical(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult>;
  decide(config: DecideDialogConfig<C>): Promise<DecideDialogResult>;
  decideCritical(config: DecideDialogConfig<C>): Promise<DecideDialogResult>;
  form(config: FormDialogConfig<C>): Promise<FormDialogResult>;
  formCritical(config: FormDialogConfig<C>): Promise<FormDialogResult>;
  formAttempts(config: FormDialogConfig<C>): FormInteraction<C>;
  formCriticalAttempts(config: FormDialogConfig<C>): FormInteraction<C>;
}

interface DialogsController<
  C extends object = never,
> extends DialogsFunctions<C> {
  /**
   * Open a scope whose dialogs share one modal surface (the backdrop stays up for the
   * whole scope). An optional `signal` aborts every dialog opened in the scope.
   */
  open(signal?: AbortSignal): DialogScope<C>;
}

interface DialogScope<C extends object = never> extends DialogsFunctions<C> {
  [Symbol.dispose](): void;
}

type DialogResult<A extends string, T = never> =
  | ([T] extends [never]
      ? {
          canceled: false;
          action: A;
        }
      : {
          canceled: false;
          action: A;
          data: T;
        })
  | {
      canceled: true;
      aborted: boolean;
    };

type InfoDialogResult = DialogResult<"ok">;
type SuccessDialogResult = DialogResult<"ok">;
type WarnDialogResult = DialogResult<"ok">;
type ErrorDialogResult = DialogResult<"ok">;
type ConfirmDialogResult = DialogResult<"confirm">;
type DecideDialogResult = DialogResult<"confirm" | "decline">;
type FormDialogResult = DialogResult<"confirm", FormDialogData>;

/** One submission of a form dialog while iterating for retry (see formAttempts()). */
interface FormAttempt<C extends object = never> {
  readonly data: FormDialogData;
  /** Accept the submission: resolve the dialog and close it. */
  accept(): void;
  /**
   * Reject it: keep the dialog open (values preserved) and show an error notice with the
   * given message. A reject is always an error, so only the message is configurable.
   */
  reject(message: Renderable<C>): void;
}

/**
 * Returned by formAttempts()/formCriticalAttempts(). `for await` it to intercept each
 * submit and accept/reject (retry with a notice); it is also awaitable, which resolves
 * to the final result once the loop ends. After the loop, read `result` to see whether
 * the form was confirmed or canceled.
 */
type FormInteraction<C extends object = never> = Promise<FormDialogResult> &
  AsyncIterable<FormAttempt<C>> & {
    /** The final result once settled (confirmed or canceled); undefined while pending. */
    readonly result: FormDialogResult | undefined;
  };

/** Any result finish() can produce, before narrowing to a specific dialog's result. */
type AnyDialogResult = DialogResult<any> | DialogResult<any, unknown>;

// -------------------------------------------------------------------
// # DOM helpers (the tiny "h" hyperscript used to build chrome)
// -------------------------------------------------------------------

// Recursive: a child may be an array of children, which appendChildren flattens.
type Child = Node | string | number | boolean | null | undefined | Child[];
type Attrs = Record<string, unknown>;

// Build an element. Props: `class` sets className; `on*` function props add listeners
// (onClick -> "click"); `true` sets a boolean attribute; other values set attributes.
// Children: Nodes are appended, strings/numbers become text nodes, arrays are flattened,
// null/false/undefined are skipped. No parsing, so nothing here is an injection surface.
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Attrs | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const key in props) {
      const value = props[key];
      if (value == null || value === false) continue;
      if (key === "class") {
        el.className = String(value);
      } else if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (value === true) {
        el.setAttribute(key, "");
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child == null || child === false || child === true) continue;
    if (Array.isArray(child)) {
      appendChildren(parent, child);
    } else if (child instanceof Node) {
      parent.appendChild(child);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
    }
  }
}

// A content adapter turns an opaque framework value of type `C` (a Lit TemplateResult, a
// React node, …) into a real DOM Node. Because `C` is threaded through the public API,
// only a `C` ever reaches the adapter — the core handles Node/string/number itself — so
// the adapter always converts and never returns null. Pass one per controller via
// `adapter`; it's the source `C` is inferred from.
export type ContentAdapter<C> = (value: C) => Node;

// Coerce content to a Node for insertion. This is the C-erased internal seam: Nodes and
// primitives are handled directly; any other object is framework content and must go
// through the adapter. Reaching an object with no adapter can only happen via an untyped
// (`as any`) bypass of the public API, so we fail loudly rather than render "[object
// Object]" — which was the whole class of bug this seam exists to prevent.
function insertContent(
  value: Renderable<any>,
  adapter?: ContentAdapter<any> | null,
): Node {
  if (value instanceof Node) return value;
  if (value == null) return document.createTextNode("");
  if (typeof value === "object") {
    if (adapter) return adapter(value);
    throw new TypeError(
      "Dialog content is a non-Node object but no content adapter is configured. " +
        "Pass `adapter` (e.g. litDialogAdapter) to the controller, or use a Node or string.",
    );
  }
  return document.createTextNode(String(value)); // primitives only
}

// Parse a static SVG markup string into a fresh element (safe: it's our own markup, and
// a fresh node is produced each call so the same icon can appear in multiple dialogs).
function parseSvg(markup: string): SVGElement {
  const tpl = document.createElement("template");
  tpl.innerHTML = markup.trim();
  return tpl.content.firstElementChild as SVGElement;
}

function doubleRaf(fn: () => void): void {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

// -------------------------------------------------------------------
// # FormDialogData
// -------------------------------------------------------------------

/** Values treated as `false` by `boolean()`, compared case-insensitively. */
const FALSY_FORM_VALUES = new Set(["", "0", "false", "off", "no"]);

/** True if `value` is a File. Guards against `File` being undefined off the DOM. */
function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

/**
 * The data collected from a form dialog. Extends the standard `FormData`, so the whole
 * native API (`get`, `getAll`, `has`, `entries`, …) is available, and adds small typed
 * accessors that handle missing values and coercion for the common cases.
 */
class FormDialogData extends FormData {
  /** First value for `key` as a string; `null` if absent (or the field is a File). */
  string(key: string): string | null;
  /** First value for `key` as a string; `fallback` if absent. */
  string(key: string, fallback: string): string;
  string(key: string, fallback: string | null = null): string | null {
    const value = this.get(key);
    return typeof value === "string" ? value : fallback;
  }

  /** Every value for `key` as strings (File entries are skipped). */
  strings(key: string): string[] {
    return this.getAll(key).filter((v): v is string => typeof v === "string");
  }

  /** First value for `key` as a number; `null` if absent, blank, or not numeric. */
  number(key: string): number | null;
  /** First value for `key` as a number; `fallback` if absent, blank, or not numeric. */
  number(key: string, fallback: number): number;
  number(key: string, fallback: number | null = null): number | null {
    const value = this.get(key);
    if (typeof value !== "string" || value.trim() === "") {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  /** Every value for `key` as numbers (blank / non-numeric entries are skipped). */
  numbers(key: string): number[] {
    const result: number[] = [];
    for (const value of this.strings(key)) {
      if (value.trim() === "") continue;
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) result.push(parsed);
    }
    return result;
  }

  /**
   * Interpret `key` as a boolean. Absent → `false`; present with a falsy string
   * (`""`, `"0"`, `"false"`, `"off"`, `"no"`) → `false`; otherwise `true`. This matches
   * checkbox semantics: a checked box is present (value `"on"` → `true`), an unchecked
   * box is absent (→ `false`).
   */
  boolean(key: string): boolean {
    const value = this.get(key);
    if (value == null) return false;
    if (typeof value !== "string") return true; // a submitted File counts as present
    return !FALSY_FORM_VALUES.has(value.trim().toLowerCase());
  }

  /** First value for `key` as an integer; `null` if absent, blank, or not a whole number. */
  integer(key: string): number | null;
  /** First value for `key` as an integer; `fallback` if absent, blank, or not a whole number. */
  integer(key: string, fallback: number): number;
  integer(key: string, fallback: number | null = null): number | null {
    const parsed = this.number(key);
    return parsed !== null && Number.isInteger(parsed) ? parsed : fallback;
  }

  /**
   * First value for `key` parsed as a `Date` (accepts the values produced by
   * `date` / `datetime-local` inputs); `null` if absent, blank, or unparseable.
   */
  date(key: string): Date | null;
  /** As `date(key)` but returns `fallback` instead of `null`. */
  date(key: string, fallback: Date): Date;
  date(key: string, fallback: Date | null = null): Date | null {
    const value = this.string(key);
    if (value === null || value.trim() === "") {
      return fallback;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }

  /** First value for `key` if it is a File; otherwise `null`. */
  file(key: string): File | null {
    const value = this.get(key);
    return isFile(value) ? value : null;
  }

  /** Every File value for `key`. */
  files(key: string): File[] {
    return this.getAll(key).filter(isFile);
  }

  /** The distinct field names present, in first-seen order. */
  fieldNames(): string[] {
    return [...new Set(this.keys())];
  }

  /**
   * A plain object of all entries: a key seen once maps to its single value, a key
   * seen more than once maps to an array of its values.
   */
  toRecord(): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
    const result: Record<string, FormDataEntryValue | FormDataEntryValue[]> =
      {};

    for (const [key, value] of this) {
      const existing = result[key];

      if (existing === undefined) {
        result[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[key] = [existing, value];
      }
    }

    return result;
  }
}

// -------------------------------------------------------------------
// # Default texts
// -------------------------------------------------------------------

const defaultDialogTexts = {
  ok: "OK",
  cancel: "Cancel",
  yes: "Yes",
  no: "No",

  titleInfo: "Information",
  titleSuccess: "Success",
  titleWarn: "Warning",
  titleError: "Error",
  titleConfirm: "Confirmation",
  titleConfirmCritical: "Confirmation",
  titleDecide: "Please decide",
  titleDecideCritical: "Please decide",
  titleForm: "Form",
  titleFormCritical: "Form",
} as const;

type DialogTexts = Record<keyof typeof defaultDialogTexts, string>;

type TextKey = keyof typeof defaultDialogTexts;

// -------------------------------------------------------------------
// # Button configs
// -------------------------------------------------------------------

type ButtonRole = keyof DialogButtonLabels;

interface ButtonConfig {
  /** Result identity. `cancel` resolves the canceled branch; the others map to actions. */
  id: symbol;
  /** Which `config.buttons.*` entry overrides this button's text. */
  overrideKey: ButtonRole;
  type: ActionButtonType;
  text?: string | null;
  defaultTextKey: TextKey;
  /** Whether pressing this button should submit + validate the (optional) form. */
  validate: boolean;
}

const symbolOk = Symbol("ok");
const symbolCancel = Symbol("cancel");
const symbolConfirm = Symbol("confirm");
const symbolDecline = Symbol("decline");

// All button configurations, built by one small factory: btn(id, overrideKey,
// type, defaultTextKey). Buttons that submit + validate the form are exactly the
// non-secondary ones, so `validate` is derived rather than repeated.
function btn(
  id: symbol,
  overrideKey: ButtonRole,
  type: ActionButtonType,
  defaultTextKey: TextKey,
): ButtonConfig {
  return {
    id,
    overrideKey,
    type,
    defaultTextKey,
    validate: type !== "secondary",
  };
}

const okBtn = btn(symbolOk, "ok", "primary", "ok");
const okBtnDanger = btn(symbolOk, "ok", "danger", "ok");
const confirmBtn = btn(symbolConfirm, "confirm", "primary", "ok");
const confirmBtnDanger = btn(symbolConfirm, "confirm", "danger", "ok");
const cancelBtn = btn(symbolCancel, "cancel", "secondary", "cancel");
const yesBtn = btn(symbolConfirm, "yes", "primary", "yes");
const yesBtnDanger = btn(symbolConfirm, "yes", "danger", "yes");
const noBtn = btn(symbolDecline, "no", "secondary", "no");

// -------------------------------------------------------------------
// # Internal view / handle (bridge between scope and dialog element)
// -------------------------------------------------------------------

interface DialogButtonView {
  type: ActionButtonType;
  text: string;
  onClick: () => void;
}

interface ResolvedNotice {
  type: "info" | "success" | "warn" | "error";
  message: Renderable<any>;
}

function isDialogNotice(
  value: DialogNotice<any> | Renderable<any>,
): value is DialogNotice<any> {
  return (
    value != null &&
    typeof value === "object" &&
    !(value instanceof Node) &&
    "message" in value
  );
}

function resolveNotice(
  notice: DialogNotice<any> | Renderable<any>,
): ResolvedNotice {
  if (isDialogNotice(notice)) {
    return { type: notice.type ?? "info", message: notice.message };
  }
  return { type: "info", message: notice };
}

// Combine any number of (optional) signals into one. Returns undefined when none are
// present, the single signal when exactly one is, else an `AbortSignal.any` of all.
function combineSignals(
  ...signals: (AbortSignal | undefined)[]
): AbortSignal | undefined {
  const present = signals.filter((s): s is AbortSignal => s != null);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  return AbortSignal.any(present);
}

// The deep active element, piercing open shadow roots (a focused light-DOM form field
// inside a web component reports the host as document.activeElement, so walk inward).
function deepActiveElement(): HTMLElement | null {
  let el = document.activeElement as HTMLElement | null;
  while (el?.shadowRoot?.activeElement) {
    el = el.shadowRoot.activeElement as HTMLElement;
  }
  return el;
}

// Turn "\n" in a plain string into a fragment of text + <br>. Non-string Renderables
// (Node, number, …) pass through insertContent untouched.
function withLineBreaks(
  value: Renderable<any>,
  adapter?: ContentAdapter<any> | null,
): Node {
  if (typeof value !== "string" || !value.includes("\n")) {
    return insertContent(value, adapter);
  }
  const lines = value
    .trim()
    .split(/\r?\n|\r/)
    .map((line) => line.trim());

  const frag = document.createDocumentFragment();
  lines.forEach((line, i) => {
    if (i > 0) frag.appendChild(document.createElement("br"));
    frag.appendChild(document.createTextNode(line));
  });
  return frag;
}

interface DialogView {
  id: string;
  dialogType: DialogType;
  styles: string | null;
  icon: Renderable<any>;
  title: Renderable<any>;
  subtitle: Renderable<any>;
  intro: Renderable<any>;
  content: Renderable<any>;
  outro: Renderable<any>;
  notice: ResolvedNotice | null;
  hasForm: boolean;
  buttons: DialogButtonView[];
  /** Index of the button triggered by Enter, or null (e.g. critical dialogs). */
  defaultButtonIndex: number | null;
  render: DialogRenderOverrides<any> | undefined;
  adapter: ContentAdapter<any> | undefined;
  onClose: () => void;
  onCancel: () => void;
}

interface DialogHandle {
  update(view: DialogView): void;
  close(): Promise<void>;
  /** Toggle the inline spinner on the given action button. */
  setButtonLoading(index: number, loading: boolean): void;
  /** Raise the transient (reject) notice, shown below the config notice. */
  raiseNotice(notice: ResolvedNotice): void;
  /** The form element rendered inside the dialog, if any. */
  getForm(): HTMLFormElement | null;
}

const SPINNER_DIALOG_DELAY_MS = 300;
const BUTTON_SPINNER_DELAY_MS = 150;

// A minimal single-consumer async queue: form submits are pushed in; the caller's
// `for await` pulls them out. `end()` completes the iteration (on accept or cancel).
interface AttemptQueue {
  push(attempt: FormAttempt<any>): void;
  end(): void;
  iterator(): AsyncIterator<FormAttempt<any>>;
}

function createAttemptQueue(): AttemptQueue {
  const buffer: FormAttempt<any>[] = [];
  let waiting: ((r: IteratorResult<FormAttempt<any>>) => void) | null = null;
  let ended = false;

  return {
    push(attempt) {
      if (ended) return;
      if (waiting) {
        const resolve = waiting;
        waiting = null;
        resolve({ value: attempt, done: false });
      } else {
        buffer.push(attempt);
      }
    },
    end() {
      ended = true;
      if (waiting) {
        const resolve = waiting;
        waiting = null;
        resolve({ value: undefined, done: true });
      }
    },
    iterator() {
      return {
        next() {
          if (buffer.length > 0) {
            return Promise.resolve({ value: buffer.shift()!, done: false });
          }
          if (ended) {
            return Promise.resolve({ value: undefined, done: true });
          }
          return new Promise<IteratorResult<FormAttempt<any>>>((resolve) => {
            waiting = resolve;
          });
        },
      };
    },
  };
}

// Flow used by form dialogs to route confirm/cancel/abort through the retry interaction.
interface FormFlow {
  submit(
    data: FormDialogData,
    handle: DialogHandle,
    stopSpinner: () => void,
  ): void;
  cancel(): void;
  abort(): void;
}

// -------------------------------------------------------------------
// # Controller
// -------------------------------------------------------------------

function createDialogsController<C extends object = never>(
  config: DialogsControllerConfig<C>,
): DialogsController<C> {
  const open = (signal?: AbortSignal): DialogScope<C> =>
    createDialogScope(config, signal);

  // Direct (non-scoped) calls open a throwaway scope and dispose it once resolved.
  const oneShot = <R>(
    run: (scope: DialogScope<C>) => Promise<R>,
  ): Promise<R> => {
    const scope = open();
    return run(scope).finally(() => scope[Symbol.dispose]());
  };

  // Forms return a FormInteraction (Promise + async-iterable). We must return that
  // object as-is (so `for await` works), and dispose the scope once it settles.
  const oneShotForm = (
    run: (scope: DialogScope<C>) => FormInteraction<C>,
  ): FormInteraction<C> => {
    const scope = open();
    const interaction = run(scope);
    void interaction.finally(() => scope[Symbol.dispose]());
    return interaction;
  };

  return {
    open,
    info: (c) => oneShot((s) => s.info(c)),
    success: (c) => oneShot((s) => s.success(c)),
    warn: (c) => oneShot((s) => s.warn(c)),
    error: (c) => oneShot((s) => s.error(c)),
    confirm: (c) => oneShot((s) => s.confirm(c)),
    confirmCritical: (c) => oneShot((s) => s.confirmCritical(c)),
    decide: (c) => oneShot((s) => s.decide(c)),
    decideCritical: (c) => oneShot((s) => s.decideCritical(c)),
    form: (c) => oneShot((s) => s.form(c)),
    formCritical: (c) => oneShot((s) => s.formCritical(c)),
    formAttempts: (c) => oneShotForm((s) => s.formAttempts(c)),
    formCriticalAttempts: (c) => oneShotForm((s) => s.formCriticalAttempts(c)),
  };
}

// -------------------------------------------------------------------
// # Scope
// -------------------------------------------------------------------

interface OpenDialogSpec {
  dialogType: DialogType;
  defaultTitle: TextKey;
  config: BaseDialogConfig<any>;
  buttons: ButtonConfig[];
  allowsForm: boolean;
}

// Monotonic, collision-free per-scope id (used as a DOM element id).
let dialogInstanceCounter = 0;

function createDialogScope<C extends object = never>(
  config: DialogsControllerConfig<C>,
  scopeSignal?: AbortSignal,
): DialogScope<C> {
  const dialogId = `internal-dialog-${++dialogInstanceCounter}`;

  // One element for the whole scope: it's reused across every dialog so the modal stays
  // open and the backdrop never drops between dialogs.
  let handle: DialogHandle | null = null;
  let realDialogShown = false;

  // Clears the pending 150ms button spinner of whichever button most recently triggered
  // a transition (set on click, cleared on the next open / on dispose).
  let clearPendingSpinner: (() => void) | null = null;

  // Removes the scope-level abort listener on dispose.
  const scopeLifetime = new AbortController();

  // If nothing opens within the delay, show the round spinner dialog as a placeholder.
  const spinnerTimer = setTimeout(() => {
    if (!realDialogShown && !handle) {
      handle = mountSpinnerDialog(dialogId);
    }
  }, SPINNER_DIALOG_DELAY_MS);

  // Close whatever is currently on screen and forget it. Used by abort and dispose.
  const teardownCurrent = (): void => {
    clearTimeout(spinnerTimer);
    clearPendingSpinner?.();
    clearPendingSpinner = null;
    const current = handle;
    handle = null;
    void current?.close();
  };

  // A scope signal tears down the current dialog even when no call is pending (e.g. it
  // fires during async work *between* two dialogs, while one is still on screen). A
  // pending dialog additionally settles `aborted` via its own combined-signal listener.
  if (scopeSignal && !scopeSignal.aborted) {
    scopeSignal.addEventListener("abort", teardownCurrent, {
      once: true,
      signal: scopeLifetime.signal,
    });
  }

  function getText(textKey: TextKey): string {
    return config.getText?.(textKey) ?? defaultDialogTexts[textKey];
  }

  function iconFor(dialogType: DialogType): Renderable<any> {
    if (config.getDialogIcon) {
      return config.getDialogIcon(dialogType) ?? null;
    }
    return config.autoIcons ? defaultDialogIcon(dialogType) : null;
  }

  function resolveButtons(spec: OpenDialogSpec): ButtonConfig[] {
    const overrides = spec.config.buttons;
    if (!overrides) {
      return spec.buttons;
    }

    return spec.buttons.map((button) => {
      const customText = overrides[button.overrideKey];
      return customText ? { ...button, text: customText } : button;
    });
  }

  function getStyles(spec: OpenDialogSpec): string | null {
    return spec.config.styles ?? null;
  }

  function actionFor(id: symbol): "ok" | "confirm" | "decline" | null {
    if (id === symbolOk) return "ok";
    if (id === symbolConfirm) return "confirm";
    if (id === symbolDecline) return "decline";
    return null; // cancel
  }

  // Non-form dialogs only: forms route confirm/cancel through formFlow, so no form-data
  // path is needed here.
  function finish(id: symbol, resolve: (value: AnyDialogResult) => void): void {
    const action = actionFor(id);
    if (action === null) {
      resolve({ canceled: true, aborted: false }); // cancel button / close / Esc
    } else {
      resolve({ canceled: false, action });
    }
  }

  function showDialog(
    spec: OpenDialogSpec,
    resolve: (value: AnyDialogResult) => void,
    formFlow?: FormFlow,
    cleanupSignal?: AbortSignal,
  ): void {
    clearTimeout(spinnerTimer);

    const userSignal = combineSignals(scopeSignal, spec.config.abortSignal);

    const settleAborted = (): void => {
      teardownCurrent();
      if (formFlow) formFlow.abort();
      else resolve({ canceled: true, aborted: true });
    };

    if (userSignal?.aborted) {
      settleAborted();
      return;
    }

    realDialogShown = true;

    // Reusing the current element (spinner placeholder or the previous dialog): just
    // stop the previous button's pending spinner. The element swaps its view in place.
    clearPendingSpinner?.();
    clearPendingSpinner = null;

    const buttons = resolveButtons(spec);

    const onButtonClicked = (
      button: ButtonConfig,
      stopSpinner: () => void,
    ): void => {
      let form: HTMLFormElement | null = null;

      if (spec.allowsForm && button.validate) {
        form = handle?.getForm() ?? null;
        form?.requestSubmit();
        const valid = form?.reportValidity() ?? true;

        if (!valid) {
          stopSpinner(); // keep the dialog open so the user can fix the form
          return;
        }
      }

      // Form dialogs route through the interaction flow (auto-accept or iterator).
      if (formFlow) {
        if (button.id === symbolConfirm) {
          const data = form ? new FormDialogData(form) : new FormDialogData();
          formFlow.submit(data, handle!, stopSpinner);
        } else {
          formFlow.cancel();
        }
        return;
      }

      finish(button.id, resolve);
    };

    const buttonViews: DialogButtonView[] = buttons.map((button, index) => ({
      type: button.type,
      text: button.text ?? getText(button.defaultTextKey),
      onClick: () => {
        const timer = setTimeout(
          () => handle?.setButtonLoading(index, true),
          BUTTON_SPINNER_DELAY_MS,
        );
        const stopSpinner = () => {
          clearTimeout(timer);
          handle?.setButtonLoading(index, false);
        };
        clearPendingSpinner = () => clearTimeout(timer);
        onButtonClicked(button, stopSpinner);
      },
    }));

    const cfg = spec.config;

    // Escape and the close (X) button resolve as cancel. If the dialog has a Cancel
    // button, drive its exact click path so the pending spinner shows on it, just like
    // a real click. Otherwise (e.g. info/success with only an OK button) there's no
    // button to attach a spinner to, so resolve as canceled directly.
    const cancelIndex = buttons.findIndex(
      (button) => button.id === symbolCancel,
    );
    const closeAsCancel = () => {
      if (cancelIndex >= 0) {
        buttonViews[cancelIndex].onClick();
      } else if (formFlow) {
        formFlow.cancel();
      } else {
        finish(symbolCancel, resolve);
      }
    };

    const view: DialogView = {
      id: dialogId,
      dialogType: spec.dialogType,
      styles: getStyles(spec),
      icon: iconFor(spec.dialogType),
      title: cfg.title ?? getText(spec.defaultTitle),
      subtitle: cfg.subtitle,
      intro: cfg.intro,
      content: cfg.content,
      outro: cfg.outro,
      notice: cfg.notice != null ? resolveNotice(cfg.notice) : null,
      hasForm: spec.allowsForm,
      buttons: buttonViews,
      // Enter triggers the primary (first) button — except on critical dialogs, where
      // there's no default so a destructive action can't be confirmed by accident.
      defaultButtonIndex: spec.dialogType.endsWith("Critical") ? null : 0,
      render: config.render,
      adapter: config.adapter,
      onClose: closeAsCancel,
      onCancel: closeAsCancel,
    };

    if (userSignal) {
      userSignal.addEventListener("abort", settleAborted, {
        once: true,
        signal: cleanupSignal,
      });
    }

    if (handle) {
      handle.update(view); // reuse: spinner placeholder or previous dialog -> this view
    } else {
      handle = mountDialog(view);
    }
  }

  function openDialog(spec: OpenDialogSpec): Promise<AnyDialogResult> {
    return new Promise<AnyDialogResult>((resolve) => {
      // `cleanup` fires on any settlement, removing the abort listener so a long-lived
      // config/scope signal doesn't leak listeners across many dialogs.
      const cleanup = new AbortController();
      const settle = (value: AnyDialogResult) => {
        cleanup.abort();
        resolve(value);
      };
      showDialog(spec, settle, undefined, cleanup.signal);
    });
  }

  // Form dialogs return a FormInteraction: awaiting it auto-accepts the first valid
  // submit; `for await` intercepts each submit so the caller can accept() or reject()
  // (the latter keeping the same dialog open and showing a notice).
  function openForm(spec: OpenDialogSpec): FormInteraction<any> {
    const queue = createAttemptQueue();
    const cleanup = new AbortController();
    let iterating = false;
    let settled = false;
    let result: FormDialogResult | undefined;
    let resolveResult!: (value: FormDialogResult) => void;

    const resultPromise = new Promise<FormDialogResult>((resolve) => {
      resolveResult = resolve;
    });

    const settle = (value: FormDialogResult): void => {
      if (settled) return;
      settled = true;
      result = value;
      resolveResult(value);
      queue.end();
      cleanup.abort();
    };

    const formFlow: FormFlow = {
      submit(data, dialogHandle, stopSpinner) {
        if (iterating) {
          queue.push({
            data,
            accept() {
              settle({ canceled: false, action: "confirm", data });
            },
            reject(message) {
              stopSpinner();
              dialogHandle.raiseNotice({ type: "error", message });
            },
          });
        } else {
          settle({ canceled: false, action: "confirm", data });
        }
      },
      cancel() {
        settle({ canceled: true, aborted: false });
      },
      abort() {
        settle({ canceled: true, aborted: true });
      },
    };

    showDialog(spec, () => {}, formFlow, cleanup.signal);

    const interaction = resultPromise as FormInteraction<any>;
    Object.defineProperty(interaction, Symbol.asyncIterator, {
      value: () => {
        iterating = true;
        return queue.iterator();
      },
    });
    Object.defineProperty(interaction, "result", {
      get: () => result,
    });
    return interaction;
  }

  // Every dialog type maps to its button row; the title key ("titleInfo", ...)
  // and form-ness derive from the type name, so one small spec builder replaces
  // twelve hand-written openDialog/openForm blocks.
  const dialogButtons: Record<DialogType, ButtonConfig[]> = {
    info: [okBtn],
    success: [okBtn],
    warn: [okBtnDanger],
    error: [okBtnDanger],
    confirm: [confirmBtn, cancelBtn],
    confirmCritical: [confirmBtnDanger, cancelBtn],
    decide: [yesBtn, noBtn, cancelBtn],
    decideCritical: [yesBtnDanger, noBtn, cancelBtn],
    form: [confirmBtn, cancelBtn],
    formCritical: [confirmBtnDanger, cancelBtn],
  };

  const spec = (
    dialogType: DialogType,
    config: BaseDialogConfig<any>,
  ): OpenDialogSpec => ({
    dialogType,
    defaultTitle:
      `title${dialogType[0].toUpperCase()}${dialogType.slice(1)}` as TextKey,
    config,
    buttons: dialogButtons[dialogType],
    allowsForm: dialogType.startsWith("form"),
  });

  return {
    info: (c) => openDialog(spec("info", c)) as Promise<InfoDialogResult>,
    success: (c) =>
      openDialog(spec("success", c)) as Promise<SuccessDialogResult>,
    warn: (c) => openDialog(spec("warn", c)) as Promise<WarnDialogResult>,
    error: (c) => openDialog(spec("error", c)) as Promise<ErrorDialogResult>,
    confirm: (c) =>
      openDialog(spec("confirm", c)) as Promise<ConfirmDialogResult>,
    confirmCritical: (c) =>
      openDialog(spec("confirmCritical", c)) as Promise<ConfirmDialogResult>,
    decide: (c) => openDialog(spec("decide", c)) as Promise<DecideDialogResult>,
    decideCritical: (c) =>
      openDialog(spec("decideCritical", c)) as Promise<DecideDialogResult>,
    form: (c) => openForm(spec("form", c)) as Promise<FormDialogResult>,
    formCritical: (c) =>
      openForm(spec("formCritical", c)) as Promise<FormDialogResult>,
    formAttempts: (c) => openForm(spec("form", c)),
    formCriticalAttempts: (c) => openForm(spec("formCritical", c)),

    [Symbol.dispose](): void {
      scopeLifetime.abort();
      clearTimeout(spinnerTimer);
      clearPendingSpinner?.();
      clearPendingSpinner = null;
      void handle?.close();
      handle = null;
    },
  };
}

// -------------------------------------------------------------------
// # Icons
// -------------------------------------------------------------------

const closeIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
  </svg>
`;

const infoIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
  </svg>
`;

const successIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M3 14.5A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5h8a.5.5 0 0 1 0 1H3a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V8a.5.5 0 0 1 1 0v5a1.5 1.5 0 0 1-1.5 1.5z"/>
    <path d="m8.354 10.354 7-7a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0"/>
  </svg>
`;

const warnIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
  </svg>
`;

const errorIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z"/>
    <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
  </svg>
`;

const confirmIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
    <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/>
  </svg>
`;

function defaultDialogIcon(dialogType: DialogType): Renderable<any> {
  switch (dialogType) {
    case "info":
      return parseSvg(infoIconSvg);
    case "success":
      return parseSvg(successIconSvg);
    case "warn":
      return parseSvg(warnIconSvg);
    case "error":
      return parseSvg(errorIconSvg);
    case "confirm":
    case "confirmCritical":
    case "decide":
    case "decideCritical":
      return parseSvg(confirmIconSvg);
    case "form":
    case "formCritical":
      return null;
  }
}

// -------------------------------------------------------------------
// # Styles
// -------------------------------------------------------------------

// Plain string tokens (interpolated into the CSS text below). Read from host CSS
// variables where useful, with built-in fallbacks so the library renders without a host
// design system. The fallbacks match Web Awesome's default palette.
const theme = {
  textColor: "light-dark(black, white)",
  primaryTextColor: "var(--ui-surface, #ffffff)",
  primaryBackgroundColor: "var(--ui-color-primary-500, #0071ec)",
  secondaryTextColor: "var(--ui-text, #1f2430)",
  secondaryBackgroundColor: "white",
  secondaryBorderColor: "#b0b0b0",
  dangerTextColor: "white",
  dangerBackgroundColor: "#dc3146",
  successColor: "var(--ui-color-success-500, #00883c)",
  dialogBorderRadius: "4px",
  closeButtonBorderRadius: "100%",
  actionButtonBorderRadius: "3px",
  dialogBackgroundColor: "light-dark(white, #333)",
} as const;

// Duration of the notice appear/disappear (collapse) animation. Drives both the CSS
// transition and the JS timer that removes the element after the collapse finishes.
const NOTICE_ANIM_MS = 350;

// Duration of the dialog grow-in (entrance) and fade-out (close) animations.
const DIALOG_ANIM_MS = 200;

// Duration of the quick fade-out when swapping one on-screen dialog for the next within
// a scope (the backdrop stays up; only the box content changes, then grows back in).
const SWAP_OUT_MS = 140;

const dialogStyles = `
  dialog {
    outline: none;
    position: fixed;
    /* Sit high and horizontally centered. margin-block-start pushes the dialog
       down proportionally on tall viewports but never lets it touch the top
       (2em floor); margin-block-end: auto lets it grow downward rather than
       being pulled up by a self-offset. */
    inset: 0;
    width: fit-content;
    max-width: calc(100dvw - 4em);
    height: fit-content;
    max-height: calc(100dvh - 4em);
    margin-inline: auto;
    margin-block: max(2em, 12dvh) auto;
    color: ${theme.textColor};
    background-color: ${theme.dialogBackgroundColor};
    border: none;
    border-radius: ${theme.dialogBorderRadius};
    min-width: 22em;
    box-sizing: border-box;
    padding: 0;
    overflow: auto;
    box-shadow: 0 10px 30px -5px rgba(0,0,0,0.25), 0 4px 10px -4px rgba(0,0,0,0.15);  
  }

  dialog[open].closing {
    animation: dialog-fade-out ${DIALOG_ANIM_MS}ms ease-in-out;
  }

  dialog[open]::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
  }

  dialog[open]:not(.closing)::backdrop {
    animation: backdrop-fade-in ${DIALOG_ANIM_MS}ms ease-in-out;
  }

  dialog[open].closing::backdrop {
    animation: backdrop-fade-out ${DIALOG_ANIM_MS}ms ease-in-out;
  }

  /* Form dialogs get a bit more room so labelled fields aren't cramped. */
  :host([data-dialog-type="form"]) dialog,
  :host([data-dialog-type="formCritical"]) dialog {
    min-width: 26em;
  }

  #icon {
    display: flex;
    justify-content: center;
    align-items: center;
    align-self: center;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    font-size: 180%;
    padding: 3px;
    line-height: 0;
  }

  /* Render the glyph as a block box sized to 1em. As an inline element the SVG picks up
     baseline/descender space, which shaved a pixel off one edge. */
  ::slotted([slot="icon"]) svg,
  #icon svg {
    display: block;
    width: 1em;
    height: 1em;
  }

  :host([data-dialog-type="info"]) #icon,
  :host([data-dialog-type="confirm"]) #icon,
  :host([data-dialog-type="decide"]) #icon,
  :host([data-dialog-type="success"]) #icon {
    color: ${theme.primaryBackgroundColor};
  }

  :host([data-dialog-type="warn"]) #icon,
  :host([data-dialog-type="error"]) #icon,
  :host([data-dialog-type="confirmCritical"]) #icon,
  :host([data-dialog-type="decideCritical"]) #icon {
    color: ${theme.dangerBackgroundColor};
  }

  .dialog-content {
    /* Chrome (titles, buttons) stays unselectable; the body and notice opt back into
       text selection below so error messages can be copied. */
    user-select: none;
    min-width: 20em;
    font-size: 16px;
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
      sans-serif;
  }

  .dialog-content .header {
    display: flex;
    align-items: center;
    gap: 0.4em;
    padding: 1em 1.25em 0.4em 1.25em;
    width: 100%;
    box-sizing: border-box;
  }

  .dialog-content .header .titles {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0.25em 0 0 0;
  }

  .dialog-content .header .titles .title {
    display: block;
    font-size: 1.1em;
    font-weight: 600;
  }

  .dialog-content .header .titles .subtitle {
    display: block;
    font-size: 0.85em;
    line-height: 0.85em;
    padding: 0 1px;
  }

  .dialog-content .body {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    padding: 0 1.25em 0.75em 1.25em;
    min-height: 2.25em;
    line-height: 1.25em;
    user-select: text;
  }

  .dialog-content .footer {
    padding: 0.75em;
    user-select: none;
  }

  .dialog-content .footer .action-buttons {
    display: flex;
    flex-direction: row-reverse;
    gap: 0.4em;
  }

  .action-button {
    position: relative;
    outline: none;
    border: none;
    border-radius: ${theme.actionButtonBorderRadius};
    padding: 0.5em 1.5em;
    font-weight: 500;
    cursor: pointer;
  }

  .action-button .spinner {
    display: none;
  }

  .action-button.loading .spinner {
    display: block;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(0deg);
    width: 1.5em;
    height: 1.5em;
    border: 3px solid color-mix(in srgb, currentColor 20%, transparent);
    border-top: 3px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    overflow: hidden;
    box-sizing: border-box;
  }

  .action-button.loading .button-text {
    visibility: hidden;
  }

  .action-button[data-type="primary"] {
    color: ${theme.primaryTextColor};
    background-color: ${theme.primaryBackgroundColor};
  }
  .action-button[data-type="primary"]:hover {
    background-color: color-mix(in srgb, ${theme.primaryBackgroundColor}, black 10%);
  }
  .action-button[data-type="primary"]:active {
    background-color: color-mix(in srgb, ${theme.primaryBackgroundColor}, black 20%);
  }

  .action-button[data-type="secondary"] {
    color: ${theme.secondaryTextColor};
    background-color: ${theme.secondaryBackgroundColor};
    border: 1px solid ${theme.secondaryBorderColor};
  }
  .action-button[data-type="secondary"]:hover {
    background-color: color-mix(in srgb, ${theme.secondaryBackgroundColor}, black 5%);
  }
  .action-button[data-type="secondary"]:active {
    background-color: color-mix(in srgb, ${theme.secondaryBackgroundColor}, black 10%);
  }

  .action-button[data-type="danger"] {
    color: ${theme.dangerTextColor};
    background-color: ${theme.dangerBackgroundColor};
  }
  .action-button[data-type="danger"]:hover {
    background-color: color-mix(in srgb, ${theme.dangerBackgroundColor}, black 15%);
  }
  .action-button[data-type="danger"]:active {
    background-color: color-mix(in srgb, ${theme.dangerBackgroundColor}, black 40%);
  }

  .action-button[data-type="success"] {
    color: white;
    background-color: ${theme.successColor};
  }
  .action-button[data-type="success"]:hover {
    background-color: color-mix(in srgb, ${theme.successColor}, black 10%);
  }
  .action-button[data-type="success"]:active {
    background-color: color-mix(in srgb, ${theme.successColor}, black 20%);
  }

  .close-button {
    align-self: flex-start;
    border: none;
    border-radius: ${theme.closeButtonBorderRadius};
    outline: none;
    margin: 0;
    font-size: 1em;
    line-height: 0;
    background-color: transparent;
    cursor: pointer;
    padding: 0.3em;
  }
  .close-button:hover {
    background-color: light-dark(
      color-mix(in srgb, white, black 7%),
      color-mix(in srgb, black, white 7%)
    );
  }
  .close-button:active {
    background-color: light-dark(
      color-mix(in srgb, #f0f0f0, black 10%),
      color-mix(in srgb, #f0f0f0, white 10%)
    );
  }

  .notice {
    position: relative;
    margin: 0.7em 1.25em 0.75em 1.25em;
    padding: 0.5em 0.5em 0.5em 1.25em;
    border-radius: 2px;
    background-color: light-dark(#f4f4f4, #3d3d3d);
    color: ${theme.textColor};
    font-size: 0.9em;
    font-weight: 500;
    line-height: 1.35;
    overflow: hidden;
    max-height: 12em;
    user-select: text;

    transition:
      max-height ${NOTICE_ANIM_MS}ms ease,
      opacity ${NOTICE_ANIM_MS}ms ease,
      margin-top ${NOTICE_ANIM_MS}ms ease,
      margin-bottom ${NOTICE_ANIM_MS}ms ease,
      padding-top ${NOTICE_ANIM_MS}ms ease,
      padding-bottom ${NOTICE_ANIM_MS}ms ease;
  }

  /* Rounded accent bar floating inside the notice; its color conveys the type.
     The background/text stay neutral so the notice reads calm anywhere. */
  .notice::before {
    content: "";
    position: absolute;
    left: 0.25em;
    top: 0.25em;
    bottom: 0.25em;
    width: 0.2em;
    border-radius: 0.125em;
    background: ${theme.primaryBackgroundColor};
  }

  .notice.dismissing,
  .notice.entering {
    max-height: 0;
    opacity: 0;
    margin-top: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
  }

  /* info uses the default bar color (primary); the rest override just the bar. */
  .notice[data-notice-type="success"]::before {
    background: ${theme.successColor};
  }
  .notice[data-notice-type="warn"]::before {
    background: light-dark(#f08c00, #f7a53b);
  }
  .notice[data-notice-type="error"]::before {
    background: ${theme.dangerBackgroundColor};
  }

  /* Error notices also get a faint danger-tinted background (the other types keep the
     neutral notice background and signal type through the accent bar alone). */
  .notice[data-notice-type="error"] {
    color: ${theme.dangerBackgroundColor};
  }

  /* The reject notice, when it follows the config notice, is pulled up with a negative
     top margin so the gap between the two stays small. The gap belongs to the *reject*
     notice: as it dismisses, its top margin animates back to 0 in step with its collapse,
     so the whole gap closes with the notice and the config notice above never moves. */
  .notice + .notice {
    margin-top: -0.45em;
  }
  .notice + .notice.entering,
  .notice + .notice.dismissing {
    margin-top: 0;
  }

  @keyframes dialog-fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes backdrop-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes backdrop-fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes spin {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
`;

const placeholderStyles = `
  :host {
    display: contents;
  }

  dialog.spinner-dialog {
    min-width: 0;
    width: 3.25em;
    height: 3.25em;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dialog-spinner {
    width: 2.2em;
    height: 2.2em;
    border: 3px solid color-mix(in srgb, currentColor 20%, transparent);
    border-top: 3px solid #444;
    border-radius: 50%;
    animation: spin-plain 1s linear infinite;
    box-sizing: border-box;
  }

  @keyframes spin-plain {
    to { transform: rotate(360deg); }
  }
`;

const STYLE_TEXT = dialogStyles + placeholderStyles;

// -------------------------------------------------------------------
// # Scroll lock
// -------------------------------------------------------------------

// Lock background scrolling while a modal dialog is open, reserving the scrollbar's
// width so hiding it doesn't shift the page. Ref-counted in case dialogs overlap.
let scrollLockCount = 0;
let restoreOverflow = "";
let restorePaddingRight = "";

function lockBackgroundScroll(): void {
  if (scrollLockCount++ > 0) {
    return;
  }
  const root = document.documentElement;
  const scrollbarWidth = window.innerWidth - root.clientWidth;
  restoreOverflow = root.style.overflow;
  restorePaddingRight = root.style.paddingRight;
  root.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    const existing = parseFloat(getComputedStyle(root).paddingRight) || 0;
    root.style.paddingRight = `${existing + scrollbarWidth}px`;
  }
}

function unlockBackgroundScroll(): void {
  if (scrollLockCount === 0 || --scrollLockCount > 0) {
    return;
  }
  const root = document.documentElement;
  root.style.overflow = restoreOverflow;
  root.style.paddingRight = restorePaddingRight;
}

const CLOSE_ANIMATION_FALLBACK_MS = DIALOG_ANIM_MS + 100;

// -------------------------------------------------------------------
// # Lazy element registration + per-instance CSS scope
// -------------------------------------------------------------------

// The exported `Dialog` base class is never registered. On first use we register a
// *subclass* under `js-interact-dialog-N`, bumping N past any already-taken name (e.g.
// a second copy of this library on the same page). All instances share that one tag.
let resolvedTagNumber = 0;
let resolvedDialogTag: string | null = null;

function dialogElementTag(): string {
  if (resolvedDialogTag) {
    return resolvedDialogTag;
  }
  let n = 0;
  let tag: string;
  do {
    tag = `js-interact-dialog-${++n}`;
  } while (customElements.get(tag));
  customElements.define(tag, class extends Dialog {});
  resolvedTagNumber = n;
  resolvedDialogTag = tag;
  return tag;
}

// Each dialog instance gets a unique CSS scope class combining the tag number (unique
// per library load) and a per-instance counter, so a caller's (unscoped) `styles` can
// be nested under it without leaking to other dialogs — or to a different version of
// this library elsewhere on the page.
let scopeInstanceCounter = 0;

// -------------------------------------------------------------------
// # Dialog — exported presentational base class (NOT registered here)
// -------------------------------------------------------------------

/**
 * The presentational dialog element: a native `<dialog>` shell in a shadow root, with
 * caller content projected through named slots — `icon`, `title`, `subtitle`, `intro`,
 * `content`, `outro`. The notice and action buttons are library-owned chrome built in
 * the shadow root, since they carry wired behavior (loading spinner, validate/submit,
 * the notice state machine) that isn't expressible as plain slotted markup.
 *
 * A single `<dialog>` node is reused across a scope: it grows in on first show and, for
 * each subsequent view, fades the current box out and grows the new one back in without
 * ever calling `close()` — so the modal backdrop stays up for the whole scope.
 *
 * Content is light DOM, so caller `styles` are injected as a light `<style>` scoped under
 * this instance's unique class (`scopeClass`) via CSS nesting; shadow chrome stays scoped
 * by the shadow root as usual.
 *
 * Exported for reuse/subclassing but intentionally NOT `customElements.define`d — the
 * library registers a subclass lazily (see `dialogElementTag`).
 */
class Dialog extends HTMLElement {
  /** Unique per instance; used both as the host class and to scope caller `styles`. */
  readonly scopeClass = `__internal-dialog-${resolvedTagNumber}-${++scopeInstanceCounter}__`;

  #dialog!: HTMLDialogElement;

  #spinnerOnly = false;
  #closing = false;
  #scrollLocked = false;
  #exitAnim: Animation | null = null;

  // Rebuilt each view; kept for targeted mutation between views.
  #contentEl: HTMLElement | null = null; // .dialog-content
  #footerEl: HTMLElement | null = null; // insertion anchor for notices
  #buttonEls: HTMLElement[] = [];
  #buttonViews: DialogButtonView[] = [];

  #defaultButtonIndex: number | null = null;
  #hasForm = false;
  #renderOverrides: DialogRenderOverrides<any> | undefined;
  #adapter: ContentAdapter<any> | undefined;
  #onClose: () => void = () => {};
  #onCancel: () => void = () => {};

  // notice state: the config notice (#baseNotice) is always shown while the dialog is
  // open; a reject raises a transient error notice shown *in addition*, below it.
  #baseNotice: ResolvedNotice | null = null;
  #transientNotice: ResolvedNotice | null = null;
  #transientEl: HTMLElement | null = null;
  #noticeDismissTimer: ReturnType<typeof setTimeout> | null = null;

  #focusBeforeBusy: HTMLElement | null = null;
  #loading = new Set<number>();
  #styleEl: HTMLStyleElement | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.appendChild(h("style", null, STYLE_TEXT));

    // A single, stable <dialog> node reused across the scope, so showModal() state and
    // the `cancel` listener survive every content swap.
    this.#dialog = h("dialog", {
      onkeydown: this.#onKeyDown,
    }) as HTMLDialogElement;
    this.#dialog.addEventListener("cancel", (ev) => {
      ev.preventDefault();
      this.#onCancel();
    });
    root.appendChild(this.#dialog);
  }

  connectedCallback(): void {
    this.classList.add(this.scopeClass);
  }

  disconnectedCallback(): void {
    if (this.#scrollLocked) {
      this.#scrollLocked = false;
      unlockBackgroundScroll();
    }
    if (this.#styleEl) {
      this.#styleEl.remove();
      this.#styleEl = null;
    }
  }

  showSpinnerOnly(): void {
    this.#spinnerOnly = true;
    this.#dialog.classList.add("spinner-dialog");
    this.#dialog.setAttribute("aria-label", "Loading");
    this.#dialog.removeAttribute("aria-labelledby");
    this.#dialog.removeAttribute("aria-describedby");
    this.#dialog.replaceChildren(
      h("div", {
        class: "dialog-spinner",
        role: "status",
        "aria-label": "Loading",
      }),
    );
    this.#show();
  }

  // Set the dialog's view. If a dialog is already on screen (the spinner placeholder, or
  // the previous dialog in a scope), fade the current box out, then swap the new view in
  // and grow it back in — the <dialog> stays open, so the modal backdrop never drops.
  // NOT for the spinner -> first-real handoff: fully fading the spinner out first leaves
  // a visible gap, so there we swap and grow the real dialog straight in.
  setView(view: DialogView): void {
    const dialog = this.#dialog;
    if (dialog.open && !this.#spinnerOnly) {
      const exit = dialog.animate(
        [
          { opacity: 1, transform: "scale(1)" },
          { opacity: 0, transform: "scale(0.97)" },
        ],
        { duration: SWAP_OUT_MS, easing: "ease-in", fill: "forwards" },
      );
      this.#exitAnim = exit;
      exit.onfinish = () => {
        this.#applyView(view);
        this.#growIn();
      };
    } else {
      const wasOpen = dialog.open; // spinner placeholder already showing
      this.#applyView(view);
      if (wasOpen) {
        this.#growIn();
      } else {
        this.#show();
      }
    }
  }

  raiseNotice(notice: ResolvedNotice): void {
    this.#setTransientNotice(notice);
  }

  setButtonLoading(index: number, loading: boolean): void {
    const wasBusy = this.#loading.size > 0;
    if (loading) {
      this.#loading.add(index);
    } else {
      this.#loading.delete(index);
    }
    const nowBusy = this.#loading.size > 0;

    // Going inert blurs whatever was focused; remember it while busy and restore after,
    // so the user isn't stranded with nothing focused (e.g. after a failed submit). The
    // focused field may live in light DOM inside a web component, so pierce shadow roots.
    if (!wasBusy && nowBusy) {
      this.#focusBeforeBusy = deepActiveElement();
    } else if (wasBusy && !nowBusy) {
      const toRestore = this.#focusBeforeBusy;
      this.#focusBeforeBusy = null;
      requestAnimationFrame(() => {
        if (toRestore?.isConnected) {
          toRestore.focus();
        }
      });
    }

    // Reflect the loading state on the button. Default buttons toggle a class (node
    // identity preserved, so focus survives); override buttons must be re-rendered
    // since their loading state is internal.
    const el = this.#buttonEls[index];
    if (el) {
      if (this.#renderOverrides?.actionButton) {
        const next = this.#renderButton(this.#buttonViews[index], index);
        el.replaceWith(next);
        this.#buttonEls[index] = next;
      } else {
        el.classList.toggle("loading", loading);
      }
    }

    if (this.#contentEl) {
      this.#contentEl.inert = nowBusy;
    }
  }

  getForm(): HTMLFormElement | null {
    return this.querySelector("form");
  }

  async closeDialog(): Promise<void> {
    const dialog = this.#dialog;
    if (!dialog || this.#closing) {
      this.remove();
      return;
    }
    this.#closing = true;
    dialog.classList.add("closing");

    await Promise.race([
      new Promise<void>((res) =>
        dialog.addEventListener("animationend", () => res(), { once: true }),
      ),
      new Promise<void>((res) => setTimeout(res, CLOSE_ANIMATION_FALLBACK_MS)),
    ]);

    dialog.close();
    this.remove();
  }

  // ---- internals ----

  // Show the dialog for the first time: open the modal, lock scroll, grow it in, focus.
  #show(): void {
    if (this.#dialog.open) return;
    this.#dialog.showModal();
    this.#scrollLocked = true;
    lockBackgroundScroll();
    this.#growIn();
    this.#focusInitial();
  }

  // The single entrance animation: grow the box in from nothing. Used for the spinner
  // placeholder, the first real dialog, and every in-scope swap alike.
  #growIn(): void {
    const box = this.#dialog;
    box.animate(
      [
        { transform: "scale(0)", opacity: 0 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: DIALOG_ANIM_MS, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
    // Clear the finished swap fade-out (fill: forwards) only after grow-in is on top of
    // the animation stack, so removing its held value causes no one-frame flash.
    this.#exitAnim?.cancel();
    this.#exitAnim = null;
  }

  // Apply a view: reset per-view state, project caller content into light-DOM slots, and
  // (re)build the shadow chrome. The stable <dialog> keeps its identity; only its single
  // child (the .dialog-content) is replaced.
  #applyView(view: DialogView): void {
    this.#spinnerOnly = false;
    this.#dialog.classList.remove("spinner-dialog");
    this.#dialog.setAttribute("aria-labelledby", "dialog-title");
    this.#dialog.setAttribute("aria-describedby", "dialog-body");
    this.#dialog.removeAttribute("aria-label");

    this.setAttribute("data-dialog-type", view.dialogType);
    this.#defaultButtonIndex = view.defaultButtonIndex;
    this.#hasForm = view.hasForm;
    this.#buttonViews = view.buttons;
    this.#renderOverrides = view.render;
    this.#adapter = view.adapter;
    this.#onClose = view.onClose;
    this.#onCancel = view.onCancel;
    this.#baseNotice = view.notice;

    // Reset transient-notice state (the old node lived in the content we're replacing).
    if (this.#noticeDismissTimer != null) {
      clearTimeout(this.#noticeDismissTimer);
      this.#noticeDismissTimer = null;
    }
    this.#transientNotice = null;
    this.#transientEl = null;
    this.#loading.clear();
    this.#focusBeforeBusy = null;

    this.#applyCallerStyles(view.styles);

    // Light DOM (projected through the slots) and shadow chrome.
    this.replaceChildren(...this.#buildSlotted(view));
    this.#dialog.replaceChildren(this.#buildContent(view));

    if (this.#dialog.open) {
      this.#focusInitial();
    }
  }

  // Scope the caller's (unscoped) CSS under this instance's class via CSS nesting, so
  // multiple dialogs — even from different library versions — can't collide. Removed on
  // close (see disconnectedCallback). NOTE: top-level @keyframes/@font-face in `styles`
  // can't be nested; wrap-scoping targets ordinary selectors (incl. nested @media).
  #applyCallerStyles(cssText: string | null): void {
    if (!cssText) {
      if (this.#styleEl) {
        this.#styleEl.remove();
        this.#styleEl = null;
      }
      return;
    }
    if (!this.#styleEl) {
      this.#styleEl = document.createElement("style");
      document.head.append(this.#styleEl);
    }
    this.#styleEl.textContent = `.${this.scopeClass} { ${cssText} }`;
  }

  // Coerce caller/override content to a Node using this dialog's adapter (if any).
  // #node is the plain seam; #lines additionally turns "\n" in strings into <br>s.
  #node(value: Renderable<any>): Node {
    return insertContent(value, this.#adapter);
  }
  #lines(value: Renderable<any>): Node {
    return withLineBreaks(value, this.#adapter);
  }

  // Build the light-DOM elements projected through the named slots.
  #buildSlotted(view: DialogView): Node[] {
    const els: Node[] = [];
    if (view.icon != null) {
      els.push(h("span", { slot: "icon" }, this.#node(view.icon)));
    }
    els.push(h("span", { slot: "title" }, this.#lines(view.title)));
    if (view.subtitle != null) {
      els.push(h("span", { slot: "subtitle" }, this.#lines(view.subtitle)));
    }
    if (view.intro != null) {
      els.push(h("div", { slot: "intro" }, this.#lines(view.intro)));
    }
    els.push(
      view.hasForm
        ? h(
            "form",
            {
              class: "content",
              slot: "content",
              onsubmit: (ev: Event) => ev.preventDefault(),
            },
            this.#node(view.content),
          )
        : h(
            "div",
            { class: "content", slot: "content" },
            this.#lines(view.content),
          ),
    );
    if (view.outro != null) {
      els.push(h("div", { slot: "outro" }, this.#lines(view.outro)));
    }
    return els;
  }

  // Build the shadow chrome (.dialog-content) and store references for later mutation.
  #buildContent(view: DialogView): HTMLElement {
    const r = this.#renderOverrides;

    const closeBtn = r?.closeButton
      ? this.#node(r.closeButton({ onClose: this.#onClose }))
      : h(
          "button",
          { class: "close-button", type: "button", onclick: this.#onClose },
          parseSvg(closeIconSvg),
        );

    const header = h(
      "div",
      { class: "header" },
      view.icon != null
        ? h("div", { id: "icon" }, h("slot", { name: "icon" }))
        : null,
      h(
        "div",
        { class: "titles" },
        h(
          "span",
          { class: "title", id: "dialog-title" },
          h("slot", { name: "title" }),
        ),
        h("span", { class: "subtitle" }, h("slot", { name: "subtitle" })),
      ),
      closeBtn,
    );

    const body = h(
      "div",
      {
        class: "body",
        id: "dialog-body",
        oninput: this.#dismissTransientNotice,
      },
      h("slot", { name: "intro" }),
      h("slot", { name: "content" }),
      h("slot", { name: "outro" }),
    );

    this.#buttonEls = view.buttons.map((b, i) => this.#renderButton(b, i));
    const footer = h(
      "div",
      { class: "footer" },
      h("div", { class: "action-buttons" }, this.#buttonEls),
    );
    this.#footerEl = footer;

    const content = h("div", { class: "dialog-content" }, header, body, footer);
    this.#contentEl = content;

    // The config notice sits between body and footer; the transient notice (if raised)
    // is later inserted right before the footer, i.e. directly after this one.
    if (this.#baseNotice) {
      content.insertBefore(
        this.#renderNoticeNode(this.#baseNotice, false),
        footer,
      );
    }

    return content;
  }

  #renderButton(b: DialogButtonView, i: number): HTMLElement {
    const loading = this.#loading.has(i);
    const onClick = () => {
      this.#dismissTransientNotice();
      b.onClick();
    };
    if (this.#renderOverrides?.actionButton) {
      const node = this.#renderOverrides.actionButton({
        text: b.text,
        variant: b.type,
        loading,
        onClick,
      });
      // Overrides return a Renderable; wrap non-elements so we always hold an element
      // reference to replace on loading changes.
      return node instanceof HTMLElement
        ? node
        : h("span", null, this.#node(node));
    }
    return h(
      "button",
      {
        class: `action-button${loading ? " loading" : ""}`,
        "data-type": b.type,
        type: "button",
        onclick: onClick,
      },
      h("span", { class: "spinner" }),
      h("span", { class: "button-text" }, b.text),
    );
  }

  // Render a notice element. The transient (reject) notice is `animated` — it carries the
  // enter/collapse classes and role="alert"; the persistent config notice is static with
  // role="status". Both honor the caller's custom-notice render override.
  #renderNoticeNode(
    notice: ResolvedNotice,
    animated: boolean,
    entering = false,
  ): HTMLElement {
    const r = this.#renderOverrides;
    if (r?.notice) {
      const node = r.notice({ variant: notice.type, message: notice.message });
      return node instanceof HTMLElement
        ? node
        : h("div", null, this.#node(node));
    }
    const cls = animated ? `notice${entering ? " entering" : ""}` : "notice";
    return h(
      "div",
      {
        class: cls,
        "data-notice-type": notice.type,
        role: animated ? "alert" : "status",
      },
      this.#node(notice.message),
    );
  }

  // Raise (or update / dismiss) the transient notice. Creating it adds the `entering`
  // class then removes it on the next frames so the CSS transition plays; dismissing adds
  // `dismissing` and removes the node once the collapse finishes.
  #setTransientNotice(notice: ResolvedNotice | null): void {
    if (this.#noticeDismissTimer != null) {
      clearTimeout(this.#noticeDismissTimer);
      this.#noticeDismissTimer = null;
    }

    if (notice) {
      this.#transientNotice = notice;
      if (this.#transientEl) {
        // Consecutive rejects: replace the node in place (no re-enter animation).
        const next = this.#renderNoticeNode(notice, true, false);
        this.#transientEl.replaceWith(next);
        this.#transientEl = next;
      } else if (this.#contentEl && this.#footerEl) {
        const el = this.#renderNoticeNode(notice, true, true);
        this.#contentEl.insertBefore(el, this.#footerEl);
        this.#transientEl = el;
        doubleRaf(() => el.classList.remove("entering"));
      }
    } else {
      this.#transientNotice = null;
      const el = this.#transientEl;
      if (el) {
        el.classList.add("dismissing");
        this.#noticeDismissTimer = setTimeout(() => {
          el.remove();
          if (this.#transientEl === el) this.#transientEl = null;
          this.#noticeDismissTimer = null;
        }, NOTICE_ANIM_MS);
      }
    }
  }

  #dismissTransientNotice = (): void => {
    if (this.#transientNotice == null) {
      return;
    }
    this.#setTransientNotice(null);
  };

  // On open, focus sensibly: an explicit [autofocus] in slotted content wins; else the
  // first form field; else the default button (or, for critical dialogs with no default,
  // the last button — Cancel — so nothing destructive is primed). Content is light DOM,
  // so those queries hit the host; the button lookup uses the stored refs.
  #focusInitial(): void {
    const autofocus = this.querySelector<HTMLElement>("[autofocus]");
    if (autofocus) {
      requestAnimationFrame(() => autofocus.focus());
      return;
    }
    if (this.#hasForm) {
      // First focusable field. `[name]` catches form-associated custom elements
      // (e.g. <wa-input>), whose .focus() delegates to the inner native control.
      const field = this.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, [name]',
      );
      if (field) {
        requestAnimationFrame(() => field.focus());
        return;
      }
    }
    const buttons = this.#buttonEls;
    if (buttons.length === 0) {
      return;
    }
    const index = this.#defaultButtonIndex ?? buttons.length - 1;
    const button = buttons[index];
    if (button) {
      try {
        // Using try because of a bug in WebAwesome.
        requestAnimationFrame(() => button.focus());
      } catch {}
    }
  }

  // Plain Enter triggers the default button, but only when focus is in a text field /
  // select. A focused button (native or custom) handles Enter itself; textarea gets a
  // newline. Composed input events from slotted fields still reach the shadow listeners
  // because propagation follows the flattened tree.
  #onKeyDown = (ev: KeyboardEvent): void => {
    if (
      ev.key !== "Enter" ||
      ev.defaultPrevented ||
      ev.isComposing ||
      ev.shiftKey ||
      ev.ctrlKey ||
      ev.metaKey ||
      ev.altKey
    ) {
      return;
    }
    // Enter should trigger the default button when the user is in a form field —
    // including custom form controls (web components) that wrap a native field. We
    // accept a native <input>/<select> (either directly, or revealed at the top of an
    // open-shadow custom control's composed path), or any custom element (tag contains
    // "-") that sits inside the dialog's form. <textarea> (newline) and buttons
    // (self-activating) are intentionally excluded.
    const deepTag = (ev.composedPath()[0] as HTMLElement | null)?.tagName ?? "";
    const retarget = ev.target as HTMLElement | null;
    const inField =
      deepTag === "INPUT" ||
      deepTag === "SELECT" ||
      (retarget != null &&
        retarget.tagName.includes("-") &&
        this.getForm()?.contains(retarget) === true);
    if (!inField) {
      return;
    }
    const index = this.#defaultButtonIndex;
    if (index == null) {
      return;
    }
    const button = this.#buttonViews[index];
    if (!button) {
      return;
    }
    ev.preventDefault();
    this.#dismissTransientNotice();
    button.onClick();
  };
}

export { Dialog };

// -------------------------------------------------------------------
// # Mount layer
// -------------------------------------------------------------------

function createDialogElement(id: string): Dialog {
  const el = document.createElement(dialogElementTag()) as Dialog;
  el.id = id;
  document.body.append(el);
  return el;
}

function handleFor(el: Dialog): DialogHandle {
  return {
    update: (view) => el.setView(view),
    close: () => el.closeDialog(),
    setButtonLoading: (index, loading) => el.setButtonLoading(index, loading),
    raiseNotice: (notice) => el.raiseNotice(notice),
    getForm: () => el.getForm(),
  };
}

function mountDialog(view: DialogView): DialogHandle {
  const el = createDialogElement(view.id);
  el.setView(view);
  return handleFor(el);
}

function mountSpinnerDialog(id: string): DialogHandle {
  const el = createDialogElement(id);
  el.showSpinnerOnly();
  return handleFor(el);
}

// -------------------------------------------------------------------
// # Notes on the framework seam (Lit / React as an option, not the core)
// -------------------------------------------------------------------
//
// The core is now vanilla DOM. There are exactly two places framework content flows in,
// and both funnel through `insertContent` (via the element's #node / #lines helpers):
//   1) caller content (title/body/icon/notice message) — see #buildSlotted / notices;
//   2) the return value of a render override (actionButton/closeButton/notice).
//
// To offer Lit (or React) as an option, define a ContentAdapter<C> where that framework
// already lives (so the core stays import-free) and pass it as `adapter`. `C` is inferred
// from the adapter, so every content field and override return is then typed to it:
//
//   // lit-adapter.ts
//   import { render, type TemplateResult } from "lit-html";
//   import type { ContentAdapter } from "./dialogs";
//   export const litDialogAdapter: ContentAdapter<TemplateResult> = (value) => {
//     const frag = document.createDocumentFragment();   // only a TemplateResult reaches
//     render(value, frag);                              // here — no guard, no null
//     return frag;
//   };
//
//   // app setup — C is inferred as TemplateResult
//   createDialogsController({ adapter: litDialogAdapter, render: { … } });
//
// Everything else — the modal, animations, focus, forms, notice state machine — is
// framework-free and stays put. That is the whole adapter surface.
