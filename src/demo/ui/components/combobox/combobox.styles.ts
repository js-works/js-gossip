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
    }

    :host([size="small"]) {
      font-size: var(--ui-font-size-sm);
      --combobox-padding-block: 2px;
    }

    :host([size="large"]) {
      font-size: var(--ui-font-size-lg);
      --combobox-padding-block: 8px;
    }

    .wrapper {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ui-spacing-sm);
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

    /* dropdown mode (readonly): pick-only, not really "text editing", so a
       pointer cursor and no blinking caret read more like a select than a field. */
    input:read-only {
      cursor: pointer;
      caret-color: transparent;
    }

    /* Fixed-width slot, always in the layout (even when idle) so its appearance
       while loading doesn't shift the input's width. */
    .spinner-slot {
      flex: none;
      width: 1em;
      margin-inline-end: var(--ui-spacing-md);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      width: 1em;
      height: 1em;
      box-sizing: border-box;
      border: 2px solid color-mix(in srgb, currentColor 20%, transparent);
      border-top: 2px solid var(--ui-color-primary-500);
      border-radius: 50%;
      animation: combobox-spin 0.75s linear infinite;
    }

    @keyframes combobox-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .listbox {
      position: absolute;
      inset-inline: 0;
      z-index: 1;
      margin: 0;
      padding-block: var(--ui-spacing-sm);
      padding-inline: var(--ui-spacing-sm);
      list-style: none;
      max-height: calc(16em + var(--ui-spacing-sm) * 2);
      overflow-y: auto;
      box-sizing: border-box;
      background: var(--ui-bg);
      color: var(--ui-text);
      border: 1px solid var(--ui-color-neutral-300);
      border-radius: var(--ui-radius-sm);
      box-shadow:
        0 10px 25px -5px rgba(0, 0, 0, 0.2),
        0 4px 8px -4px rgba(0, 0, 0, 0.15);
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

    li[role="option"] {
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
      box-sizing: border-box;
      padding: var(--ui-spacing-sm);
      /* Transparent by default (rather than only added on .active) so the border
         doesn't change the row's size and shift layout when it becomes active. */
      border: 2px solid transparent;
      border-radius: var(--ui-radius-sm);
      cursor: pointer;
    }

    li[role="option"][aria-selected="true"] {
      font-weight: 600;
    }

    li[role="option"].active {
      border-color: var(--ui-color-primary-500);
    }

    /* Fixed-width slot, always reserved (even when empty) so option labels line up
       whether or not that row is the selected one. */
    .check {
      flex: none;
      width: 1em;
      display: flex;
      color: var(--ui-color-primary-500);
    }

    .separator {
      padding: var(--ui-spacing-sm) var(--ui-spacing-sm) 0;
      font-size: var(--ui-font-size-sm);
      opacity: 0.6;
    }

    .status {
      position: absolute;
      inset-inline: 0;
      padding: var(--ui-spacing-sm);
      font-size: var(--ui-font-size-sm);
      opacity: 0.7;
    }

    .status-bottom {
      top: calc(100% + 2px);
    }

    .status-top {
      bottom: calc(100% + 2px);
    }
  `,
];
