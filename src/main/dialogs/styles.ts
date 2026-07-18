// -------------------------------------------------------------------
// # Styles & timing
// -------------------------------------------------------------------

import { defaultDialogTheme } from "./theme.js";

// Interim application mechanism: each token is a `--dialog-*` custom property (set from
// the controller's `theme` option, see createDialogsController) whose inline fallback is
// the built-in default from `defaultDialogTheme` — a single source. (Slated to change to
// baking values straight into the generated stylesheet; see dialogs/theme.ts.)
const theme = {
  textColor: `var(--dialog-text, ${defaultDialogTheme.text})`,
  primaryTextColor: `var(--dialog-primary-text, ${defaultDialogTheme.primaryText})`,
  primaryBackgroundColor: `var(--dialog-primary-background, ${defaultDialogTheme.primaryBackground})`,
  secondaryTextColor: `var(--dialog-secondary-text, ${defaultDialogTheme.secondaryText})`,
  secondaryBackgroundColor: `var(--dialog-secondary-background, ${defaultDialogTheme.secondaryBackground})`,
  secondaryBorderColor: `var(--dialog-secondary-border, ${defaultDialogTheme.secondaryBorder})`,
  dangerTextColor: `var(--dialog-danger-text, ${defaultDialogTheme.dangerText})`,
  dangerBackgroundColor: `var(--dialog-danger-background, ${defaultDialogTheme.dangerBackground})`,
  successColor: `var(--dialog-success-accent, ${defaultDialogTheme.successAccent})`,
  dialogBorderRadius: `var(--dialog-radius, ${defaultDialogTheme.radius})`,
  closeButtonBorderRadius: `var(--dialog-close-radius, ${defaultDialogTheme.closeRadius})`,
  actionButtonBorderRadius: `var(--dialog-action-radius, ${defaultDialogTheme.actionRadius})`,
  dialogBackgroundColor: `var(--dialog-background, ${defaultDialogTheme.background})`,
} as const;

// Duration of the notice appear/disappear (collapse) animation. Drives both the CSS
// transition and the JS timer that removes the element after the collapse finishes.
export const NOTICE_ANIM_MS = 350;

// Duration of the dialog grow-in (entrance) and fade-out (close) animations.
export const DIALOG_ANIM_MS = 200;

// Duration of the quick fade-out when swapping one on-screen dialog for the next within
// a scope (the backdrop stays up; only the box content changes, then grows back in).
export const SWAP_OUT_MS = 140;

// If nothing opens within this delay, a round spinner dialog is shown as a placeholder.
export const SPINNER_DIALOG_DELAY_MS = 300;

// Delay before an action button's inline spinner appears once its handler is running.
export const BUTTON_SPINNER_DELAY_MS = 150;

// Belt-and-braces close timeout in case the close animation's `animationend` never fires.
export const CLOSE_ANIMATION_FALLBACK_MS = DIALOG_ANIM_MS + 100;

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
    padding: 0.5em 0.5em 0.5em 0.9em;
    border-radius: 2px;
    background-color: light-dark(#f4f4f4, #3d3d3d);
    color: ${theme.textColor};
    font-size: 0.9;
    line-height: 1.25;
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
    width: 0.15em;
    border-radius: 0.125em;
    background: transparent;
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

export const STYLE_TEXT = dialogStyles + placeholderStyles;
