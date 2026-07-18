// -------------------------------------------------------------------
// Ready-made themes tuned to XWiki's default look — one per feature.
// -------------------------------------------------------------------

import { createDialogTheme } from "../dialogs/theme.js";
import type { DialogTheme } from "../dialogs/theme.js";
import { createToastTheme, defaultToastTheme } from "../toasts/theme.js";
import type { ToastTheme } from "../toasts/theme.js";

// XWiki ships the "Flamingo" skin, built on Bootstrap 3. Rather than hardcode colors,
// each token points at the corresponding Bootstrap/Flamingo CSS variable (var names
// follow the LESS @variable convention, e.g. @brand-info -> --brand-info), so the theme
// adopts the running XWiki color theme where present and degrades to the built-in look
// otherwise. Adjust the var names via the `overrides` argument if your instance exposes
// different custom properties.

// Toast tokens fall back to the toast library defaults when the XWiki var is unset.
const XWIKI_TOAST: Partial<ToastTheme> = {
  background: `var(--body-bg, ${defaultToastTheme.background})`,
  text: `var(--text-color, ${defaultToastTheme.text})`,
  radius: `var(--border-radius-base, ${defaultToastTheme.radius})`,
  infoAccent: `var(--brand-info, ${defaultToastTheme.infoAccent})`,
  successAccent: `var(--brand-success, ${defaultToastTheme.successAccent})`,
  warnAccent: `var(--brand-warning, ${defaultToastTheme.warnAccent})`,
  errorAccent: `var(--brand-danger, ${defaultToastTheme.errorAccent})`,
  titleColor: `var(--text-color, ${defaultToastTheme.titleColor})`,
  messageColor: `var(--text-color, ${defaultToastTheme.messageColor})`,
};

// Dialog tokens carry NO inline fallback: when the XWiki var is unset, `var(--x)` computes
// to the guaranteed-invalid value, so the dialog's own built-in fallback (from
// defaultDialogTheme, see dialogs/styles.ts) takes over — keeping those defaults in one
// place. Don't add a fallback here.
const XWIKI_DIALOG: Partial<DialogTheme> = {
  background: "var(--body-bg)",
  text: "var(--text-color)",
  radius: "var(--border-radius-base)",
  primaryBackground: "var(--brand-primary)",
  primaryText: "var(--btn-primary-color)",
  secondaryBackground: "var(--btn-default-bg)",
  secondaryText: "var(--btn-default-color)",
  secondaryBorder: "var(--btn-default-border)",
  dangerBackground: "var(--brand-danger)",
  dangerText: "var(--btn-danger-color)",
  successAccent: "var(--brand-success)",
};

/** A {@link ToastTheme} tuned to XWiki's Flamingo (Bootstrap 3) look. */
export function createXwikiToastTheme(
  overrides: Partial<ToastTheme> = {},
): ToastTheme {
  return createToastTheme({ ...XWIKI_TOAST, ...overrides });
}

/** A {@link DialogTheme} tuned to XWiki's Flamingo (Bootstrap 3) look. */
export function createXwikiDialogTheme(
  overrides: Partial<DialogTheme> = {},
): DialogTheme {
  return createDialogTheme({ ...XWIKI_DIALOG, ...overrides });
}
