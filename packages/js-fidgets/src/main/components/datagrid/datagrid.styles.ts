import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";

export const datagridStyles = [
  defaultTheme,
  css`
    :host {
      font-weight: var(--ui-font-weight-normal);
      font-family: var(--ui-font-sans);
      font-size: var(--ui-font-size-sm);
      color: var(--ui-text);
      display: block;
    }

    /* Title/subtitle and the toolbar actions share one row: \`.toolbar\`'s
       \`margin-inline-start: auto\` pushes it to the far end regardless of
       whether \`.header-text\` is present, so actions still end up on the
       right even with no title/subtitle set. Same convention as
       ui-ag-grid's own header. */
    .header {
      display: flex;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: var(--ui-spacing-md);
      padding-block: calc(var(--ui-spacing-sm) * 2);
      margin-bottom: var(--ui-spacing-md);
    }

    .title {
      font-size: var(--ui-font-size-lg);
      font-weight: var(--ui-font-weight-semibold);
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
      gap: var(--ui-spacing-sm);
      margin-inline-start: auto;
    }

    /* The one border/radius around both the table and the pagination bar
       below it, wrapping the pair as a single card — and the anchor for
       \`.loading-overlay\`, which covers this whole panel (table + pagination
       bar), not just the table, while a \`dataSource\` request is in flight. */
    .grid-panel {
      position: relative;
      border: 1px solid var(--ui-color-neutral-200);
      border-radius: var(--ui-radius-sm);
      overflow: hidden;
    }

    /* Dims everything (table + pagination bar) except \`.loading-overlay\`
       itself, which stays at full opacity on top of them. */
    .grid-panel.loading > *:not(.loading-overlay) {
      opacity: 0.25;
    }

    .grid-wrapper {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .table {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    .row {
      display: grid;
      align-items: stretch;
    }

    /* The base cell rule — kept ahead of \`.header-cell\`/\`.filter-cell\`/
       \`.select-cell\` in source order so those more specific rules (equal
       class-selector specificity) reliably win instead of silently losing
       to whichever one happens to sit later in the file. */
    .cell {
      padding: 6px var(--ui-spacing-md);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Column-header row and filter row share one background — same visual
       group as a native <thead>, which .thead's own role="rowgroup" mirrors
       semantically. */
    .thead {
      background: var(--ui-color-neutral-50);
    }

    .header-row {
      flex: none;
      border-bottom: 1px solid var(--ui-color-neutral-200);
      font-weight: var(--ui-font-weight-semibold);
    }

    /* A column separator between header cells — a fixed 1.25em line, not a
       full-height border, centered via inset-block + margin-block: auto so
       it reads as a divider rather than a cell edge. */
    .header-row .cell {
      position: relative;
    }

    .header-row .cell:not(:last-child)::after {
      content: "";
      position: absolute;
      inset-block: 0;
      inset-inline-end: 0;
      margin-block: auto;
      width: 2px;
      height: 1.25em;
      background: var(--ui-color-neutral-200);
    }

    .header-cell {
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
      padding: 0.75em var(--ui-spacing-md);
      overflow: hidden;
      user-select: none;
    }

    .header-cell-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header-cell.sortable {
      cursor: pointer;
    }

    .sort-icon {
      flex: none;
      display: flex;
      font-size: 1.6em;
      opacity: 0.6;
    }

    .filter-row {
      flex: none;
      border-bottom: 1px solid var(--ui-color-neutral-200);
    }

    .filter-cell {
      padding: var(--ui-spacing-sm) var(--ui-spacing-md);
    }

    .filter-cell ui-text-field,
    .filter-cell ui-select {
      width: 100%;
    }

    .body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    .body-row {
      border-bottom: 1px solid var(--ui-color-neutral-200);
    }

    .body-row:last-child {
      border-bottom: none;
    }

    /* Selected/hovered rows are always this grayish neutral tint — unlike
       ui-ag-grid, there's no \`selectionAppearance\` choice here; this is
       meant to stay the simple option. */
    .body-row.selected {
      background: color-mix(in srgb, var(--ui-color-neutral-500) 12%, var(--ui-bg));
    }

    :host([selection-mode="single"]) .body-row,
    :host([selection-mode="multi"]) .body-row {
      cursor: pointer;
    }

    :host([selection-mode="single"]) .body-row:hover,
    :host([selection-mode="multi"]) .body-row:hover {
      background: color-mix(in srgb, var(--ui-color-neutral-500) 6%, var(--ui-bg));
    }

    .body-row.selected:hover {
      background: color-mix(in srgb, var(--ui-color-neutral-500) 16%, var(--ui-bg));
    }

    .select-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .empty-message {
      padding: var(--ui-spacing-md);
      text-align: center;
      opacity: 0.6;
    }

    /* Delayed 200ms past a \`dataSource\` request's start (see
       showLoadingSpinner in datagrid.ts) so a fast request never flashes
       this. */
    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }

    .spinner {
      width: 4em;
      height: 4em;
      box-sizing: border-box;
      border: 6px solid color-mix(in srgb, currentColor 20%, transparent);
      border-top-color: var(--ui-color-neutral-500);
      border-radius: 50%;
      animation: datagrid-spin 0.75s linear infinite;
    }

    @keyframes datagrid-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    /* Hand-rolled pagination bar — no third-party grid engine's own bar to
       lean on here. */
    /* One shared font-size for the whole bar — the nav buttons, "Page"/"of
       N" labels, and the page number field all size off this one value
       (\`1em\`, see their own rules) rather than each hardcoding a pixel size
       that'd drift out of sync with the others. */
    .pagination-bar {
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-md);
      padding: calc(var(--ui-spacing-sm) * 2) var(--ui-spacing-md);
      border-top: 1px solid var(--ui-color-neutral-200);
      font-size: var(--ui-font-size-md);
    }

    /* Sits before \`.page-size-group\` (whose own auto margin pushes
       everything from there on to the right), so this is the one thing
       left pinned to the bar's near edge. */
    .selection-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35em;
      padding: 0.2em 0.6em;
      border-radius: 999px;
      background: var(--ui-color-neutral-100);
      color: var(--ui-color-neutral-700);
      font-size: 0.9em;
      font-weight: var(--ui-font-weight-semibold);
      white-space: nowrap;
    }

    /* Pushed to the far end of the bar via its own auto margin, rather than
       \`.page-range\`'s — so the size picker, the range text, and the nav
       buttons that follow all end up grouped together on the right, instead
       of the size picker sitting alone on the left. */
    .page-size-group {
      margin-inline-start: auto;
    }

    .page-size-group,
    .page-nav {
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
    }

    .page-label {
      opacity: 0.7;
      white-space: nowrap;
    }

    .page-size {
      --select-min-width: 4.5em;
    }

    .page-range {
      margin-inline: var(--ui-spacing-md);
      opacity: 0.7;
      white-space: nowrap;
    }

    .page-input {
      width: 3em;
    }
  `,
];
