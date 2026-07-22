import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";

export const dataNavigatorStyles = [
  defaultTheme,
  css`
    :host {
      display: flex;
      flex-direction: column;
      max-height: 600px;
      font-family: var(--ui-font-sans);
      font-size: var(--ui-font-size-md);
      color: var(--ui-text);

      /* selection-appearance="default" (the fallback) */
      --selection-bg: var(--ui-color-neutral-200);
      --selection-border: var(--ui-color-neutral-400);
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
      align-items: center;
      justify-content: space-between;
      gap: var(--ui-spacing-sm);
      margin-bottom: var(--ui-spacing-sm);
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
    }

    /* ui-input-field brings its own border/background/padding — this only needs
       to size it, not restyle it, beyond dropping the top/left/right border for
       an underline look (--field-border-* pierces its shadow root as plain
       custom properties). */
    .global-filter {
      min-width: 16em;
      font: inherit;
      --field-border-block-start: none;
      --field-border-inline: none;
      --field-border-radius: 0;
    }

    /* The scrollable middle: grows to fill whatever space :host's max-height
       leaves after the header/toolbar/pagination, and is the only part that
       scrolls when the table's natural height doesn't fit — everything else
       (title, search, pagination) stays put. */
    .table-scroll {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }

    table {
      width: 100%;
      /* auto (the default) sizes columns from whichever rows happen to be
         rendered right now, so column widths visibly reflow on every page turn
         (or filter) once the current page's content differs from the last.
         fixed makes column widths depend only on the explicit widths below
         (see header.column.getSize() in data-navigator.ts), not row content. */
      table-layout: fixed;
      /* Not collapse: position: sticky on <th>/<td> silently does nothing when
         the table uses border-collapse: collapse (a longstanding browser
         limitation) — needed for the sticky header below. */
      border-collapse: separate;
      border-spacing: 0;
    }

    th,
    td {
      padding-block: var(--ui-spacing-sm);
      text-align: left;
      border-bottom: 1px solid var(--ui-color-neutral-200);
      /* table-layout: fixed gives every cell a fixed width, so content that's
         too wide for it (a long email, a narrowed column, …) needs to
         truncate rather than wrap the row taller or overflow into the next
         cell. */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    td {
      padding-inline: var(--ui-spacing-md);
    }

    /* border-collapse: separate (needed for the sticky header below) means
       adjacent cells never merge a shared edge into one line the way collapse
       does — giving every cell a full 4-side border would double up to 2px at
       every internal boundary. Each cell instead draws only its top+left edge;
       its right/bottom neighbor's own top/left edge is what closes the shared
       line, so only the truly outer right/bottom edges of the header need
       drawing explicitly (below, and via .spans-to-bottom for a rowspan cell
       like "Name" that reaches the last row without living in it). */
    th {
      padding-inline: var(--ui-spacing-sm);
      font-weight: 600;
      user-select: none;
      text-align: center;
      border-block-start: 1px solid var(--ui-color-neutral-300);
      border-inline-start: 1px solid var(--ui-color-neutral-300);
    }

    thead th:last-child {
      border-inline-end: 1px solid var(--ui-color-neutral-300);
    }

    thead tr:last-child th,
    th.spans-to-bottom {
      border-block-end: 1px solid var(--ui-color-neutral-300);
    }

    /* Stays put while tbody rows scroll past underneath it inside .table-scroll.
       Applied to the cells themselves (not <thead>/<tr>) since sticky positioning
       on table-header-group/table-row boxes isn't reliably supported — sticky
       <th>/<td> cells are the well-supported form of this pattern. An opaque
       background is required so scrolled-past row content doesn't show through. */
    thead th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--ui-bg);
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
      background: var(--ui-color-neutral-50);
    }

    tbody tr:hover {
      background: var(--ui-color-neutral-100);
    }

    tbody tr.selected,
    tbody tr.selected:hover {
      background: var(--selection-bg);
    }

    /* inset box-shadow instead of border: a real border adds to the cell's
       box (growing the row by 2px vs. unselected rows), while an inset
       shadow paints on top of the existing box without affecting layout.
       Only the bottom edge is drawn by default so two adjacent selected
       rows share a single 1px line at their boundary (collapsed) instead of
       each contributing their own edge there; the top edge is added back
       only for a block's first row, so a contiguous selection gets one
       clean outline rather than a line between every row inside it. */
    tbody tr.selected td,
    tbody tr.selected th {
      box-shadow: inset 0 -1px 0 0 var(--selection-border);
    }

    tbody tr.selected:first-child td,
    tbody tr.selected:first-child th,
    tbody tr:not(.selected) + tr.selected td,
    tbody tr:not(.selected) + tr.selected th {
      box-shadow:
        inset 0 1px 0 0 var(--selection-border),
        inset 0 -1px 0 0 var(--selection-border);
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
      width: 3em;
      padding-inline: var(--ui-spacing-sm);
      text-align: center;
      vertical-align: middle;
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
      flex: none;
      width: 3em;
      text-align: center;
    }

    .separator {
      width: 1px;
      align-self: stretch;
      background: var(--ui-color-neutral-500);
    }

    .page-size {
      --select-min-width: 6em;
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
      border: none;
      border-radius: var(--ui-radius-sm);
      background: transparent;
      color: inherit;
    }

    .page-btn:not(:disabled) {
      cursor: pointer;
    }

    .page-btn:hover:not(:disabled) {
      background: var(--ui-color-neutral-100);
    }

    .page-btn:active:not(:disabled) {
      background: var(--ui-color-neutral-200);
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: default;
    }
  `,
];
