import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";

export const dataNavigatorStyles = [
  defaultTheme,
  css`
    :host {
      display: block;
      font-family: var(--ui-font-sans);
      font-size: var(--ui-font-size-md);
      color: var(--ui-text);

      /* selection-appearance="default" (the fallback) */
      --selection-bg: var(--ui-color-gray-200);
      --selection-border: var(--ui-color-gray-400);
    }

    :host([selection-appearance="primary"]) {
      --selection-bg: var(--ui-color-primary-100);
      --selection-border: var(--ui-color-primary-300);
    }

    .header {
      margin-bottom: var(--ui-spacing-md);
    }

    .title {
      font-size: var(--ui-font-size-lg);
      font-weight: 600;
      margin: 0;
    }

    .subtitle {
      font-size: var(--ui-font-size-sm);
      opacity: 0.7;
      margin: 0.25em 0 0;
    }

    .toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: var(--ui-spacing-sm);
    }

    /* ui-input-field brings its own border/background/padding — this only needs
       to size it, not restyle it. */
    .global-filter {
      min-width: 16em;
      font: inherit;
    }

    table {
      width: 100%;
      /* auto (the default) sizes columns from whichever rows happen to be
         rendered right now, so column widths visibly reflow on every page turn
         (or filter) once the current page's content differs from the last.
         fixed makes column widths depend only on the explicit widths below
         (see header.column.getSize() in data-navigator.ts), not row content. */
      table-layout: fixed;
      border-collapse: collapse;
    }

    th,
    td {
      padding: var(--ui-spacing-sm);
      text-align: left;
      border-bottom: 1px solid var(--ui-color-gray-200);
    }

    th {
      font-weight: 600;
      user-select: none;
      white-space: nowrap;
    }

    .sort-button {
      display: inline-flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      font-weight: inherit;
      color: inherit;
      cursor: pointer;
    }

    .sort-icon {
      flex: none;
      display: flex;
      opacity: 0.4;
    }

    .sort-icon.active {
      opacity: 1;
      color: var(--ui-color-primary-500);
    }

    tbody tr:nth-child(even) {
      background: var(--ui-color-gray-50);
    }

    tbody tr:hover {
      background: var(--ui-color-gray-100);
    }

    tbody tr.selected,
    tbody tr.selected:hover {
      background: var(--selection-bg);
    }

    tbody tr.selected td,
    tbody tr.selected th {
      border-top: 1px solid var(--selection-border);
      border-bottom: 1px solid var(--selection-border);
    }

    /* border-collapse resolves same-width/same-style conflicts in the *earlier*
       row's favor, so without this the row just above a selected one would keep
       its plain gray bottom border instead of the selected row's own top border
       winning that shared edge. Making both sides agree on the color (rather than
       fighting over which one wins) fixes it without touching border width, which
       risks the same row-height-on-select bug already fixed once for the
       checkbox's synthesized baseline. */
    tbody tr:has(+ tr.selected) td,
    tbody tr:has(+ tr.selected) th {
      border-bottom-color: var(--selection-border);
    }

    :host([selection-mode="single"]) tbody tr,
    :host([selection-mode="multi"]) tbody tr {
      cursor: pointer;
    }

    /* A fixed width in em (not a widthRatio share like the data columns) so it
       stays a small constant size regardless of how many/wide the other columns
       are; centered so the header's select-all checkbox and each row's own
       checkbox line up on the same horizontal position. */
    .select-cell {
      width: 1.5em;
      padding-inline: var(--ui-spacing-sm);
      text-align: center;
    }

    .empty {
      padding: var(--ui-spacing-lg);
      text-align: center;
      opacity: 0.6;
    }

    .pagination {
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-md);
      margin-top: var(--ui-spacing-md);
      font-size: var(--ui-font-size-sm);
    }

    .page-nav,
    .page-size-group {
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
    }

    .page-label {
      opacity: 0.7;
      white-space: nowrap;
    }

    .page-jump {
      width: 3em;
      text-align: center;
    }

    .separator {
      width: 1px;
      align-self: stretch;
      background: var(--ui-color-gray-500);
    }

    .page-size {
      width: 6em;
    }

    /* Pushes the item range summary to the far end of the bar, past the page-size
       group, whatever width the nav/size controls happen to take up. */
    .page-range {
      margin-inline-start: auto;
      opacity: 0.7;
      white-space: nowrap;
    }

    .page-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2em;
      height: 2em;
      padding: 0;
      border: 1px solid var(--ui-color-gray-300);
      border-radius: var(--ui-radius-sm);
      background: transparent;
      color: inherit;
      cursor: pointer;
    }

    .page-btn:hover:not(:disabled) {
      background: var(--ui-color-gray-100);
    }

    .page-btn:active:not(:disabled) {
      background: var(--ui-color-gray-200);
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: default;
    }
  `,
];
