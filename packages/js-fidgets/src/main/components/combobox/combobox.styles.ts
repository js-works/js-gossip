import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";
import { pillsStyles } from "../../shared/pills/pills.js";

export const comboboxStyles = [
  defaultTheme,
  pillsStyles,
  css`
    :host {
      display: inline-block;
      position: relative;

      /* size="medium" (the default) */
      font-size: var(--ui-font-size-md);
      --combobox-padding-block: var(--ui-spacing-sm);
      /* Overridable by a consumer that needs a narrower field. */
      --combobox-min-width: 12em;
    }

    :host([size="small"]) {
      font-size: var(--ui-font-size-sm);
      --combobox-padding-block: 2px;
    }

    :host([size="large"]) {
      font-size: var(--ui-font-size-lg);
      --combobox-padding-block: 8px;
    }

    :host([disabled]) {
      cursor: not-allowed;
    }

    /* Two columns: .content (pills/input, flex-grow, wraps its own lines
       independently) and .chevron (fixed, pinned to the end) — kept as
       separate flex items of a non-wrapping row so the chevron always stays
       put as its own column, vertically centered, instead of flowing into
       .content's own wrap (which would otherwise drag it down onto a
       trailing line alongside whichever pill last wrapped). */
    .wrapper {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
      min-width: var(--combobox-min-width);
      padding-block: var(--combobox-padding-block);
      box-sizing: border-box;
      border: 1px solid var(--ui-color-neutral-600);
      border-radius: var(--ui-radius-sm);
      background: var(--ui-bg);
      color: var(--ui-text);
    }

    .content {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ui-spacing-sm);
      flex: 1;
      min-width: 0;
    }

    .wrapper:has(.pill) {
      padding-inline-start: var(--ui-spacing-sm);
    }

    :host([disabled]) .wrapper {
      opacity: 0.55;
      cursor: not-allowed;
    }

    :host([invalid]) .wrapper {
      border-color: var(--ui-color-danger-500);
    }

    input {
      flex: 1;
      min-width: 0;
      box-sizing: border-box;
      padding-block: 0;
      padding-inline: var(--ui-spacing-md);
      font-family: var(--ui-font-sans);
      font-size: inherit;
      border: none;
      background: transparent;
      color: inherit;
    }

    input:focus {
      outline: none;
    }

    input:disabled {
      cursor: not-allowed;
    }

    /* Padding is deliberately symmetric — asymmetric padding here would put
       the icon visibly off-center within its own box, not just relative to
       .wrapper as a whole. .chevron-icon is a second, tight inner wrapper
       (sized to exactly the icon) carrying the open/close rotation, so it
       always spins around the icon's own true center regardless of
       whatever padding/stretch this outer box has. */
    .chevron {
      flex: none;
      align-self: stretch;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-inline: 0.5em;
      opacity: 0.6;
      cursor: pointer;
    }

    .chevron-icon {
      display: flex;
      transition: transform 120ms ease;
    }

    .chevron-icon.chevron-open {
      transform: rotate(180deg);
    }

    /* The floating popup card — holds either the real listbox or the
       no-matches status message. Positioning (position/inset/z-index/
       max-height/display/flex-direction/overflow/top or bottom) is set
       directly as inline styles on this element by
       shared/popup-layout/popup-layout.ts's trackPopupLayout (see
       combobox.ts's firstUpdated()) — this rule only adds the visual
       theming. */
    .popup {
      background: var(--ui-bg);
      color: var(--ui-text);
      border: 1px solid var(--ui-color-neutral-300);
      border-radius: var(--ui-radius-sm);
      box-shadow:
        0 10px 25px -5px rgba(0, 0, 0, 0.2),
        0 4px 8px -4px rgba(0, 0, 0, 0.15);
    }

    .listbox {
      flex: 1;
      min-height: 0;
      margin: 0;
      padding-block: var(--ui-spacing-sm);
      padding-inline: var(--ui-spacing-sm);
      overflow-y: auto;
      box-sizing: border-box;
    }

    .status {
      padding-block: var(--ui-spacing-sm);
      padding-inline: var(--ui-spacing-md);
      font-size: 1em;
    }
  `,
];
