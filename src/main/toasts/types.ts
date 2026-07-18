// -------------------------------------------------------------------
// Core public types for toasts.
// -------------------------------------------------------------------

import type { Severity } from "../internal/severity.js";

export type ToastType = Severity | "loading";

/** A single action button rendered under the message. */
export interface ToastAction<C> {
  /** Button label (content of type `C`). */
  label: C;
  /** Invoked on click, before dismissal. May be async. */
  onClick?: () => void | Promise<void>;
  /** Dismiss the toast after `onClick`. Defaults to `true`. */
  dismiss?: boolean;
}

export interface ToastOptions<C> {
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
   * Dedupe key. A new toast whose key matches a still-present one
   * updates that one in place (content refreshed, timer reset) and bumps a
   * visible count instead of stacking a duplicate. Omit for no dedupe.
   */
  key?: string;
  /** Action buttons rendered under the message. */
  actions?: ToastAction<C>[];
  /**
   * Whether the user can dismiss this toast (close button, Escape,
   * swipe). Defaults to `true`. Set `false` for e.g. an in-flight loading
   * toast; programmatic dismissal (the handle, timers, `clear`) still works.
   */
  dismissible?: boolean;
}

export type ToastInput<C> = string | ToastOptions<C>;

/** Returned by `info`/`success`/`warn`/`error` so callers can control a specific toast. */
export interface ToastHandle<C> {
  id: number;
  dismiss(): void;
  /**
   * Patch a live toast: any provided field replaces the current one,
   * omitted fields are left untouched. Changing `duration` resets the
   * countdown. No-ops once the toast has been dismissed.
   */
  update(options: Partial<ToastOptions<C>>): void;
}

/** {@link promise} result: a handle plus the settled promise, so callers can await it. */
export interface PromiseHandle<C, T> extends ToastHandle<C> {
  result: Promise<T>;
}

/** Messages for the three phases of {@link ToastController.promise}. */
export interface PromiseMessages<C, T> {
  loading: ToastInput<C>;
  /** Static input, or a function of the resolved value. */
  success: ToastInput<C> | ((value: T) => ToastInput<C>);
  /** Static input, or a function of the rejection reason. */
  error: ToastInput<C> | ((error: unknown) => ToastInput<C>);
}

export interface ToastController<C> {
  info(message: string): ToastHandle<C>;
  info(options: ToastOptions<C>): ToastHandle<C>;
  success(message: string): ToastHandle<C>;
  success(options: ToastOptions<C>): ToastHandle<C>;
  warn(message: string): ToastHandle<C>;
  warn(options: ToastOptions<C>): ToastHandle<C>;
  error(message: string): ToastHandle<C>;
  error(options: ToastOptions<C>): ToastHandle<C>;
  /**
   * Show a loading toast that transitions to success or error when the
   * promise settles. Returns the handle plus `.result` (the settled promise,
   * which rejects if the input does — attach your own `.catch` if needed).
   */
  promise<T>(
    promise: Promise<T>,
    messages: PromiseMessages<C, T>,
  ): PromiseHandle<C, T>;
  clear(): void;
  /** Tear down: cancel timers, drop toasts, remove listeners + container. */
  destroy(): void;
}
