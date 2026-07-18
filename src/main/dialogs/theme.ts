// -------------------------------------------------------------------
// Dialog theme: the tokens the dialog chrome understands. Build one with
// createDialogTheme() and pass it as `theme` to createDialogsController.
//
// NOTE (interim): tokens are currently applied via `--dialog-*` CSS custom properties
// set on the dialog element (see dialogs/controller.ts + dialogs/styles.ts). That
// mechanism is slated to change — values will be baked straight into the generated
// stylesheet so the core defines no js-gossip custom properties — but the public shape
// here (DialogTheme / defaultDialogTheme / createDialogTheme) is intended to stay.
// -------------------------------------------------------------------

/** Theme tokens for dialogs. Every token is a CSS value string. */
export interface DialogTheme {
  background: string;
  text: string;
  radius: string;
  primaryText: string;
  primaryBackground: string;
  secondaryText: string;
  secondaryBackground: string;
  secondaryBorder: string;
  dangerText: string;
  dangerBackground: string;
  /** Colour of the (rarely used) success button variant. */
  successAccent: string;
  closeRadius: string;
  actionRadius: string;
}

/**
 * Built-in dialog defaults — dark-mode-aware surface via `light-dark(...)`, with the
 * host design system's `--ui-*` tokens passed through where present.
 */
export const defaultDialogTheme: DialogTheme = {
  background: "light-dark(white, #333)",
  text: "light-dark(black, white)",
  radius: "4px",
  primaryText: "var(--ui-surface, #ffffff)",
  primaryBackground: "var(--ui-color-primary-500, #0071ec)",
  secondaryText: "var(--ui-text, #1f2430)",
  secondaryBackground: "white",
  secondaryBorder: "#b0b0b0",
  dangerText: "white",
  dangerBackground: "#dc3146",
  successAccent: "var(--ui-color-success-500, #00883c)",
  closeRadius: "100%",
  actionRadius: "3px",
};

/** Merge partial tokens over {@link defaultDialogTheme} to produce a full DialogTheme. */
export function createDialogTheme(
  overrides?: Partial<DialogTheme>,
): DialogTheme {
  return { ...defaultDialogTheme, ...overrides };
}
