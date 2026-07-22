import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";

export const optionStyles = [
  defaultTheme,
  css`
    :host {
      display: block;
      font-family: var(--ui-font-sans);
      font-size: inherit;
    }

    :host([disabled]) {
      pointer-events: none;
    }

    /* Lets an owner (e.g. ui-combobox filtering by typed text) hide a non-matching
       option via the plain hidden attribute — needed because :host's own display:
       block above is an author style and would otherwise win over the UA
       stylesheet's [hidden] display:none rule regardless of specificity. */
    :host([hidden]) {
      display: none;
    }

    .option {
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
      box-sizing: border-box;
      padding: var(--ui-spacing-sm);
      /* Transparent by default (rather than only added on [active]) so the
         border doesn't change the row's size and shift layout when it becomes
         active — same reasoning as ui-combobox's own option rows. */
      border: 2px solid transparent;
      border-radius: var(--ui-radius-sm);
      color: var(--ui-text);
      cursor: pointer;
    }

    :host([disabled]) .option {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .option:hover {
      background: var(--ui-color-neutral-200);
    }

    /* Keyboard-highlighted (see ui-select's #setActive) — distinct from
       [selected], which marks the actual current value regardless of whether
       it's the one currently highlighted. Same primary-fill treatment as
       ui-autocomplete's own active option. */
    :host([active]) .option {
      border-color: var(--ui-color-primary-500);
      background: var(--ui-color-primary-500);
      color: white;
    }

    :host([active]) .check {
      color: inherit;
    }

    :host([selected]) .option {
      font-weight: 600;
    }

    /* Fixed-width slot, always reserved (even when empty) so option labels line
       up whether or not that row is the selected one. */
    .check {
      flex: none;
      width: 1em;
      display: flex;
      color: var(--ui-color-primary-500);
    }

    .label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
];
