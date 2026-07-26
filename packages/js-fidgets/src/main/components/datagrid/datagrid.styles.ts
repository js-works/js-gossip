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
      /* "neutral" (DataGrid.selectionAppearance's default) — read by every
         selected/hovered-row background rule below, so they all switch
         together. Same pattern as ui-ag-grid's own --ag-grid-row-accent. */
      --datagrid-row-accent: var(--ui-color-neutral-500);
    }

    :host([selection-appearance="primary"]) {
      --datagrid-row-accent: var(--ui-color-primary-500);
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

    .header-row .cell {
      position: relative;
    }

    /* inset-block (not a fixed height + margin-block: auto) so the line
       grows with whatever height its own cell actually has — a standalone
       column's cell spans both header rows already (tall), so this alone
       reads as full-height for it. A group's own cell and its children
       *don't* each span both rows though (the group's cell is row 1 only,
       its children row 2 only) — drawing this same per-cell divider on
       both would produce two independently-inset segments with a visible
       gap between them where the rows meet, rather than one continuous
       line. Those two cases (.group-header-cell, a group's last child)
       opt out below and get the continuous .header-divider element
       instead. */
    .header-row .cell:not(:last-child)::after {
      content: "";
      position: absolute;
      inset-block: 0.5em;
      inset-inline-end: 0;
      width: 2px;
      background: var(--ui-color-neutral-200);
    }

    /* Grouped columns get a thinner divider — set once here rather than
       per-cell, so it can't drift out of sync between the group's own
       divider and its children's. */
    .header-row.grouped .cell:not(:last-child)::after {
      width: 1px;
    }

    /* Opts out of the per-cell divider above — see that rule's own doc for
       why these two specifically would otherwise draw one broken half of a
       divider each instead of one continuous line. */
    .header-row .cell.group-header-cell::after,
    .header-row .cell.group-child-last::after {
      content: none;
    }

    /* No divider between the checkbox and expander header cells specifically
       — they read as one combined leading gutter rather than two separate
       columns, unlike every other adjacent pair of header cells. */
    .header-row .cell.select-cell:has(+ .expander-cell)::after {
      content: none;
    }

    /* Explicitly transparent (not the \`.thead\` neutral-50 tint some other
       header cell might end up with) — the checkbox/expander/actions header
       cells are the three "non-data" columns and stay plain. */
    .header-row .select-cell,
    .header-row .expander-cell,
    .header-row .actions-header-cell {
      background: transparent;
    }

    /* The continuous replacement for the two opted-out halves above — a
       single element (not nested in either cell) placed directly on the
       header row's own grid, spanning both header rows in one piece. Same
       sizing/inset convention as the per-cell divider (0.5em inset, 2px/1px
       width) so it's indistinguishable from it other than not being split. */
    .header-divider {
      grid-row: 1 / 3;
      width: 2px;
      margin-block: 0.5em;
      align-self: stretch;
      justify-self: start;
      background: var(--ui-color-neutral-200);
    }

    .header-row.grouped .header-divider {
      width: 1px;
    }

    .header-cell {
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
      padding: 0.75em var(--ui-spacing-md);
      overflow: hidden;
      user-select: none;
    }

    /* A group's own header, spanning its children's combined width in the
       first header row — left-aligned, same as every other header cell, and
       never sortable (no single field to sort by). The bottom border marks
       the boundary with its children's own row below, the same way
       \`.header-row\`'s own border-bottom marks the boundary with whatever
       comes after the whole header. */
    .group-header-cell {
      border-bottom: 1px solid var(--ui-color-neutral-200);
      cursor: default;
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

    /* Reserved transparent (not omitted) on both, so a selected/hovered
       row's own left/right edge (below) is a pure color change rather than
       one that also nudges the row's width by the border's own space. */
    .body-row,
    .row-details {
      border-inline: 1px solid transparent;
    }

    /* A row's own trailing border, not \`.row-details\`'s (added below) — the
       actual last element in \`.body\` is whichever of the two a given row
       ends with, so both are covered here to avoid a doubled line against
       \`.grid-panel\`'s own outer border. */
    .body-row:last-child,
    .row-details:last-child {
      border-bottom: none;
    }

    /* Selected/hovered rows are tinted with --datagrid-row-accent (neutral
       gray by default, primary when \`selectionAppearance="primary"\` —
       see :host above). */
    .body-row.selected {
      background: color-mix(in srgb, var(--datagrid-row-accent) 12%, var(--ui-bg));
    }

    /* A selected row's left/right edge — unlike the top/bottom edge below,
       always the row's own (\`.row-details\` picks this up too, via its own
       \`.selected\` class, so an expanded panel's sides match its row's). */
    .body-row.selected,
    .row-details.selected {
      border-inline-color: color-mix(in srgb, var(--datagrid-row-accent) 45%, var(--ui-bg));
    }

    /* A selected row's top/bottom edge, a shade darker than its own
       background tint above — same variable, so it stays in step whether
       \`selectionAppearance\` is "neutral" or "primary". \`.body-row.selected\`
       covers its own bottom edge; what reads as its *top* edge is really
       the border-bottom of whatever comes immediately before it, so that's
       recolored instead — which one that is depends on whether the row
       above has \`rowDetails\`, and whether that panel is currently expanded
       (an expanded panel's own border-bottom is the real visual boundary;
       collapsed, it has none, so the row above's own border-bottom still
       is). */
    .body-row.selected,
    .body-row:has(+ .body-row.selected),
    .body-row:has(+ .row-details:not(.expanded) + .body-row.selected),
    .row-details.expanded:has(+ .body-row.selected) {
      border-bottom-color: color-mix(in srgb, var(--datagrid-row-accent) 45%, var(--ui-bg));
    }

    /* The first/last row's own "top"/"bottom" edge isn't another
       \`.body-row\`'s border at all — the first row's top edge is really
       \`.thead\`'s own trailing border-bottom (whichever of \`.header-row\`/
       \`.filter-row\` is actually last inside it, depending on whether any
       column has a filter), and the last row's bottom edge is
       \`.pagination-bar\`'s own border-top when pagination is showing, or
       \`.grid-panel\`'s own outer border when it isn't. A selected row can
       be the actual last child of \`.body\` itself, or — same wrinkle as
       above — have its own trailing \`row-details\` be the last child
       instead; \`row-details\` picks up its own row's \`selected\` class too
       (see the row template) so that case can be matched directly here,
       rather than needing a \`:has()\` nested inside this \`:has()\` (which
       CSS disallows) to look it up via the row it belongs to. */
    .thead:has(+ .body .body-row:first-child.selected) > *:last-child {
      border-bottom-color: color-mix(in srgb, var(--datagrid-row-accent) 45%, var(--ui-bg));
    }

    .grid-panel:has(.body-row.selected:last-child, .row-details.selected:last-child)
      .pagination-bar {
      border-top-color: color-mix(in srgb, var(--datagrid-row-accent) 45%, var(--ui-bg));
    }

    .grid-panel:not(:has(.pagination-bar)):has(
        .body-row.selected:last-child,
        .row-details.selected:last-child
      ) {
      border-bottom-color: color-mix(in srgb, var(--datagrid-row-accent) 45%, var(--ui-bg));
    }

    :host([selection-mode="single"]) .body-row,
    :host([selection-mode="multi"]) .body-row {
      cursor: pointer;
    }

    :host([selection-mode="single"]) .body-row:hover,
    :host([selection-mode="multi"]) .body-row:hover {
      background: color-mix(in srgb, var(--datagrid-row-accent) 6%, var(--ui-bg));
    }

    .body-row.selected:hover {
      background: color-mix(in srgb, var(--datagrid-row-accent) 16%, var(--ui-bg));
    }

    /* Same left/right-edge treatment as \`.body-row.selected\` above, for a
       hovered row — including its own expanded \`row-details\` (no
       \`.selected\` class to key off here, since \`:hover\` has no
       template-time equivalent, so this reaches it via the adjacent-sibling
       combinator instead). */
    :host(:is([selection-mode="single"], [selection-mode="multi"]))
      .body-row:hover,
    :host(:is([selection-mode="single"], [selection-mode="multi"]))
      .body-row:hover
      + .row-details.expanded {
      border-inline-color: color-mix(in srgb, var(--datagrid-row-accent) 45%, var(--ui-bg));
    }

    /* Same top/bottom-edge treatment as \`.body-row.selected\` above, for a
       hovered row — same three cases (plain row above, collapsed
       \`rowDetails\` above, expanded \`rowDetails\` above), just keyed off
       \`:hover\` instead and gated by \`selection-mode\` the same way the
       hover background above already is (rows aren't hover-interactive at
       all otherwise). */
    :host(:is([selection-mode="single"], [selection-mode="multi"]))
      .body-row:hover,
    :host(:is([selection-mode="single"], [selection-mode="multi"]))
      .body-row:has(+ .body-row:hover),
    :host(:is([selection-mode="single"], [selection-mode="multi"]))
      .body-row:has(+ .row-details:not(.expanded) + .body-row:hover),
    :host(:is([selection-mode="single"], [selection-mode="multi"]))
      .row-details.expanded:has(+ .body-row:hover) {
      border-bottom-color: color-mix(in srgb, var(--datagrid-row-accent) 45%, var(--ui-bg));
    }

    /* Same first-row/last-row edge cases as the selected ones above, for a
       hovered row — except the last-row case only matches a \`.body-row\`
       that's genuinely \`:last-child\` (no trailing \`row-details\`). Unlike
       \`.selected\`, \`:hover\` is a live pseudo-class with no template-time
       equivalent to mirror onto \`row-details\` the way \`.selected\` is
       above, and reaching it purely in CSS would need a \`:has()\` nested
       inside this \`:has()\`, which isn't allowed — so a row whose own
       \`rowDetails\` trails it (collapsed or expanded) doesn't tint the
       pagination bar on hover, only on selection. */
    :host(:is([selection-mode="single"], [selection-mode="multi"]))
      .thead:has(+ .body .body-row:first-child:hover)
      > *:last-child {
      border-bottom-color: color-mix(in srgb, var(--datagrid-row-accent) 45%, var(--ui-bg));
    }

    :host(:is([selection-mode="single"], [selection-mode="multi"]))
      .grid-panel:has(.body-row:hover:last-child)
      .pagination-bar {
      border-top-color: color-mix(in srgb, var(--datagrid-row-accent) 45%, var(--ui-bg));
    }

    :host(:is([selection-mode="single"], [selection-mode="multi"]))
      .grid-panel:not(:has(.pagination-bar)):has(.body-row:hover:last-child) {
      border-bottom-color: color-mix(in srgb, var(--datagrid-row-accent) 45%, var(--ui-bg));
    }

    .select-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .expander-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    /* Transparent (not \`.thead\`'s neutral-50) — these non-data body cells
       let the row's own background (plain, or a selected/hovered row's own
       tint above) show through underneath, same as every other cell in
       the row. */
    .body-row .select-cell,
    .body-row .expander-cell {
      background: transparent;
    }

    /* Same divider look the header already has between its own cells.
       \`.expander-cell\`, when present, always comes right after
       \`.select-cell\` — so it's always the rightmost gutter cell and always
       gets the border; \`.select-cell\` only gets it when there's no
       \`.expander-cell\` right after it to hand the border off to instead
       (both otherwise show doubled, immediately-adjacent borders). Neither
       ever gets a left border. */
    .body-row .select-cell,
    .body-row .expander-cell {
      border-inline-start: none;
    }

    .body-row .expander-cell,
    .body-row .select-cell:not(:has(+ .expander-cell)) {
      border-inline-end: 1px solid var(--ui-color-neutral-200);
    }

    .row-actions-cell {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: calc(var(--ui-spacing-sm) * 2 + 0.5em);
    }

    /* Same treatment as the select/expander gutter above, mirrored onto the
       trailing side: transparent, so a selected/hovered row's own tint
       shows through instead, same as every other cell in the row — plus a
       matching divider, on this side a left border, since it's always the
       last cell in the row with nothing after it to hand the border off
       to. */
    .body-row .row-actions-cell {
      background: transparent;
      border-inline-start: 1px solid var(--ui-color-neutral-200);
    }

    /* The plus glyph itself never changes — only this button's own rotation
       animates, turning it into a cross when expanded. */
    .expander-toggle {
      all: unset;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5em;
      height: 1.5em;
      border-radius: var(--ui-radius-sm);
      color: var(--ui-color-neutral-600);
      cursor: pointer;
      transition:
        transform 200ms ease,
        background-color 120ms ease;
    }

    .expander-toggle:hover {
      background: var(--ui-color-neutral-100);
    }

    .expander-toggle.expanded {
      transform: rotate(45deg);
    }

    /* A CSS-only expand/collapse animation for content of unknown height:
       a single-row grid track animated between 0fr and 1fr (rather than a
       fixed max-height guess), clipped via the content cell's own
       \`overflow: hidden\` + \`min-height: 0\` (grid items default to
       \`min-height: auto\`, which would otherwise refuse to shrink below the
       content's own intrinsic height regardless of the track's size). Always
       rendered (even collapsed) for any row \`rowDetails\` resolves a template
       for, not just currently-expanded ones — an element toggling between
       these two states, rather than being added/removed from the DOM, is
       what makes the transition play both ways. */
    .row-details {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 200ms ease;
    }

    /* Only while expanded — collapsed, this element's own height is ~0, so
       this border would sit flush against .body-row's own border-bottom
       just above it (nothing in between to make them read as separate
       lines), doubling up into what looks like a single but too-thick
       line rather than the usual 1px. */
    .row-details.expanded {
      grid-template-rows: 1fr;
      border-bottom: 1px solid var(--ui-color-neutral-200);
    }

    /* Same specificity as .row-details.expanded above (two classes) — needs
       the extra :last-child to outrank it, otherwise an expanded last row's
       own border-bottom would win on source order and double up against
       .grid-panel's outer border, the exact doubling .body-row:last-child/
       .row-details:last-child above already guards against. */
    .row-details.expanded:last-child {
      border-bottom: none;
    }

    .row-details-content {
      min-height: 0;
      overflow: hidden;
    }

    .row-details-inner {
      padding-block: calc(var(--ui-spacing-md) - 1em);
      padding-inline: var(--ui-spacing-md);
      background: var(--ui-color-neutral-50);
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
      padding: calc(var(--ui-spacing-sm) * 3) var(--ui-spacing-md);
      border-top: 1px solid var(--ui-color-neutral-200);
      font-size: var(--ui-font-size-md);
    }

    /* Sits before \`.page-range\` (whose own auto margin pushes everything
       from there on to the right), so this is the one thing left pinned to
       the bar's near edge. */
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

    .page-size-group,
    .page-nav {
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
    }

    /* Same idea as the header's own column divider — a fixed 1.25em, 2px
       line, not a full-height border. An extra 1.75em margin (on top of the
       bar's own \`gap\`) gives a full 1.75em of breathing room on each side
       of the line itself; the offset centers it in that combined space (bar
       \`gap\` + the added 1.75em) via \`calc()\` rather than assuming the two
       happen to match. Scoped to \`.page-range\`/\`.page-size-group\`
       specifically (not \`.selection-badge\`, whose own gap to \`.page-range\`
       is a wide, variable auto-margin push rather than the bar's uniform
       \`gap\` — centering a line in *that* would leave it floating). */
    .pagination-bar > .page-range,
    .pagination-bar > .page-size-group {
      position: relative;
      margin-inline-end: 1.75em;
    }

    .pagination-bar > .page-range::after,
    .pagination-bar > .page-size-group::after {
      content: "";
      position: absolute;
      inset-block: 0;
      inset-inline-end: calc((var(--ui-spacing-md) + 1.75em) / -2);
      margin-block: auto;
      width: 2px;
      height: 1.25em;
      background: var(--ui-color-neutral-200);
    }

    .page-label {
      opacity: 0.7;
      white-space: nowrap;
    }

    .page-size {
      --select-min-width: 4.5em;
    }

    /* Pushed to the far end of the bar via its own auto margin — so the
       range text, the size picker, and the nav buttons that follow all end
       up grouped together on the right, instead of \`.page-range\` sitting
       alone on the left. */
    .page-range {
      margin-inline-start: auto;
      opacity: 0.7;
      white-space: nowrap;
    }

    .page-input {
      width: 3em;
    }
  `,
];
