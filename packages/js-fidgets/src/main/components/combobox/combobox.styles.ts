import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";

export const comboboxStyles = [
  defaultTheme,
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

    .wrapper {
      position: relative;
      display: flex;
      flex-wrap: wrap;
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

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex: none;
      background: transparent;
      color: var(--ui-color-primary-500);
      border: 1px solid var(--ui-color-primary-500);
      border-radius: 3px;
      padding: 2px var(--ui-spacing-sm);
      font-size: var(--ui-font-size-sm);
      line-height: 1.4;
    }

    .pill-remove {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      line-height: 1;
      padding: 0;
      cursor: pointer;
      opacity: 0.7;
    }

    .pill-remove:hover {
      opacity: 1;
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

    /* Same toggle-affordance chevron (and open-state rotation) as ui-select's
       trigger. */
    .chevron {
      flex: none;
      display: flex;
      align-items: center;
      margin-inline-end: var(--ui-spacing-md);
      opacity: 0.6;
      cursor: pointer;
      transition: transform 120ms ease;
    }

    .chevron-open {
      transform: rotate(180deg);
    }

    /* Shared "floating popup card" look for both the real listbox and the
       no-matches status message — they're the same popup, just with
       different content, so they shouldn't read as two different surfaces. */
    .listbox,
    .status {
      position: absolute;
      inset-inline: 0;
      z-index: 1;
      box-sizing: border-box;
      background: var(--ui-bg);
      color: var(--ui-text);
      border: 1px solid var(--ui-color-neutral-300);
      border-radius: var(--ui-radius-sm);
      box-shadow:
        0 10px 25px -5px rgba(0, 0, 0, 0.2),
        0 4px 8px -4px rgba(0, 0, 0, 0.15);
    }

    .listbox {
      margin: 0;
      padding-block: var(--ui-spacing-sm);
      padding-inline: var(--ui-spacing-sm);
      max-height: calc(16em + var(--ui-spacing-sm) * 2);
      overflow-y: auto;
    }

    .listbox[hidden] {
      display: none;
    }

    .listbox-bottom {
      top: calc(100% + 2px);
    }

    .listbox-top {
      bottom: calc(100% + 2px);
    }

    .status {
      padding-block: var(--ui-spacing-sm);
      padding-inline: var(--ui-spacing-md);
      font-size: 1em;
    }

    .status-bottom {
      top: calc(100% + 2px);
    }

    .status-top {
      bottom: calc(100% + 2px);
    }
  `,
];
