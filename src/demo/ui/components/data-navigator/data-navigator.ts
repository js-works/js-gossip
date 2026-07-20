import { LitElement, html, nothing } from "lit";
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
// Row selection (multi mode) is built from the demo's own checkbox component —
// it exposes the same `.checked`/`change`-event contract as a native checkbox, so
// TanStack's own `getToggleSelectedHandler()`/`getToggleAllRowsSelectedHandler()`
// (which read `event.target.checked`) work on it unmodified.
import "../checkbox/checkbox.js";
// The pagination bar's page-jump field and page-size picker are built from the
// demo's own field components rather than plain <input>/<select>.
import "../text-field/text-field.js";
import type { UiInputField } from "../text-field/text-field.js";
import "../combobox/combobox.js";
import type { UiCombobox } from "../combobox/combobox.js";

// "1.251" rather than "1,251" or "1251" — deterministic regardless of the
// browser/OS locale the demo happens to run under.
function formatNumber(n: number): string {
  return n.toLocaleString("de-DE");
}

export type SelectionMode = "none" | "single" | "multi";

/**
 * This component's own column shape — deliberately not TanStack's `ColumnDef`.
 * TanStack Table is an internal implementation detail (see #toColumnDefs below);
 * consumers of `ui-data-navigator` should never need to import anything from
 * `@tanstack/lit-table` themselves, or learn its property names (`size`, not
 * `width`; `enableSorting`, not `sortable`; a `CellContext` object, not the row).
 */
export interface DataNavigatorColumn<T> {
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

function toColumnDefs<T>(columns: DataNavigatorColumn<T>[]): ColumnDef<T>[] {
  return columns.map((column) => ({
    accessorKey: column.accessorKey,
    header: column.header,
    size: column.width !== undefined ? Number(column.width) : undefined,
    enableSorting: column.sortable ?? true,
    cell: (info: CellContext<T, unknown>) =>
      column.cell ? column.cell(info.row.original) : info.renderValue(),
  }));
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
export class UiDataNavigator<T = unknown> extends LitElement {
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
    const requested = Number((event.target as UiInputField).value);
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

  render() {
    const table = this.#table();
    const headerGroups = table.getHeaderGroups();
    const rows = table.getRowModel().rows;

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
        <ui-input-field
          class="global-filter"
          placeholder=${this.globalFilterPlaceholder}
          .value=${(table.getState().globalFilter as string | undefined) ?? ""}
          @input=${(event: Event) => {
            table.setGlobalFilter((event.target as UiInputField).value);
            this.#resetSelection(table);
          }}
        >
          <span slot="prefix">${searchIcon}</span>
        </ui-input-field>
      </div>

      <table>
        <thead>
          ${headerGroups.map(
            (headerGroup, groupIndex) => html`<tr>
              ${this.selectionMode === "multi"
                ? html`<th class="select-cell">
                    ${groupIndex === 0
                      ? html`<ui-checkbox
                          .checked=${table.getIsAllRowsSelected()}
                          .indeterminate=${table.getIsSomeRowsSelected()}
                          aria-label="Select all rows"
                          @change=${table.getToggleAllRowsSelectedHandler()}
                        ></ui-checkbox>`
                      : nothing}
                  </th>`
                : nothing}
              ${headerGroup.headers.map((header) => {
                if (header.isPlaceholder) return html`<th></th>`;
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const toggleSorting = header.column.getToggleSortingHandler();
                const label = flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                );
                return html`<th style="width: ${header.getSize()}px">
                  ${canSort && toggleSorting
                    ? html`<button
                        type="button"
                        class="sort-button"
                        @click=${(event: Event) => {
                          toggleSorting(event);
                          this.#resetSelection(table);
                        }}
                      >
                        ${label}
                        <span class="sort-icon ${sorted ? "active" : ""}">
                          ${sorted === "asc"
                            ? chevronUpIcon
                            : sorted === "desc"
                              ? chevronDownIcon
                              : chevronExpandIcon}
                        </span>
                      </button>`
                    : label}
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
                  colspan=${this.columns.length +
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
          <ui-input-field
            class="page-jump"
            type="text"
            maxlength="4"
            aria-label="Page number"
            .value=${String(table.getState().pagination.pageIndex + 1)}
            @change=${(event: Event) => {
              this.#jumpToPage(event, table);
              this.#resetSelection(table);
            }}
          ></ui-input-field>
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
          <ui-combobox
            class="page-size"
            dropdown
            .items=${this.pageSizeOptions.map(String)}
            .value=${String(table.getState().pagination.pageSize)}
            @change=${(event: Event) => {
              table.setPageSize(Number((event.target as UiCombobox).value));
              this.#resetSelection(table);
            }}
          ></ui-combobox>
        </div>

        <span class="page-range">${this.#pageInfo(table)}</span>
      </div>
    `;
  }
}
