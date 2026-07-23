import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  TableController,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type CellContext,
  type Column,
  type Table,
} from "@tanstack/lit-table";

import { dataNavigatorStyles } from "./data-navigator.styles.js";
import { chevronUpIcon } from "./icons/chevron-up.icon.js";
import { chevronDownIcon } from "./icons/chevron-down.icon.js";
import { chevronExpandIcon } from "./icons/chevron-expand.icon.js";
import { chevronLeftIcon } from "./icons/chevron-left.icon.js";
import { chevronRightIcon } from "./icons/chevron-right.icon.js";
import { chevronsLeftIcon } from "./icons/chevrons-left.icon.js";
import { chevronsRightIcon } from "./icons/chevrons-right.icon.js";
import { searchIcon } from "./icons/search.icon.js";
import { filterIcon } from "./icons/filter.icon.js";
// Row selection (multi mode) is built from the demo's own checkbox component —
// it exposes the same `.checked`/`change`-event contract as a native checkbox, so
// TanStack's own `getToggleSelectedHandler()`/`getToggleAllRowsSelectedHandler()`
// (which read `event.target.checked`) work on it unmodified.
import "../checkbox/checkbox.js";
// The pagination bar's page-jump field and page-size picker are built from the
// demo's own field components rather than plain <input>/<select>.
import "../text-field/text-field.js";
import type { TextField } from "../text-field/text-field.js";
import "../select/select.js";
import type { Select } from "../select/select.js";
import "../button/button.js";

// "1.251" rather than "1,251" or "1251" — deterministic regardless of the
// browser/OS locale the demo happens to run under.
function formatNumber(n: number): string {
  return n.toLocaleString("de-DE");
}

export type SelectionMode = "none" | "single" | "multi";

/**
 * A toolbar action, rendered as a subtle `ui-button` to the left of the global
 * filter. Which actions show depends on the current selection count — "general"
 * always, "single" only at exactly one selected row, "multi" only above that —
 * so e.g. an "Edit" action (needs exactly one target) and a "Delete selected"
 * action (needs at least one, phrased for several) can coexist without either
 * ever showing when it wouldn't make sense.
 */
export interface DataNavigatorAction<T> {
  label: string;
  icon?: TemplateResult;
  type: "general" | "single" | "multi";
  onClick: (selected: T[]) => void;
  disabled?: boolean;
}

/**
 * This component's own column shape — deliberately not TanStack's `ColumnDef`.
 * TanStack Table is an internal implementation detail (see #toColumnDefs below);
 * consumers of `ui-data-navigator` should never need to import anything from
 * `@tanstack/lit-table` themselves, or learn its property names (`size`, not
 * `width`; `enableSorting`, not `sortable`; a `CellContext` object, not the row).
 *
 * Two shapes: a data column (reads one field, renders one cell per row) or a
 * group column (`columns`) — a header spanning several data/group columns
 * beneath it, with no field/cell of its own. Groups can nest to any depth; the
 * header then grows one row per level, with each cell's `colspan`/`rowspan`
 * computed by TanStack Table itself (`header.colSpan`/`header.rowSpan`).
 */
export type DataNavigatorColumn<T> = DataNavigatorGroupColumn<T> | DataNavigatorDataColumn<T>;

export interface DataNavigatorGroupColumn<T> {
  /** Group header label, spanning every column nested beneath it. */
  header: string;
  /** The columns (data or, nested, further groups) under this group header. */
  columns: DataNavigatorColumn<T>[];
}

export interface DataNavigatorDataColumn<T> {
  /** Which field of a row this column reads from. */
  accessorKey: keyof T & string;
  /** Column header label. */
  header: string;
  /**
   * This column's share of the table's width, relative to the other columns'
   * `width` — not a literal size. The table stretches to fill its container
   * (`table-layout: fixed` + `width: 100%`), so declared widths are always
   * scaled proportionally to fit; a column with `width: "2"` renders twice as
   * wide as one with `width: "1"`, whatever the container's actual width
   * happens to be. Falls back to TanStack's own default ratio (150) if
   * omitted, i.e. columns without one are weighted equally against each other.
   */
  width?: string;
  /** Whether clicking the header sorts by this column. Defaults to true. */
  sortable?: boolean;
  /** Custom cell renderer, given the row; defaults to printing the raw value. */
  cell?: (row: T) => unknown;
}

function isGroupColumn<T>(
  column: DataNavigatorColumn<T>,
): column is DataNavigatorGroupColumn<T> {
  return "columns" in column;
}

function toColumnDefs<T>(columns: DataNavigatorColumn<T>[]): ColumnDef<T>[] {
  return columns.map((column) =>
    isGroupColumn(column)
      ? { header: column.header, columns: toColumnDefs(column.columns) }
      : {
          accessorKey: column.accessorKey,
          header: column.header,
          size: column.width !== undefined ? Number(column.width) : undefined,
          enableSorting: column.sortable ?? true,
          cell: (info: CellContext<T, unknown>) =>
            column.cell ? column.cell(info.row.original) : info.renderValue(),
        },
  );
}

// --- Header grid (colSpan/rowSpan for grouped headers) -------------------
//
// Built directly from `this.columns` rather than TanStack's own
// `table.getHeaderGroups()`. TanStack's header-group model expresses "a leaf
// column with no group at this level" as an *empty placeholder cell* in the
// shallow row plus a second, separate real cell in the leaf row — not one
// cell vertically spanning both (its own `header.rowSpan` is computed as HTML
// `rowspan="0"`, "span to end of section", on *both* the placeholder and its
// later real echo, so using it as-is would make a group header like "Contact
// & Org" incorrectly stretch down into its children's row too). Since we
// already know the exact tree shape from our own column type, it's simpler
// and unambiguous to compute the grid ourselves: a plain (non-grouped) column
// gets one cell spanning every remaining row (rowSpan = total rows − its
// depth), a group column gets one cell spanning just its own row (rowSpan 1)
// with colSpan equal to its total leaf-column count.

interface HeaderCell<T> {
  label: string;
  colSpan: number;
  rowSpan: number;
  /** Only set for a real (non-group) column — what drives sorting/sizing. */
  column?: Column<T, unknown>;
}

function countLeafColumns<T>(column: DataNavigatorColumn<T>): number {
  return isGroupColumn(column)
    ? column.columns.reduce((sum, child) => sum + countLeafColumns(child), 0)
    : 1;
}

function columnDepth<T>(column: DataNavigatorColumn<T>): number {
  return isGroupColumn(column)
    ? 1 + Math.max(...column.columns.map(columnDepth))
    : 1;
}

function buildHeaderRows<T>(
  columns: DataNavigatorColumn<T>[],
  table: Table<T>,
): HeaderCell<T>[][] {
  const totalRows = Math.max(1, ...columns.map(columnDepth));
  const rows: HeaderCell<T>[][] = Array.from({ length: totalRows }, () => []);

  const walk = (level: DataNavigatorColumn<T>[], depth: number) => {
    for (const column of level) {
      if (isGroupColumn(column)) {
        rows[depth].push({
          label: column.header,
          colSpan: countLeafColumns(column),
          rowSpan: 1,
        });
        walk(column.columns, depth + 1);
      } else {
        rows[depth].push({
          label: column.header,
          colSpan: 1,
          rowSpan: totalRows - depth,
          column: table.getColumn(column.accessorKey),
        });
      }
    }
  };
  walk(columns, 0);

  return rows;
}

/**
 * A datatable combo: an optional title/subtitle header, a global search box plus
 * one filter input per filterable column, sortable column headers, and a
 * pagination bar. All the actual state (sorting/filtering/pagination) is owned by
 * TanStack Table itself — via `@tanstack/lit-table`'s `TableController`, a
 * `ReactiveController` that keeps its own state and calls `requestUpdate()`
 * whenever the table's built-in setters (`setSorting`, `setGlobalFilter`,
 * `column.setFilterValue`, `setPageIndex`, …) run — so this component only ever
 * renders whatever `table.getXxx()` says right now, the same way `render()` is
 * always "current state in, DOM out" for any other Lit component.
 *
 * `columns`/`data` are passed straight through to TanStack Table on every render,
 * so replacing either reactively updates the table. `pageSize` only seeds the
 * *initial* page size (TanStack only reads `initialState` once, at first render).
 */
@customElement("ui-data-navigator")
export class DataNavigator<T = unknown> extends LitElement {
  #tableController = new TableController<T>(this);

  @property({ attribute: false })
  accessor columns: DataNavigatorColumn<T>[] = [];

  @property({ attribute: false })
  accessor data: T[] = [];

  @property()
  accessor title = "";

  @property()
  accessor subtitle = "";

  @property({ attribute: "page-size", type: Number })
  accessor pageSize = 50;

  @property({ attribute: false })
  accessor pageSizeOptions: number[] = [25, 50, 100, 250, 500];

  @property({ attribute: "global-filter-placeholder" })
  accessor globalFilterPlaceholder = "Search…";

  @property({ attribute: false })
  accessor actions: DataNavigatorAction<T>[] = [];

  // "none": no selection UI at all. "single": clicking a row selects it (and only
  // it — selecting a different row deselects the previous one automatically,
  // TanStack's own `enableMultiRowSelection: false` behavior), highlighted by
  // background color. "multi": a checkbox column (select-all in the header, one
  // per row), behaving like any other datatable's multi-select column.
  @property({ attribute: "selection-mode" })
  accessor selectionMode: SelectionMode = "none";

  // "default": a neutral gray highlight for the selected row(s). "primary": the
  // brand accent color instead — a bolder look for when selection is the main
  // point of the table (e.g. picking one item to act on) rather than incidental.
  @property({ attribute: "selection-appearance" })
  accessor selectionAppearance: "default" | "primary" = "default";

  // Serialized snapshot of the last-dispatched selection, so `row-selection-change`
  // only fires when the actual set of selected rows changes, not on every render.
  #lastSelectionKey = "";

  // TanStack recommends keeping `columns` referentially stable across renders
  // (recreating it every time defeats its own memoization) — cache the converted
  // array and only rebuild it when the source `columns` property actually changes.
  #columnDefsCache?: { source: DataNavigatorColumn<T>[]; result: ColumnDef<T>[] };

  static styles = dataNavigatorStyles;

  #columnDefs(): ColumnDef<T>[] {
    if (this.#columnDefsCache?.source !== this.columns) {
      this.#columnDefsCache = {
        source: this.columns,
        result: toColumnDefs(this.columns),
      };
    }
    return this.#columnDefsCache.result;
  }

  #table(): Table<T> {
    return this.#tableController.table({
      data: this.data,
      columns: this.#columnDefs(),
      initialState: { pagination: { pageSize: this.pageSize } },
      enableRowSelection: this.selectionMode !== "none",
      enableMultiRowSelection: this.selectionMode === "multi",
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
    });
  }

  #pageInfo(table: Table<T>): string {
    const { pageIndex, pageSize } = table.getState().pagination;
    const total = table.getFilteredRowModel().rows.length;
    if (total === 0) return "No rows";
    const start = pageIndex * pageSize + 1;
    const end = Math.min(start + pageSize - 1, total);
    return `Items ${formatNumber(start)} - ${formatNumber(end)} of ${formatNumber(total)}`;
  }

  #jumpToPage(event: Event, table: Table<T>) {
    const requested = Number((event.target as TextField).value);
    if (!Number.isFinite(requested)) return;

    const lastPageIndex = Math.max(table.getPageCount() - 1, 0);
    const pageIndex = Math.min(Math.max(Math.floor(requested) - 1, 0), lastPageIndex);
    table.setPageIndex(pageIndex);
  }

  // Paging, sorting, and filtering all change *which* rows are even showing, so a
  // prior selection (by index/identity) would silently point at different rows
  // than the user actually picked — clear it whenever any of those happen.
  #resetSelection(table: Table<T>) {
    if (this.selectionMode !== "none") {
      table.setRowSelection({});
    }
  }

  protected updated() {
    this.#updateStickyHeaderOffsets();

    if (this.selectionMode === "none") return;

    const table = this.#table();
    const selectedRows = table.getSelectedRowModel().rows;
    const key = selectedRows.map((row) => row.id).join(",");
    if (key === this.#lastSelectionKey) return;

    this.#lastSelectionKey = key;
    this.dispatchEvent(
      new CustomEvent("row-selection-change", {
        detail: { selected: selectedRows.map((row) => row.original) },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // Every sticky <th> uses `top: 0` in CSS, which only positions the *first*
  // header row correctly — a second (or third, …) header row needs to stick
  // just below the row(s) above it, not on top of them. That offset depends on
  // actual rendered row height (font-size/padding), so it's measured here
  // rather than hardcoded in CSS.
  #updateStickyHeaderOffsets() {
    const headerRowEls =
      this.renderRoot.querySelectorAll<HTMLElement>("thead tr");
    let offset = 0;
    for (const row of headerRowEls) {
      for (const cell of row.children) {
        (cell as HTMLElement).style.top = `${offset}px`;
      }
      offset += row.getBoundingClientRect().height;
    }
  }

  render() {
    const table = this.#table();
    const headerRows = buildHeaderRows(this.columns, table);
    const rows = table.getRowModel().rows;

    const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
    const visibleActions = this.actions.filter((action) => {
      switch (action.type) {
        case "general":
          return true;
        case "single":
          return selectedRows.length === 1;
        case "multi":
          return selectedRows.length > 1;
      }
    });

    return html`
      ${this.title || this.subtitle
        ? html`<div class="header">
            ${this.title ? html`<h2 class="title">${this.title}</h2>` : nothing}
            ${this.subtitle
              ? html`<p class="subtitle">${this.subtitle}</p>`
              : nothing}
          </div>`
        : nothing}

      <div class="toolbar">
        <div class="toolbar-actions">
          ${visibleActions.map(
            (action) => html`
              <ui-button
                appearance="primary"
                variant="subtle"
                size="medium"
                ?disabled=${action.disabled}
                @click=${() => action.onClick(selectedRows)}
              >
                ${action.icon
                  ? html`<span slot="prefix">${action.icon}</span>`
                  : nothing}
                ${action.label}
              </ui-button>
            `,
          )}
        </div>
        <ui-text-field
          class="global-filter"
          placeholder=${this.globalFilterPlaceholder}
          .value=${(table.getState().globalFilter as string | undefined) ?? ""}
          @input=${(event: Event) => {
            table.setGlobalFilter((event.target as TextField).value);
            this.#resetSelection(table);
          }}
        >
          <span slot="prefix">${searchIcon}</span>
          <ui-button
            slot="suffix"
            appearance="primary"
            variant="subtle"
            size="small"
            aria-label="Filter options"
          >
            <span slot="prefix">${filterIcon}</span>
          </ui-button>
        </ui-text-field>
      </div>

      <div class="table-scroll">
        <table>
        <thead>
          ${headerRows.map(
            (headerRow, rowIndex) => html`<tr>
              ${this.selectionMode === "multi" && rowIndex === 0
                ? html`<th
                    class="select-cell spans-to-bottom"
                    rowspan=${headerRows.length}
                  >
                    <ui-checkbox
                      .checked=${table.getIsAllRowsSelected()}
                      .indeterminate=${table.getIsSomeRowsSelected()}
                      aria-label="Select all rows"
                      @change=${table.getToggleAllRowsSelectedHandler()}
                    ></ui-checkbox>
                  </th>`
                : nothing}
              ${headerRow.map((cell) => {
                if (!cell.column) {
                  // A group header: no accessor of its own, so nothing to sort.
                  return html`<th colspan=${cell.colSpan} rowspan=${cell.rowSpan}>
                    ${cell.label}
                  </th>`;
                }
                const column = cell.column;
                const canSort = column.getCanSort();
                const sorted = column.getIsSorted();
                const toggleSorting = column.getToggleSortingHandler();
                // A rowspan cell (e.g. "Name") reaches the bottom of the header
                // without living in the last row's own DOM, so the CSS rule
                // that closes off the bottom edge for that row can't reach it.
                const spansToBottom = rowIndex + cell.rowSpan === headerRows.length;
                return html`<th
                  class=${spansToBottom ? "spans-to-bottom" : ""}
                  colspan=${cell.colSpan}
                  rowspan=${cell.rowSpan}
                  style="width: ${column.getSize()}px"
                >
                  ${canSort && toggleSorting
                    ? html`<button
                        type="button"
                        class="sort-button"
                        @click=${(event: Event) => {
                          toggleSorting(event);
                          this.#resetSelection(table);
                        }}
                      >
                        ${cell.label}
                        <span class="sort-icon ${sorted ? "active" : ""}">
                          ${sorted === "asc"
                            ? chevronUpIcon
                            : sorted === "desc"
                              ? chevronDownIcon
                              : chevronExpandIcon}
                        </span>
                      </button>`
                    : cell.label}
                </th>`;
              })}
            </tr>`,
          )}
        </thead>
        <tbody>
          ${rows.length === 0
            ? html`<tr>
                <td
                  class="empty"
                  colspan=${table.getVisibleLeafColumns().length +
                  (this.selectionMode === "none" ? 0 : 1)}
                >
                  No rows
                </td>
              </tr>`
            : rows.map(
                (row) => html`<tr
                  class=${row.getIsSelected() ? "selected" : ""}
                  @click=${this.selectionMode === "single" ||
                  this.selectionMode === "multi"
                    ? () => row.toggleSelected()
                    : nothing}
                >
                  ${this.selectionMode === "multi"
                    ? html`<td class="select-cell">
                        <ui-checkbox
                          .checked=${row.getIsSelected()}
                          aria-label="Select row"
                          @change=${row.getToggleSelectedHandler()}
                          @click=${(event: Event) => event.stopPropagation()}
                        ></ui-checkbox>
                      </td>`
                    : nothing}
                  ${row
                    .getVisibleCells()
                    .map(
                      (cell) => html`<td>
                        ${flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>`,
                    )}
                </tr>`,
              )}
        </tbody>
        </table>
      </div>

      <div class="pagination">
        <div class="page-nav">
          <button
            type="button"
            class="page-btn"
            aria-label="First page"
            ?disabled=${!table.getCanPreviousPage()}
            @click=${() => {
              table.setPageIndex(0);
              this.#resetSelection(table);
            }}
          >
            ${chevronsLeftIcon}
          </button>
          <button
            type="button"
            class="page-btn"
            aria-label="Previous page"
            ?disabled=${!table.getCanPreviousPage()}
            @click=${() => {
              table.previousPage();
              this.#resetSelection(table);
            }}
          >
            ${chevronLeftIcon}
          </button>
          <span class="page-label">Page</span>
          <ui-text-field
            class="page-jump"
            type="text"
            maxlength="4"
            aria-label="Page number"
            .value=${String(table.getState().pagination.pageIndex + 1)}
            @change=${(event: Event) => {
              this.#jumpToPage(event, table);
              this.#resetSelection(table);
            }}
          ></ui-text-field>
          <span class="page-label">of ${table.getPageCount()}</span>
          <button
            type="button"
            class="page-btn"
            aria-label="Next page"
            ?disabled=${!table.getCanNextPage()}
            @click=${() => {
              table.nextPage();
              this.#resetSelection(table);
            }}
          >
            ${chevronRightIcon}
          </button>
          <button
            type="button"
            class="page-btn"
            aria-label="Last page"
            ?disabled=${!table.getCanNextPage()}
            @click=${() => {
              table.setPageIndex(table.getPageCount() - 1);
              this.#resetSelection(table);
            }}
          >
            ${chevronsRightIcon}
          </button>
        </div>

        <div class="separator"></div>

        <div class="page-size-group">
          <span class="page-label">Items/Page:</span>
          <ui-select
            class="page-size"
            .value=${String(table.getState().pagination.pageSize)}
            @change=${(event: Event) => {
              table.setPageSize(Number((event.target as Select).value));
              this.#resetSelection(table);
            }}
          >
            ${this.pageSizeOptions.map(
              (size) =>
                html`<ui-option value=${String(size)}>${size}</ui-option>`,
            )}
          </ui-select>
        </div>

        <span class="page-range">${this.#pageInfo(table)}</span>
      </div>
    `;
  }
}
