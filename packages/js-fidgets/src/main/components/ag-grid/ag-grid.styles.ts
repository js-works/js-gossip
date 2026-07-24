import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";

export const agGridStyles = [
  defaultTheme,
  css`
    :host {
      font-weight: var(--ui-font-weight-normal);
      display: block;
      /* "neutral" (AgGrid.selectionAppearance's default) — read by the
         \`theme\` object's \`selectedRowBackgroundColor\`/\`rowHoverColor\` in
         ag-grid.ts, and by the selected/hovered-row border-color rule
         further below, so all three switch together. */
      --ag-grid-row-accent: var(--ui-color-neutral-500);
    }

    :host([selection-appearance="primary"]) {
      --ag-grid-row-accent: var(--ui-color-primary-500);
    }

    /* HeaderSelectAll/RowSelectionCheckbox (ag-grid.ts) render this
       library's own ui-checkbox via selectionColumnDef's headerComponent/
       cellRenderer — but that only *adds* a renderer; it doesn't stop AG
       Grid from also rendering its own native checkbox markup as a
       separate prefix in the same header cell/row cell (checkboxes: true/
       headerCheckbox: true, needed regardless to keep the selection column
       itself enabled and AG Grid's own row-selection integration — ARIA,
       keyboard, column existence — intact). Hiding both here is simpler
       than trying to thread \`checkboxes\`/\`headerCheckbox\` false without
       also losing the column entirely (isEnabled() in ag-grid-community's
       own selectionColService requires at least one of them true). */
    .grid .ag-selection-checkbox,
    .grid .ag-header-select-all {
      display: none;
    }

    /* AG Grid renders its own chrome (header, rows, filter menus, pagination
       bar) via the Theming API (see the \`theme\` object in ag-grid.ts) — this
       only needs to size the container it's given, not restyle anything. */
    .grid-wrapper {
      position: relative;
    }

    .grid {
      width: 100%;
    }

    /* Covers the whole grid (header + rows + pagination bar), not just the
       row area — AG Grid renders all three as one DOM tree inside \`.grid\`,
       so there's no seam to overlay only the rows without reaching into AG
       Grid's own internal class names. Shown/hidden by \`showLoadingSpinner\`
       (ag-grid.ts), which is itself delayed 200ms past a \`dataSource\`
       request's start so a fast request never flashes it.
       z-index 3, not 1: AG Grid's own pinned columns
       (\`.ag-grid-pinned-left-cells\`/\`.ag-grid-pinned-right-cells\` — where
       the selection checkbox column lives) are \`position: sticky; z-index:
       2\`, so they'd otherwise stay stacked above this overlay and keep
       showing checkboxes for a moment after the rest of the row content is
       already hidden underneath it. */
    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ui-bg);
      z-index: 3;
    }

    .spinner {
      width: 2em;
      height: 2em;
      box-sizing: border-box;
      border: 3px solid color-mix(in srgb, currentColor 20%, transparent);
      border-top-color: var(--ui-color-neutral-500);
      border-radius: 50%;
      animation: ag-grid-spin 0.75s linear infinite;
    }

    @keyframes ag-grid-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    /* Title/subtitle (ui-data-navigator's own text styling — AG Grid has no
       header concept of its own beyond column headers, so this component
       renders both) and the toolbar actions share one row: \`.toolbar\`'s
       \`margin-inline-start: auto\` pushes it to the far end regardless of
       whether \`.header-text\` is present, so actions still end up on the
       right even with no title/subtitle set. */
    .header {
      display: flex;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: var(--ui-spacing-md);
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
      gap: var(--ui-spacing-sm);
      margin-inline-start: auto;
    }

    /* Both floating filters (SimpleFloatingFilter/CategoryFloatingFilter in
       ag-grid.ts) mount a real \`ui-text-field\`/\`ui-select\` — each already
       themed via defaultTheme, so all that's needed here is making them fill
       whatever width AG Grid's floating filter cell gives them. */
    .grid ui-text-field,
    .grid ui-select {
      width: 100%;
    }

    /* A selected or hovered row's top/bottom edge, a shade darker than the
       \`--ag-grid-row-accent\` tints \`selectedRowBackgroundColor\`/
       \`rowHoverColor\` (the \`theme\` object in ag-grid.ts) put on its
       background — same variable, so this stays in step whether
       \`selectionAppearance\` is "neutral" or "primary". Every row already
       gets a plain neutral divider line as
       \`border-bottom\` on its own content containers
       (\`.ag-grid-scrolling-cells\`/\`.ag-grid-pinned-*-cells\`, AG Grid's own
       direct children of \`.ag-row\`) — there's no separate border-top
       anywhere, so what reads as a row's "top" edge is really the border-
       bottom of the row above it. Recoloring just \`border-bottom-color\`
       (rather than layering a second line, e.g. via box-shadow) keeps this a
       single divider — on the selected/hovered row itself for its own
       bottom edge, and on \`:has(+ .ag-row-selected, .ag-row-hover)\` — the
       row immediately before it — for what reads as its top edge. */
    .grid .ag-row-selected > .ag-grid-scrolling-cells,
    .grid .ag-row-selected > .ag-grid-pinned-left-cells,
    .grid .ag-row-selected > .ag-grid-pinned-right-cells,
    .grid .ag-row-hover > .ag-grid-scrolling-cells,
    .grid .ag-row-hover > .ag-grid-pinned-left-cells,
    .grid .ag-row-hover > .ag-grid-pinned-right-cells,
    .grid .ag-row:has(+ .ag-row-selected) > .ag-grid-scrolling-cells,
    .grid .ag-row:has(+ .ag-row-selected) > .ag-grid-pinned-left-cells,
    .grid .ag-row:has(+ .ag-row-selected) > .ag-grid-pinned-right-cells,
    .grid .ag-row:has(+ .ag-row-hover) > .ag-grid-scrolling-cells,
    .grid .ag-row:has(+ .ag-row-hover) > .ag-grid-pinned-left-cells,
    .grid .ag-row:has(+ .ag-row-hover) > .ag-grid-pinned-right-cells {
      border-bottom-color: color-mix(
        in srgb,
        var(--ag-grid-row-accent) 45%,
        var(--ui-bg)
      );
    }
  `,
];
