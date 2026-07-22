import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";

export const selectStyles = [
  defaultTheme,
  css`
    :host {
      display: inline-block;
      position: relative;
      vertical-align: middle;
      font-family: var(--ui-font-sans);

      /* size="medium" (the default) */
      font-size: var(--ui-font-size-md);
      --select-padding-block: var(--ui-spacing-sm);
      --select-padding-inline: var(--ui-spacing-md);
    }

    :host([size="small"]) {
      font-size: var(--ui-font-size-sm);
      --select-padding-block: 2px;
      --select-padding-inline: var(--ui-spacing-sm);
    }

    :host([size="large"]) {
      font-size: var(--ui-font-size-lg);
      --select-padding-block: var(--ui-spacing-md);
      --select-padding-inline: var(--ui-spacing-md);
    }

    :host([disabled]) {
      cursor: not-allowed;
    }

    .trigger {
      all: unset;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
      min-width: 12em;
      padding-block: var(--select-padding-block);
      padding-inline: var(--select-padding-inline);
      border: 1px solid var(--ui-color-neutral-600);
      border-radius: var(--ui-radius-sm);
      background: var(--ui-bg);
      color: var(--ui-text);
      font: inherit;
      cursor: pointer;
    }

    .trigger:focus-visible {
      outline: 2px solid var(--ui-color-primary-500);
      outline-offset: 2px;
    }

    :host([disabled]) .trigger {
      opacity: 0.55;
      cursor: not-allowed;
    }

    :host([invalid]) .trigger {
      border-color: var(--ui-color-danger-500);
    }

    .value {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: start;
    }

    .value.placeholder {
      opacity: 0.6;
    }

    .chevron {
      flex: none;
      display: flex;
      opacity: 0.6;
      transition: transform 120ms ease;
    }

    .chevron-open {
      transform: rotate(180deg);
    }

    .listbox {
      position: absolute;
      inset-inline: 0;
      z-index: 1;
      margin: 0;
      padding-block: var(--ui-spacing-sm);
      padding-inline: var(--ui-spacing-sm);
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
  `,
];
