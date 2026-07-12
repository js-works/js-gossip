import { LitElement, css, html, nothing, render, svg, unsafeCSS } from "lit";
import type { CSSResult, TemplateResult } from "lit";

// Ensure Symbol.dispose exists before any scope's [Symbol.dispose] is created (needed
// for `using` and for disposing a scope). Harmless if the runtime already provides it.
// Lives here, in the library, so consumers get it without a separate polyfill import.
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

type Renderable = TemplateResult | Node | string | number | null | undefined;
type Styles = CSSResult | string;

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
  text: Renderable;
  variant: ActionButtonType;
  loading: boolean;
  onClick: () => void;
}

/** Descriptor passed to a custom close-button renderer. */
interface CloseButtonRender {
  onClose: () => void;
}

/** Descriptor passed to a custom notice renderer. */
interface NoticeRender {
  variant: "info" | "success" | "warn" | "error";
  message: Renderable;
}

/**
 * Optional per-part render overrides. Each is all-or-nothing: when provided, the library
 * renders nothing of its own for that part and uses the returned Renderable instead (so
 * the caller can drop in their design system's components, e.g. Web Awesome). A custom
 * part supplies its own states/animation from the descriptor — e.g. a custom action button
 * shows its own loading state, and a custom notice provides its own enter/leave animation.
 */
interface DialogRenderOverrides {
  actionButton?(button: ActionButtonRender): Renderable;
  closeButton?(close: CloseButtonRender): Renderable;
  notice?(notice: NoticeRender): Renderable;
}

interface DialogsControllerConfig {
  getText?(textKey: keyof DialogTexts): string | null;
  getDialogIcon?(dialogType: DialogType): Renderable | null;
  render?: DialogRenderOverrides;
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
interface DialogNotice {
  type?: "info" | "success" | "warn" | "error"; // default "info"
  message: Renderable;
}

interface BaseDialogConfig {
  title?: Renderable;
  subtitle?: Renderable;
  intro?: Renderable;
  content?: Renderable;
  outro?: Renderable;
  styles?: Styles;
  buttons?: DialogButtonLabels;
  /** Initial notice. Forms can also raise one on a rejected attempt (see form()). */
  notice?: DialogNotice | Renderable | null;
  /**
   * Abort this dialog. When the signal aborts, the dialog closes immediately and the
   * call resolves `{ canceled: true, aborted: true }`. Combined with any scope-level
   * signal passed to `open()`.
   */
  abortSignal?: AbortSignal;
}

interface InfoDialogConfig extends BaseDialogConfig {}
interface SuccessDialogConfig extends BaseDialogConfig {}
interface WarnDialogConfig extends BaseDialogConfig {}
interface ErrorDialogConfig extends BaseDialogConfig {}
interface ConfirmDialogConfig extends BaseDialogConfig {}
interface DecideDialogConfig extends BaseDialogConfig {}
interface FormDialogConfig extends BaseDialogConfig {}

interface DialogsFunctions {
  info(config: InfoDialogConfig): Promise<InfoDialogResult>;
  success(config: SuccessDialogConfig): Promise<SuccessDialogResult>;
  warn(config: WarnDialogConfig): Promise<WarnDialogResult>;
  error(config: ErrorDialogConfig): Promise<ErrorDialogResult>;
  confirm(config: ConfirmDialogConfig): Promise<ConfirmDialogResult>;
  confirmCritical(config: ConfirmDialogConfig): Promise<ConfirmDialogResult>;
  decide(config: DecideDialogConfig): Promise<DecideDialogResult>;
  decideCritical(config: DecideDialogConfig): Promise<DecideDialogResult>;
  form(config: FormDialogConfig): Promise<FormDialogResult>;
  formCritical(config: FormDialogConfig): Promise<FormDialogResult>;
  formAttempts(config: FormDialogConfig): FormInteraction;
  formCriticalAttempts(config: FormDialogConfig): FormInteraction;
}

interface DialogsController extends DialogsFunctions {
  /**
   * Open a scope whose dialogs share one modal surface (the backdrop stays up for the
   * whole scope). An optional `signal` aborts every dialog opened in the scope.
   */
  open(signal?: AbortSignal): DialogScope;
}

interface DialogScope extends DialogsFunctions {
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
interface FormAttempt {
  readonly data: FormDialogData;
  /** Accept the submission: resolve the dialog and close it. */
  accept(): void;
  /**
   * Reject it: keep the dialog open (values preserved) and show an error notice with the
   * given message. A reject is always an error, so only the message is configurable.
   */
  reject(message: Renderable): void;
}

/**
 * Returned by formAttempts()/formCriticalAttempts(). `for await` it to intercept each
 * submit and accept/reject (retry with a notice); it is also awaitable, which resolves
 * to the final result once the loop ends. After the loop, read `result` to see whether
 * the form was confirmed or canceled.
 */
type FormInteraction = Promise<FormDialogResult> &
  AsyncIterable<FormAttempt> & {
    /** The final result once settled (confirmed or canceled); undefined while pending. */
    readonly result: FormDialogResult | undefined;
  };

/** Any result finish() can produce, before narrowing to a specific dialog's result. */
type AnyDialogResult = DialogResult<any> | DialogResult<any, unknown>;

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
  message: Renderable;
}

function isDialogNotice(
  value: DialogNotice | Renderable,
): value is DialogNotice {
  return value != null && typeof value === "object" && "message" in value;
}

function resolveNotice(notice: DialogNotice | Renderable): ResolvedNotice {
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

// Render a value, turning "\n" in a plain string into <br> line breaks. Non-string
// Renderables (TemplateResult, Node, …) pass through untouched.
function withLineBreaks(value: Renderable): Renderable {
  if (typeof value !== "string" || !value.includes("\n")) {
    return value;
  }
  const lines = value
    .trim()
    .split(/\r?\n|\r/)
    .map((line) => line.trim());

  return html`${lines.map((line, i) => (i === 0 ? line : html`<br />${line}`))}`;
}

interface DialogView {
  id: string;
  dialogType: DialogType;
  styles: string | null;
  icon: Renderable | null;
  title: Renderable;
  subtitle: Renderable;
  intro: Renderable;
  content: Renderable;
  outro: Renderable;
  notice: ResolvedNotice | null;
  hasForm: boolean;
  buttons: DialogButtonView[];
  /** Index of the button triggered by Enter, or null (e.g. critical dialogs). */
  defaultButtonIndex: number | null;
  render: DialogRenderOverrides | undefined;
  onClose: () => void;
  onCancel: () => void;
}

interface DialogHandle {
  update(view: DialogView): void;
  close(): Promise<void>;
  /** Toggle the inline spinner on the given action button. */
  setButtonLoading(index: number, loading: boolean): void;
  /** Raise the transient (reject) notice, overriding the config notice until cleared. */
  raiseNotice(notice: ResolvedNotice): void;
  /** The form element rendered inside the dialog, if any. */
  getForm(): HTMLFormElement | null;
}

const SPINNER_DIALOG_DELAY_MS = 300;
const BUTTON_SPINNER_DELAY_MS = 150;

// A minimal single-consumer async queue: form submits are pushed in; the caller's
// `for await` pulls them out. `end()` completes the iteration (on accept or cancel).
interface AttemptQueue {
  push(attempt: FormAttempt): void;
  end(): void;
  iterator(): AsyncIterator<FormAttempt>;
}

function createAttemptQueue(): AttemptQueue {
  const buffer: FormAttempt[] = [];
  let waiting: ((r: IteratorResult<FormAttempt>) => void) | null = null;
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
          return new Promise<IteratorResult<FormAttempt>>((resolve) => {
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

function createDialogsController(
  config: DialogsControllerConfig,
): DialogsController {
  const open = (signal?: AbortSignal): DialogScope =>
    createDialogScope(config, signal);

  // Direct (non-scoped) calls open a throwaway scope and dispose it once resolved.
  const oneShot = <R>(run: (scope: DialogScope) => Promise<R>): Promise<R> => {
    const scope = open();
    return run(scope).finally(() => scope[Symbol.dispose]());
  };

  // Forms return a FormInteraction (Promise + async-iterable). We must return that
  // object as-is (so `for await` works), and dispose the scope once it settles.
  const oneShotForm = (
    run: (scope: DialogScope) => FormInteraction,
  ): FormInteraction => {
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
  config: BaseDialogConfig;
  buttons: ButtonConfig[];
  allowsForm: boolean;
}

// Monotonic, collision-free per-scope id (Date.now() collided for scopes opened within
// the same millisecond, and the value is used as a DOM element id).
let dialogInstanceCounter = 0;

function createDialogScope(
  config: DialogsControllerConfig,
  scopeSignal?: AbortSignal,
): DialogScope {
  const dialogId = `internal-dialog-${++dialogInstanceCounter}`;

  // One element for the whole scope: it's reused across every dialog so showModal()
  // stays active and the modal backdrop never drops between dialogs.
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

  function iconFor(dialogType: DialogType): Renderable | null {
    if (config.getDialogIcon) {
      return config.getDialogIcon(dialogType) ?? null;
    }
    return defaultDialogIcon(dialogType);
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
    const s = spec.config.styles;
    if (!s) {
      return null;
    }
    return typeof s === "string" ? s : s.cssText;
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
  function openForm(spec: OpenDialogSpec): FormInteraction {
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

    const interaction = resultPromise as FormInteraction;
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
    config: BaseDialogConfig,
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

const closeIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
  </svg>
`;

const infoIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
  </svg>
`;

const successIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M3 14.5A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5h8a.5.5 0 0 1 0 1H3a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V8a.5.5 0 0 1 1 0v5a1.5 1.5 0 0 1-1.5 1.5z"/>
    <path d="m8.354 10.354 7-7a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0"/>
  </svg>
`;

const warnIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M4.54.146A.5.5 0 0 1 4.893 0h6.214a.5.5 0 0 1 .353.146l4.394 4.394a.5.5 0 0 1 .146.353v6.214a.5.5 0 0 1-.146.353l-4.394 4.394a.5.5 0 0 1-.353.146H4.893a.5.5 0 0 1-.353-.146L.146 11.46A.5.5 0 0 1 0 11.107V4.893a.5.5 0 0 1 .146-.353zM5.1 1 1 5.1v5.8L5.1 15h5.8l4.1-4.1V5.1L10.9 1z"/>
    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
  </svg>
`;

const errorIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
  </svg>
`;

const confirmIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
    <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/>
  </svg>
`;

const placeholderSpinner = html`<div
  class="dialog-spinner"
  role="status"
  aria-label="Loading"
></div>`;

function defaultDialogIcon(dialogType: DialogType): Renderable | null {
  switch (dialogType) {
    case "info":
      return infoIcon;
    case "success":
      return successIcon;
    case "warn":
      return warnIcon;
    case "error":
      return errorIcon;
    case "confirm":
    case "confirmCritical":
    case "decide":
    case "decideCritical":
      return confirmIcon;
    case "form":
    case "formCritical":
      return null;
  }
}

// -------------------------------------------------------------------
// # Styles
// -------------------------------------------------------------------

function createTheme<T extends Record<string, string>>(themeObj: T) {
  const result = {} as Record<keyof T, CSSResult>;

  for (const key in themeObj) {
    result[key] = unsafeCSS(themeObj[key]);
  }

  return Object.freeze(result);
}

const theme = createTheme({
  textColor: "light-dark(black, white)",
  // The primary/secondary colors read from host CSS variables but fall back to
  // built-in values so the library renders colors without a host design system.
  // The fallbacks match Web Awesome's default palette (brand=blue-50, danger=red-50,
  // success=green-50; the "loud" fills used for filled buttons).
  primaryTextColor: "var(--ui-surface, #ffffff)",
  primaryBackgroundColor: "var(--ui-color-primary-500, #0071ec)",
  secondaryTextColor: "var(--ui-text, #1f2430)",
  secondaryBackgroundColor: "white",
  secondaryBorderColor: "#b0b0b0",
  dangerTextColor: "white",
  dangerBackgroundColor: "#dc3146",
  successColor: "var(--ui-color-success-500, #00883c)",
  dialogBorderRadius: "6px",
  closeButtonBorderRadius: "100%",
  actionButtonBorderRadius: "3px",
  dialogBackgroundColor: "light-dark(white, #333)",
});

// Duration of the notice appear/disappear (collapse) animation. Change this one
// value to try different speeds — it drives both the CSS transition and the JS
// timer that removes the element after the collapse finishes.
const NOTICE_ANIM_MS = 350;

// Duration of the dialog grow-in (entrance) and fade-out (close) animations. Single
// knob for both; drives the WAAPI grow-in, the CSS close/backdrop animations, and
// (with a margin) the close-animation fallback timeout.
const DIALOG_ANIM_MS = 200;

// Duration of the quick fade-out when swapping one on-screen dialog for the next within
// a scope (the backdrop stays up; only the box content changes, then grows back in).
const SWAP_OUT_MS = 140;

const dialogStyles = css`
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

    &[open].closing {
      animation: dialog-fade-out ${DIALOG_ANIM_MS}ms ease-in-out;
    }

    &[open]::backdrop {
      background-color: rgba(0, 0, 0, 0.5);
    }

    &[open]:not(.closing)::backdrop {
      animation: backdrop-fade-in ${DIALOG_ANIM_MS}ms ease-in-out;
    }

    &[open].closing::backdrop {
      animation: backdrop-fade-out ${DIALOG_ANIM_MS}ms ease-in-out;
    }
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
     baseline/descender space, which shaved a pixel off one edge — that was the clipping,
     not the padding. */
  ::slotted([slot="icon"]) svg,
  #icon svg {
    display: block;
    width: 1em;
    height: 1em;
  }

  /* The icon is slotted (wrapped in a <span slot="icon">); collapse that wrapper so the
     SVG is the direct, cleanly-sized flex child of #icon and the circle stays round. */
  ::slotted([slot="icon"]) {
    display: contents;
  }

  :host([data-dialog-type="info"]) #icon,
  :host([data-dialog-type="confirm"]) #icon,
  :host([data-dialog-type="decide"]) #icon,
  :host([data-dialog-type="success"]) #icon {
    color: ${theme.primaryBackgroundColor};
    background-color: color-mix(
      in srgb,
      ${theme.primaryBackgroundColor},
      white 90%
    );
  }

  :host([data-dialog-type="warn"]) #icon,
  :host([data-dialog-type="error"]) #icon,
  :host([data-dialog-type="confirmCritical"]) #icon,
  :host([data-dialog-type="decideCritical"]) #icon {
    color: ${theme.dangerBackgroundColor};
    background-color: color-mix(
      in srgb,
      ${theme.dangerBackgroundColor},
      white 90%
    );
  }

  .dialog-content {
    /* Chrome (titles, buttons) stays unselectable; the body and notice opt back into
       text selection below so error messages can be copied. */
    user-select: none;
    font-size: 16px;
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
      sans-serif;

    .header {
      display: flex;
      align-items: center;
      gap: 0.5em;
      padding: 1em 1.25em 0.4em 1.25em;
      width: 100%;
      box-sizing: border-box;

      .titles {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 0.25em 0 0 0;

        .title {
          display: block;
          font-size: 1.1em;
          font-weight: 600;
        }

        .subtitle {
          display: block;
          font-size: 0.85em;
          line-height: 0.85em;
          padding: 0 1px;
        }
      }
    }

    .body {
      display: flex;
      flex-direction: column;
      gap: 0.5em;
      padding: 0 1.25em 0.75em 1.25em;
      min-height: 2em;
      line-height: 1.25em;
      user-select: text;
    }

    .footer {
      padding: 0.75em;
      user-select: none;

      .action-buttons {
        display: flex;
        flex-direction: row-reverse;
        gap: 0.4em;
      }
    }
  }

  .action-button {
    position: relative;
    outline: none;
    border: none;
    border-radius: ${theme.actionButtonBorderRadius};
    padding: 0.5em 1.5em;
    font-weight: 400;
    cursor: pointer;

    .spinner {
      display: none;
    }

    &.loading {
      .spinner {
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

      .button-text {
        visibility: hidden;
      }
    }

    &[data-type="primary"] {
      color: ${theme.primaryTextColor};
      background-color: ${theme.primaryBackgroundColor};

      &:hover {
        background-color: color-mix(
          in srgb,
          ${theme.primaryBackgroundColor},
          black 10%
        );
      }

      &:active {
        background-color: color-mix(
          in srgb,
          ${theme.primaryBackgroundColor},
          black 20%
        );
      }
    }

    &[data-type="secondary"] {
      color: ${theme.secondaryTextColor};
      background-color: ${theme.secondaryBackgroundColor};
      border: 1px solid ${theme.secondaryBorderColor};

      &:hover {
        background-color: color-mix(
          in srgb,
          ${theme.secondaryBackgroundColor},
          black 5%
        );
      }

      &:active {
        background-color: color-mix(
          in srgb,
          ${theme.secondaryBackgroundColor},
          black 10%
        );
      }
    }

    &[data-type="danger"] {
      color: ${theme.dangerTextColor};
      background-color: ${theme.dangerBackgroundColor};

      &:hover {
        background-color: color-mix(
          in srgb,
          ${theme.dangerBackgroundColor},
          black 15%
        );
      }

      &:active {
        background-color: color-mix(
          in srgb,
          ${theme.dangerBackgroundColor},
          black 40%
        );
      }
    }

    &[data-type="success"] {
      color: white;
      background-color: ${theme.successColor};

      &:hover {
        background-color: color-mix(in srgb, ${theme.successColor}, black 10%);
      }

      &:active {
        background-color: color-mix(in srgb, ${theme.successColor}, black 20%);
      }
    }
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

    &:hover {
      background-color: light-dark(
        color-mix(in srgb, white, black 7%),
        color-mix(in srgb, black, white 7%)
      );
    }

    &:active {
      background-color: light-dark(
        color-mix(in srgb, #f0f0f0, black 10%),
        color-mix(in srgb, #f0f0f0, white 10%)
      );
    }
  }

  .notice {
    position: relative;
    margin: 0.7em 1.25em 0.75em 1.25em;
    padding: 0.5em 0.5em 0.5em 1.25em;
    border-radius: 2px;
    background-color: light-dark(#f4f4f4, #3d3d3d);
    color: ${theme.textColor};
    font-size: 0.9em;
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

    /* Rounded accent bar floating inside the notice; its color conveys the type.
       The background/text stay neutral so the notice reads calm anywhere. */
    &::before {
      content: "";
      position: absolute;
      left: 0.25em;
      top: 0.25em;
      bottom: 0.25em;
      width: 0.2em;
      border-radius: 0.125em;
      background: ${theme.primaryBackgroundColor};
    }

    &.dismissing,
    &.entering {
      max-height: 0;
      opacity: 0;
      margin-top: 0;
      margin-bottom: 0;
      padding-top: 0;
      padding-bottom: 0;
    }

    /* info uses the default bar color (primary); the rest override just the bar. */
    &[data-notice-type="success"]::before {
      background: ${theme.successColor};
    }

    &[data-notice-type="warn"]::before {
      background: light-dark(#f08c00, #f7a53b);
    }

    &[data-notice-type="error"]::before {
      background: ${theme.dangerBackgroundColor};
    }

    /* Error notices also get a faint danger-tinted background (the other types keep the
       neutral notice background and signal type through the accent bar alone). */
    &[data-notice-type="error"] {
      background-color: light-dark(
        color-mix(in srgb, ${theme.dangerBackgroundColor}, white 94%),
        color-mix(in srgb, ${theme.dangerBackgroundColor}, #3d3d3d 88%)
      );
    }
  }

  /* The reject notice, when it follows the config notice, is pulled up with a negative
     top margin so the gap between the two stays small (the config notice keeps its normal
     0.75em bottom margin — collapsing with the -0.45em leaves a 0.3em gap). Crucially the
     gap now belongs to the *reject* notice: as it dismisses, its top margin animates back
     to 0 in step with its collapse, so the whole gap closes with the notice and the config
     notice above never moves. */
  .notice + .notice {
    margin-top: -0.45em;
  }

  .notice + .notice.entering,
  .notice + .notice.dismissing {
    margin-top: 0;
  }

  @keyframes dialog-fade-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  @keyframes backdrop-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes backdrop-fade-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  @keyframes spin {
    from {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }
`;

const placeholderStyles = css`
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
    color: ${theme.primaryBackgroundColor};
  }

  .dialog-spinner {
    width: 2.2em;
    height: 2.2em;
    border: 3px solid color-mix(in srgb, currentColor 20%, transparent);
    border-top: 3px solid currentColor;
    border-radius: 50%;
    animation: spin-plain 1s linear infinite;
    box-sizing: border-box;
  }

  @keyframes spin-plain {
    to {
      transform: rotate(360deg);
    }
  }
`;

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
 * The presentational dialog element: renders the native `<dialog>` shell and projects
 * caller content through named slots — `icon`, `title`, `subtitle`, `intro`, `content`,
 * `outro`. The notice and action buttons are library-owned chrome rendered in the shadow
 * root, since they carry wired behavior (loading spinner, validate/submit, the notice
 * state machine) that isn't expressible as plain slotted markup.
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
class Dialog extends LitElement {
  static styles = [dialogStyles, placeholderStyles];

  /** Unique per instance; used both as the host class and to scope caller `styles`. */
  readonly scopeClass = `__internal-dialog-${resolvedTagNumber}-${++scopeInstanceCounter}__`;

  #spinnerOnly = false;
  #closing = false;
  #scrollLocked = false;

  // Set when a new view has just been applied to an already-open dialog: updated() then
  // grows the new box in. Holds the swap's fade-out animation so it can be cleared once
  // the grow-in is on top (avoids a one-frame flash from its `fill: forwards`).
  #pendingGrowIn = false;
  #exitAnim: Animation | null = null;

  // chrome inputs (set by setView; a bare-slot consumer could set these directly)
  #buttons: DialogButtonView[] = [];
  #defaultButtonIndex: number | null = null;
  #hasForm = false;
  #hasIcon = false;
  #renderOverrides: DialogRenderOverrides | undefined;
  #onClose: () => void = () => {};
  #onCancel: () => void = () => {};

  // notice state: the config notice (#baseNotice) is always shown while the dialog is
  // open; a reject raises a transient error notice shown *in addition*, below it.
  // #shownTransient is the transient currently in the DOM — it lags #transientNotice
  // during the collapse animation.
  #baseNotice: ResolvedNotice | null = null;
  #transientNotice: ResolvedNotice | null = null;
  #shownTransient: ResolvedNotice | null = null;
  #noticeDismissing = false;
  #noticeEntering = false;
  #noticeDismissTimer: ReturnType<typeof setTimeout> | null = null;

  #initialFocusDone = false;
  #focusBeforeBusy: HTMLElement | null = null;
  #loading = new Set<number>();
  #styleEl: HTMLStyleElement | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.classList.add(this.scopeClass);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
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
    this.requestUpdate();
  }

  // Set the dialog's view. If a dialog is already on screen (the spinner placeholder, or
  // the previous dialog in a scope), fade the current box out, then swap the new view in
  // and grow it back in — the <dialog> stays open, so the modal backdrop never drops.
  // On a fresh element, firstUpdated() will showModal() + grow it in.
  setView(view: DialogView): void {
    const dialog = this.#dialogEl;
    // Real -> real swap within a scope: fade the current box out, then grow the new one
    // in. NOT for the spinner -> first-real handoff — fully fading the spinner out first
    // leaves a visible gap, so there we swap the content and grow the real dialog
    // straight in (grow-in starts on the same frame, so there's no empty beat).
    if (dialog?.open && !this.#spinnerOnly) {
      const exit = dialog.animate(
        [
          { opacity: 1, transform: "scale(1)" },
          { opacity: 0, transform: "scale(0.97)" },
        ],
        { duration: SWAP_OUT_MS, easing: "ease-in", fill: "forwards" },
      );
      this.#exitAnim = exit;
      exit.onfinish = () => {
        this.#pendingGrowIn = true; // updated() runs #growIn after the swap renders
        this.#applyView(view);
      };
    } else {
      // Fresh element: firstUpdated() grows it in. Spinner already open: request grow-in
      // here, since firstUpdated already ran for the spinner placeholder.
      if (dialog?.open) {
        this.#pendingGrowIn = true;
      }
      this.#applyView(view);
    }
  }

  raiseNotice(notice: ResolvedNotice): void {
    this.#transientNotice = notice;
    this.#refreshNotice();
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
      void this.updateComplete.then(() => {
        if (toRestore?.isConnected) {
          toRestore.focus();
        }
      });
    }
    this.requestUpdate();
  }

  // The form is slotted light DOM, so query the host rather than the shadow root.
  getForm(): HTMLFormElement | null {
    return this.querySelector("form");
  }

  async closeDialog(): Promise<void> {
    const dialog = this.#dialogEl;
    if (!dialog || this.#closing) {
      this.remove();
      return;
    }
    this.#closing = true;
    this.requestUpdate();
    await this.updateComplete;

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

  get #dialogEl(): HTMLDialogElement | null {
    return (this.renderRoot as ShadowRoot).querySelector("dialog");
  }

  // Apply a view to the element: set chrome, project content into the slots (light DOM),
  // inject the caller's scoped styles, and reset per-view focus state (needed because the
  // element is reused across a scope).
  #applyView(view: DialogView): void {
    this.#spinnerOnly = false;

    this.setAttribute("data-dialog-type", view.dialogType);
    this.#buttons = view.buttons;
    this.#defaultButtonIndex = view.defaultButtonIndex;
    this.#hasForm = view.hasForm;
    this.#hasIcon = view.icon != null;
    this.#renderOverrides = view.render;
    this.#onClose = view.onClose;
    this.#onCancel = view.onCancel;
    this.#baseNotice = view.notice;
    this.#transientNotice = null;
    this.#loading.clear();
    this.#initialFocusDone = false; // re-focus for the new view
    this.#focusBeforeBusy = null;

    this.#applyCallerStyles(view.styles);
    this.#refreshNotice();

    // Project caller content through the named slots (light DOM), managed by its own
    // lit render root, independent of the shadow chrome below.
    render(this.#contentTemplate(view), this);
    this.requestUpdate();
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

  #contentTemplate(view: DialogView): TemplateResult {
    const content = view.hasForm
      ? html`<form
          class="content"
          slot="content"
          @submit=${(ev: Event) => ev.preventDefault()}
        >
          ${view.content}
        </form>`
      : html`<div class="content" slot="content">
          ${withLineBreaks(view.content)}
        </div>`;

    return html`
      ${view.icon != null ? html`<span slot="icon">${view.icon}</span>` : null}
      <span slot="title">${withLineBreaks(view.title)}</span>
      ${view.subtitle != null
        ? html`<span slot="subtitle">${withLineBreaks(view.subtitle)}</span>`
        : null}
      ${view.intro != null
        ? html`<div slot="intro">${withLineBreaks(view.intro)}</div>`
        : null}
      ${content}
      ${view.outro != null
        ? html`<div slot="outro">${withLineBreaks(view.outro)}</div>`
        : null}
    `;
  }

  // Drives only the transient (reject) notice's enter/collapse animation. The base
  // config notice renders statically in #renderChrome and isn't tracked here.
  #refreshNotice(): void {
    const next = this.#transientNotice;
    const prev = this.#shownTransient;
    if (next === prev) {
      return;
    }

    if (this.#noticeDismissTimer != null) {
      clearTimeout(this.#noticeDismissTimer);
      this.#noticeDismissTimer = null;
    }

    if (prev == null) {
      this.#shownTransient = next;
      this.#noticeDismissing = false;
      if (this.#dialogEl?.open ?? false) {
        this.#noticeEntering = true;
        this.requestUpdate();
        void this.updateComplete.then(() => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              this.#noticeEntering = false;
              this.requestUpdate();
            }),
          );
        });
      } else {
        this.#noticeEntering = false;
        this.requestUpdate();
      }
    } else if (next == null) {
      this.#noticeDismissing = true;
      this.requestUpdate();
      this.#noticeDismissTimer = setTimeout(() => {
        this.#shownTransient = null;
        this.#noticeDismissing = false;
        this.#noticeDismissTimer = null;
        this.requestUpdate();
      }, NOTICE_ANIM_MS);
    } else {
      this.#noticeEntering = false;
      this.#noticeDismissing = false;
      this.#shownTransient = next;
      this.requestUpdate();
    }
  }

  #dismissTransientNotice = (): void => {
    if (this.#transientNotice == null) {
      return;
    }
    this.#transientNotice = null;
    this.#refreshNotice();
  };

  protected firstUpdated(): void {
    const dialog = this.#dialogEl;
    if (dialog && !dialog.open) {
      dialog.showModal();
      this.#scrollLocked = true;
      lockBackgroundScroll();
      this.#growIn();
    }
    dialog?.addEventListener("cancel", (ev) => {
      ev.preventDefault();
      this.#onCancel();
    });
  }

  protected updated(): void {
    if (this.#pendingGrowIn) {
      this.#pendingGrowIn = false;
      this.#growIn();
    }

    if (
      !this.#initialFocusDone &&
      !this.#spinnerOnly &&
      (this.#dialogEl?.open ?? false)
    ) {
      this.#initialFocusDone = true;
      this.#focusInitial();
    }
  }

  // The single entrance animation: grow the box in from nothing. Used for the spinner
  // placeholder, the first real dialog, and every in-scope swap alike.
  #growIn(): void {
    const box = this.#dialogEl;
    if (!box) {
      return;
    }
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

  // On open, focus sensibly: an explicit [autofocus] in slotted content wins; else the
  // first form field; else the default button (or, for critical dialogs with no default,
  // the last button — Cancel — so nothing destructive is primed). Content is light DOM,
  // so those queries hit the host; only the button lookup hits the shadow root.
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
    const buttons = (
      this.renderRoot as ShadowRoot
    ).querySelectorAll<HTMLElement>(".action-buttons > *");
    if (buttons.length === 0) {
      return;
    }
    const index = this.#defaultButtonIndex ?? buttons.length - 1;

    if (buttons[index]) {
      try {
        // Using try because of a bug in WebAwesome.
        requestAnimationFrame(() => buttons[index]?.focus());
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
    // (self-activating) are intentionally excluded. This keeps the library agnostic to
    // any specific component library.
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
    const button = this.#buttons[index];
    if (!button) {
      return;
    }
    ev.preventDefault();
    this.#dismissTransientNotice();
    button.onClick();
  };

  protected render(): TemplateResult {
    const showingSpinner = this.#spinnerOnly;
    const classes = [
      showingSpinner ? "spinner-dialog" : "",
      this.#closing ? "closing" : "",
    ]
      .filter(Boolean)
      .join(" ");

    // A single, stable <dialog> node: only its class and inner chrome change between the
    // spinner placeholder and the real dialog, so showModal() state and the `cancel`
    // listener survive the spinner -> dialog swap. The title/body are the dialog's
    // accessible name/description (ids resolve within this instance's shadow root).
    return html`
      <dialog
        class=${classes}
        @keydown=${this.#onKeyDown}
        aria-labelledby=${showingSpinner ? nothing : "dialog-title"}
        aria-describedby=${showingSpinner ? nothing : "dialog-body"}
        aria-label=${showingSpinner ? "Loading" : nothing}
      >
        ${showingSpinner ? placeholderSpinner : this.#renderChrome()}
      </dialog>
    `;
  }

  // The shadow chrome: wrappers + named slots for content, plus the library-owned notice
  // and action buttons. Slotted content is projected from the host's light DOM.
  #renderChrome(): TemplateResult {
    const r = this.#renderOverrides;

    return html`
      <div class="dialog-content" ?inert=${this.#loading.size > 0}>
        <div class="header">
          ${this.#hasIcon
            ? html`<div id="icon"><slot name="icon"></slot></div>`
            : null}
          <div class="titles">
            <span class="title" id="dialog-title"
              ><slot name="title"></slot
            ></span>
            <span class="subtitle"><slot name="subtitle"></slot></span>
          </div>
          ${r?.closeButton
            ? r.closeButton({ onClose: this.#onClose })
            : html`<button
                class="close-button"
                type="button"
                @click=${this.#onClose}
              >
                ${closeIcon}
              </button>`}
        </div>
        <div
          class="body"
          id="dialog-body"
          @input=${this.#dismissTransientNotice}
        >
          <slot name="intro"></slot>
          <slot name="content"></slot>
          <slot name="outro"></slot>
        </div>
        ${this.#baseNotice
          ? this.#renderNotice(this.#baseNotice, r, false)
          : null}
        ${this.#shownTransient
          ? this.#renderNotice(this.#shownTransient, r, true)
          : null}
        <div class="footer">
          <div class="action-buttons">
            ${this.#buttons.map((b, i) => this.#renderActionButton(b, i, r))}
          </div>
        </div>
      </div>
    `;
  }

  // The persistent config notice: no enter/collapse animation, and a polite `status`
  // role rather than `alert`, since it's standing context (like help text), not an
  // interruption. Honors the same custom-notice render override as the transient one.
  // Render a notice. The transient (reject) notice is `animated` — it carries the
  // enter/collapse classes and role="alert"; the persistent config notice is static
  // with role="status". Both honor the caller's custom-notice render override.
  #renderNotice(
    notice: ResolvedNotice,
    r: DialogRenderOverrides | undefined,
    animated: boolean,
  ): Renderable {
    if (r?.notice) {
      return r.notice({ variant: notice.type, message: notice.message });
    }
    const cls = animated
      ? `notice ${this.#noticeDismissing ? "dismissing" : ""} ${
          this.#noticeEntering ? "entering" : ""
        }`
      : "notice";
    return html`<div
      class=${cls}
      data-notice-type=${notice.type}
      role=${animated ? "alert" : "status"}
    >
      ${notice.message}
    </div>`;
  }

  #renderActionButton(
    b: DialogButtonView,
    i: number,
    r: DialogRenderOverrides | undefined,
  ): Renderable {
    const loading = this.#loading.has(i);
    const onClick = () => {
      this.#dismissTransientNotice();
      b.onClick();
    };
    if (r?.actionButton) {
      return r.actionButton({
        text: b.text,
        variant: b.type,
        loading,
        onClick,
      });
    }
    return html`
      <button
        class="action-button ${loading ? "loading" : ""}"
        data-type=${b.type}
        type="button"
        @click=${onClick}
      >
        <span class="spinner"></span>
        <span class="button-text">${b.text}</span>
      </button>
    `;
  }
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
