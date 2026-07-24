import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { datagridStyles } from "./datagrid.styles.js";
import { chevronUpIcon } from "./icons/chevron-up.icon.js";
import { chevronDownIcon } from "./icons/chevron-down.icon.js";
import { chevronLeftIcon } from "./icons/chevron-left.icon.js";
import { chevronRightIcon } from "./icons/chevron-right.icon.js";
import { chevronsLeftIcon } from "./icons/chevrons-left.icon.js";
import { chevronsRightIcon } from "./icons/chevrons-right.icon.js";
import { checkSquareIcon } from "./icons/check-square.icon.js";
import "../button/button.js";
import "../checkbox/checkbox.js";
import type { Checkbox } from "../checkbox/checkbox.js";
import "../text-field/text-field.js";
import type { TextField } from "../text-field/text-field.js";
import "../number-field/number-field.js";
import type { NumberField } from "../number-field/number-field.js";
import "../select/select.js";
import type { Select } from "../select/select.js";

/**
 * This component's own column shape.
 */
export interface DataGridColumn<T> {
  /** Which field of a row this column reads from. */
  field: keyof T & string;
  /** Column header label. Falls back to `field` if omitted. */
  header?: string;
  /**
   * This column's share of the grid's total width, as a fraction of the sum
   * of every column's own `width` — the same idea as a CSS `fr` unit, which
   * is exactly what this maps onto (`grid-template-columns` gets `${width}fr`
   * per column, plus a fixed-width leading column when `selectionMode` is
   * `"multi"`). A column with `width: 200` next to others left at the
   * default 100 ends up twice as wide as them, whatever the grid's actual
   * pixel width happens to be. Default 100, so leaving every column's width
   * unset divides the available space evenly.
   */
  width?: number;
  /** Whether clicking the header sorts by this column. Defaults to true. */
  sortable?: boolean;
  /**
   * Enables filtering for this column, as a plain control directly beneath
   * the header — `true` for a `ui-text-field` doing a case-insensitive
   * "contains" match (debounced ~300ms), or `"select"` for a `ui-select`
   * multi-picker matching any of the values currently chosen. Defaults to
   * false.
   */
  filter?: boolean | "select";
  /**
   * Explicit dropdown values for a `"select"` filter — only needed when
   * `dataSource` is used instead of `data`, since then there's no complete
   * local dataset to scan for "every distinct value seen". Falls back to
   * scanning `data` when omitted.
   */
  selectOptions?: string[];
  /** Formats the raw cell value for display; defaults to printing it as-is. */
  valueFormatter?: (value: unknown, row: T) => string;
}

/**
 * "none": no selection UI. "single": clicking a row selects it (and only
 * it). "multi": a checkbox column (select-all in the header, one per row) —
 * clicking anywhere on a row toggles its own selection.
 */
export type DataGridSelectionMode = "none" | "single" | "multi";

/**
 * A toolbar action, rendered as an outlined `ui-button` above the grid.
 * "general" always shows, "single" only at exactly one selected row, "multi"
 * only above that, so e.g. an "Edit" action (needs exactly one target) and a
 * "Delete selected" action (needs several) can coexist without either ever
 * showing when it wouldn't make sense. Requires `selectionMode` to be
 * something other than `"none"` for "single"/"multi" actions to ever become
 * visible.
 */
export interface DataGridAction<T> {
  label: string;
  icon?: TemplateResult;
  type: "general" | "single" | "multi";
  onClick: (selected: T[]) => void;
  disabled?: boolean;
}

/** One column's current sort — part of a `DataGridDataRequest`. */
export interface DataGridSort<T> {
  field: keyof T & string;
  direction: "asc" | "desc";
}

/** One column's current filter value, keyed by field in `DataGridDataRequest.filters`. */
export type DataGridColumnFilter = { value: string } | { values: string[] };

/**
 * What `DataGridDataSource` is called with for one request: the row range
 * currently needed, plus whatever sort/filter state should shape it.
 * `startRow`/`endRow` are a half-open range (`[startRow, endRow)`) — e.g.
 * `{ startRow: 20, endRow: 40 }` asks for rows 20 through 39, matching a
 * `pageSize` of 20 on page 2. `signal` aborts when a later request
 * supersedes this one (a fresh sort/filter/page change before this one
 * resolved).
 */
export interface DataGridDataRequest<T> {
  startRow: number;
  endRow: number;
  /** Empty when unsorted. Only ever one entry — this component doesn't expose multi-column sort. */
  sort: DataGridSort<T>[];
  /** Only present for columns with an active filter. */
  filters: Partial<Record<keyof T & string, DataGridColumnFilter>>;
  signal: AbortSignal;
}

export interface DataGridDataResult<T> {
  /** The rows for the requested `[startRow, endRow)` range. */
  rows: T[];
  /** Total row count across the entire dataset — drives the pagination bar's page count. */
  rowCount: number;
}

/**
 * An async row source — an alternative to `data` for rows that live behind a
 * real request (server-side sort/filter/pagination) rather than already
 * being fully loaded on the client. Every sort, filter, and page change
 * re-invokes this for just the range currently in view. Mutually exclusive
 * with `data`; when both are set, `dataSource` wins and `data` is ignored.
 */
export type DataGridDataSource<T> = (
  request: DataGridDataRequest<T>,
) => Promise<DataGridDataResult<T>>;

/**
 * A vanilla, framework-free datagrid — deliberately a much smaller, simpler
 * cousin of `ui-ag-grid` (this library's other datagrid, built on AG Grid
 * Community): columns, sorting, per-column filters (plain text or a
 * multi-select dropdown), pagination, row selection, and toolbar actions,
 * hand-rolled from a plain CSS Grid rather than handed off to a third-party
 * grid engine. No column resizing, no cell focus/keyboard navigation, no
 * `selectionAppearance` choice (selected/hovered rows are always a grayish
 * neutral tint, not configurable) — this is meant to stay the simple,
 * dependency-free option; reach for `ui-ag-grid` when a use case needs more
 * than this covers.
 *
 * Rows come from either `data` (a plain, already-loaded array — filtering,
 * sorting, and pagination all happen locally, synchronously, against that
 * array) or `dataSource` (a `DataGridDataSource` callback, re-invoked for
 * just the current page on every sort/filter/page change — the way a real
 * server-backed grid would work). See `DataGridDataSource`'s own doc for why
 * these are mutually exclusive.
 *
 * Selection is tracked by row object identity (a plain `Set<T>`, no
 * `getRowId`-style concept) — `data`'s own row objects (or, for
 * `dataSource`, whatever objects a request resolves with) need to stay the
 * same references across re-renders for a selection to keep tracking the
 * "same" row; this matters most for `dataSource`, where each request
 * resolves independently — a `dataSource` backed by a stable in-memory store
 * naturally satisfies this by returning slices of the same row objects
 * every time.
 *
 * This grid needs an explicit height on its container — it does not
 * auto-size to its own row count — set via the `height` property (any CSS
 * length).
 */
@customElement("ui-datagrid")
export class DataGrid<T = unknown> extends LitElement {
  @property({ attribute: false })
  accessor columns: DataGridColumn<T>[] = [];

  @property({ attribute: false })
  accessor data: T[] = [];

  @property({ attribute: false })
  accessor dataSource: DataGridDataSource<T> | undefined = undefined;

  @property()
  accessor title = "";

  @property()
  accessor subtitle = "";

  @property({ type: Boolean })
  accessor pagination = true;

  @property({ attribute: "page-size", type: Number })
  accessor pageSize = 20;

  @property({ attribute: false })
  accessor pageSizeOptions: number[] = [10, 20, 50, 100];

  @property({ attribute: "selection-mode", reflect: true })
  accessor selectionMode: DataGridSelectionMode = "none";

  @property({ attribute: false })
  accessor actions: DataGridAction<T>[] = [];

  @property()
  accessor height = "480px";

  // --- internal state -------------------------------------------------------

  /** The current page's rows — computed locally (`data` mode) or resolved from `dataSource`. */
  @state()
  accessor rows: T[] = [];

  /** Total row count across the whole (filtered) dataset — drives the pagination bar. */
  @state()
  accessor rowCount = 0;

  /** 0-based current page index. */
  @state()
  accessor page = 0;

  @state()
  accessor sort: DataGridSort<T> | undefined = undefined;

  @state()
  accessor filters: Partial<Record<keyof T & string, DataGridColumnFilter>> =
    {};

  @state()
  accessor selected: Set<T> = new Set();

  // Delayed 200ms so a fast `dataSource` request never flashes this.
  @state()
  accessor showLoadingSpinner = false;

  // The page number the pagination bar's "Page X of Y"/"A to B of C" text
  // (and the page-input's own value) is drawn from — committed alongside
  // `rows`/`rowCount` (in `#refresh()`/`#refreshAsync()`'s resolve callback),
  // not alongside `page` itself. `page` changes synchronously the instant a
  // caller navigates (driving the next request and the nav buttons' own
  // enabled/disabled state and +/-1 arithmetic), but the *text* shouldn't
  // jump ahead of the rows still on screen — while a request is in flight,
  // this still points at the page those (dimmed) rows actually belong to.
  // Plain field, not `@state()`: every assignment happens alongside `rows`/
  // `rowCount` (both already reactive), so Lit re-renders at the right time
  // regardless.
  #displayPage = 0;

  #activeRequest?: AbortController;
  #loadingSpinnerTimer?: ReturnType<typeof setTimeout>;
  #filterDebounce = new Map<string, ReturnType<typeof setTimeout>>();
  #ready = false;

  static styles = datagridStyles;

  /** The currently selected rows. */
  get selectedRows(): T[] {
    return [...this.selected];
  }

  #effectivePageSize(): number {
    return this.pagination ? this.pageSize : Number.MAX_SAFE_INTEGER;
  }

  // The distinct values a "select" filter column offers when `selectOptions`
  // isn't given — every value actually present in `data` for that field.
  // Only meaningful in `data` mode; `dataSource` mode has no complete local
  // dataset to scan, so `selectOptions` is effectively required there.
  #distinctValues(field: string): string[] {
    const values = new Set<string>();
    for (const row of this.data) {
      const raw = (row as Record<string, unknown>)[field];
      if (raw !== null && raw !== undefined) values.add(String(raw));
    }
    return [...values].sort();
  }

  #applyFilters(rows: T[]): T[] {
    let result = rows;
    for (const entry of Object.entries(this.filters)) {
      const [field, filter] = entry as [keyof T & string, DataGridColumnFilter];
      result =
        "values" in filter
          ? result.filter((row) =>
              filter.values.includes(
                String((row as Record<string, unknown>)[field] ?? ""),
              ),
            )
          : result.filter((row) =>
              String((row as Record<string, unknown>)[field] ?? "")
                .toLowerCase()
                .includes(filter.value.toLowerCase()),
            );
    }
    return result;
  }

  #applySort(rows: T[]): T[] {
    const sort = this.sort;
    if (!sort) return rows;
    return rows.slice().sort((a, b) => {
      const av = (a as Record<string, unknown>)[sort.field];
      const bv = (b as Record<string, unknown>)[sort.field];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.direction === "desc" ? -cmp : cmp;
    });
  }

  // Bridges the plain `data` array (client-side mode) to the same
  // rows/rowCount shape #refreshAsync() produces for `dataSource`, so
  // render() never needs to know which mode is active.
  #refresh(): void {
    if (this.dataSource) {
      this.#refreshAsync();
      return;
    }
    const filtered = this.#applyFilters(this.data);
    const sorted = this.#applySort(filtered);
    const pageSize = this.#effectivePageSize();
    const start = this.page * pageSize;
    this.rows = sorted.slice(start, start + pageSize);
    this.rowCount = sorted.length;
    this.#displayPage = this.page;
  }

  #refreshAsync(): void {
    const dataSource = this.dataSource;
    if (!dataSource) return;

    this.#activeRequest?.abort();
    const request = new AbortController();
    this.#activeRequest = request;

    clearTimeout(this.#loadingSpinnerTimer);
    this.#loadingSpinnerTimer = setTimeout(() => {
      this.showLoadingSpinner = true;
    }, 200);

    const pageSize = this.#effectivePageSize();
    const startRow = this.page * pageSize;
    const endRow = startRow + pageSize;

    dataSource({
      startRow,
      endRow,
      sort: this.sort ? [this.sort] : [],
      filters: this.filters,
      signal: request.signal,
    }).then(
      (result) => {
        if (request.signal.aborted) return;
        clearTimeout(this.#loadingSpinnerTimer);
        this.showLoadingSpinner = false;
        this.rows = result.rows;
        this.rowCount = result.rowCount;
        this.#displayPage = this.page;
      },
      () => {
        if (request.signal.aborted) return;
        clearTimeout(this.#loadingSpinnerTimer);
        this.showLoadingSpinner = false;
      },
    );
  }

  #toggleSort(column: DataGridColumn<T>): void {
    if (column.sortable === false) return;
    const sort = this.sort;
    if (!sort || sort.field !== column.field) {
      this.sort = { field: column.field, direction: "asc" };
    } else if (sort.direction === "asc") {
      this.sort = { field: column.field, direction: "desc" };
    } else {
      this.sort = undefined;
    }
  }

  #goToPageInput(value: string, pageCount: number): void {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    this.page = Math.min(Math.max(parsed, 1), pageCount) - 1;
  }

  #setFilter(
    field: keyof T & string,
    filter: DataGridColumnFilter | undefined,
  ): void {
    const next = { ...this.filters };
    if (filter) {
      next[field] = filter;
    } else {
      delete next[field];
    }
    this.filters = next;
  }

  #onTextFilterInput(field: keyof T & string, value: string): void {
    clearTimeout(this.#filterDebounce.get(field));
    this.#filterDebounce.set(
      field,
      setTimeout(() => {
        this.#setFilter(field, value === "" ? undefined : { value });
      }, 300),
    );
  }

  #onSelectFilterChange(field: keyof T & string, values: string[]): void {
    this.#setFilter(field, values.length === 0 ? undefined : { values });
  }

  #isSelected(row: T): boolean {
    return this.selected.has(row);
  }

  #setRowSelected(row: T, value: boolean): void {
    const next = new Set(this.selected);
    if (this.selectionMode === "single") {
      next.clear();
      if (value) next.add(row);
    } else if (value) {
      next.add(row);
    } else {
      next.delete(row);
    }
    this.selected = next;
    this.#emitSelectionChange();
  }

  #setVisibleRowsSelected(value: boolean): void {
    const next = new Set(this.selected);
    for (const row of this.rows) {
      if (value) {
        next.add(row);
      } else {
        next.delete(row);
      }
    }
    this.selected = next;
    this.#emitSelectionChange();
  }

  #emitSelectionChange(): void {
    this.dispatchEvent(
      new CustomEvent("row-selection-change", {
        detail: { selected: [...this.selected] },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #onRowClick(row: T): void {
    if (this.selectionMode === "single") {
      this.#setRowSelected(row, true);
    } else if (this.selectionMode === "multi") {
      this.#setRowSelected(row, !this.#isSelected(row));
    }
  }

  #gridTemplateColumns(): string {
    const widths = this.columns.map((column) => `${column.width ?? 100}fr`);
    return this.selectionMode === "multi"
      ? ["2.5em", ...widths].join(" ")
      : widths.join(" ");
  }

  protected firstUpdated(): void {
    this.#ready = true;
    this.#refresh();
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (!this.#ready) return;

    // Sort/filter/page-size/pagination-mode changes jump back to page 0 —
    // staying on, say, page 5 of a now-much-smaller filtered result would
    // just show an empty page. Setting `page` (when it's not already 0)
    // triggers its own `updated()` call, which the `changed.has("page")`
    // branch below then turns into the actual refresh.
    const resetsPage =
      changed.has("sort") ||
      changed.has("filters") ||
      changed.has("pageSize") ||
      changed.has("pagination");
    if (resetsPage && this.page !== 0) {
      this.page = 0;
      return;
    }

    if (
      changed.has("data") ||
      changed.has("dataSource") ||
      changed.has("page") ||
      resetsPage
    ) {
      this.#refresh();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#activeRequest?.abort();
    clearTimeout(this.#loadingSpinnerTimer);
    for (const timer of this.#filterDebounce.values()) clearTimeout(timer);
  }

  render() {
    const selected = this.selectedRows;
    const visibleActions = this.actions.filter((action) => {
      switch (action.type) {
        case "general":
          return true;
        case "single":
          return selected.length === 1;
        case "multi":
          return selected.length > 1;
      }
    });

    const hasFilters = this.columns.some((column) => column.filter);
    const gridTemplateColumns = this.#gridTemplateColumns();
    const allVisibleSelected =
      this.rows.length > 0 && this.rows.every((row) => this.#isSelected(row));
    const someVisibleSelected = this.rows.some((row) => this.#isSelected(row));

    const pageSize = this.#effectivePageSize();
    const pageCount = Math.max(1, Math.ceil(this.rowCount / pageSize));
    // Drives the nav buttons' own enabled/disabled state and +/-1 arithmetic
    // — based on `page` itself, so it's immediately consistent with clicks
    // (including rapid repeated ones) rather than lagging behind a request.
    const currentPage = Math.min(this.page, pageCount - 1);
    // Drives the pagination bar's own displayed text (see `#displayPage`'s
    // own doc) — lags behind `currentPage` until the rows it describes have
    // actually loaded.
    const displayPage = Math.min(this.#displayPage, pageCount - 1);
    const rangeStart = this.rowCount === 0 ? 0 : displayPage * pageSize + 1;
    const rangeEnd = Math.min(rangeStart + pageSize - 1, this.rowCount);

    return html`
      ${this.title || this.subtitle || visibleActions.length > 0
        ? html`<div class="header">
            ${this.title || this.subtitle
              ? html`<div class="header-text">
                  ${this.title
                    ? html`<h2 class="title">${this.title}</h2>`
                    : nothing}
                  ${this.subtitle
                    ? html`<p class="subtitle">${this.subtitle}</p>`
                    : nothing}
                </div>`
              : nothing}
            ${visibleActions.length > 0
              ? html`<div class="toolbar">
                  ${visibleActions.map(
                    (action) => html`
                      <ui-button
                        appearance="neutral"
                        variant="outlined"
                        size="medium"
                        ?disabled=${action.disabled}
                        @click=${() => action.onClick(selected)}
                      >
                        ${action.icon
                          ? html`<span slot="prefix">${action.icon}</span>`
                          : nothing}
                        ${action.label}
                      </ui-button>
                    `,
                  )}
                </div>`
              : nothing}
          </div>`
        : nothing}

      <div
        class="grid-panel ${this.showLoadingSpinner ? "loading" : ""}"
        ?inert=${this.showLoadingSpinner}
      >
        <div class="grid-wrapper" style="height: ${this.height}">
          <div class="table" role="table">
            <div class="thead" role="rowgroup">
              <div
                class="row header-row"
                role="row"
                style="grid-template-columns: ${gridTemplateColumns}"
              >
                ${this.selectionMode === "multi"
                  ? html`<div class="cell select-cell">
                      <ui-checkbox
                        .checked=${allVisibleSelected}
                        .indeterminate=${someVisibleSelected && !allVisibleSelected}
                        ?disabled=${this.rows.length === 0}
                        @change=${(event: Event) =>
                          this.#setVisibleRowsSelected(
                            (event.target as Checkbox).checked,
                          )}
                      ></ui-checkbox>
                    </div>`
                  : nothing}
                ${this.columns.map((column) => {
                  const sortable = column.sortable ?? true;
                  const sortDirection =
                    this.sort?.field === column.field
                      ? this.sort.direction
                      : undefined;
                  return html`
                    <div
                      class="cell header-cell ${sortable ? "sortable" : ""}"
                      role="columnheader"
                      @click=${() => this.#toggleSort(column)}
                    >
                      <span class="header-cell-text"
                        >${column.header ?? column.field}</span
                      >
                      ${sortDirection
                        ? html`<span class="sort-icon">
                            ${sortDirection === "asc"
                              ? chevronUpIcon
                              : chevronDownIcon}
                          </span>`
                        : nothing}
                    </div>
                  `;
                })}
              </div>
    
              ${hasFilters
                ? html`<div
                    class="row filter-row"
                    role="row"
                    style="grid-template-columns: ${gridTemplateColumns}"
                  >
                    ${this.selectionMode === "multi"
                      ? html`<div class="cell"></div>`
                      : nothing}
                    ${this.columns.map((column) => {
                      const filter = this.filters[column.field];
                      return html`
                        <div class="cell filter-cell">
                          ${column.filter === "select"
                            ? html`<ui-select
                                size="small"
                                multiple
                                popup-portal
                                placeholder="(All)"
                                max-options-visible="1"
                                .values=${(filter as { values: string[] } | undefined)
                                  ?.values ?? []}
                                @change=${(event: Event) =>
                                  this.#onSelectFilterChange(
                                    column.field,
                                    (event.target as Select).values,
                                  )}
                              >
                                ${(
                                  column.selectOptions ??
                                  this.#distinctValues(column.field)
                                ).map(
                                  (value) =>
                                    html`<ui-option value=${value}
                                      >${value}</ui-option
                                    >`,
                                )}
                              </ui-select>`
                            : column.filter
                              ? html`<ui-text-field
                                  size="small"
                                  placeholder="Filter…"
                                  .value=${(filter as { value: string } | undefined)
                                    ?.value ?? ""}
                                  @input=${(event: Event) =>
                                    this.#onTextFilterInput(
                                      column.field,
                                      (event.target as TextField).value,
                                    )}
                                ></ui-text-field>`
                              : nothing}
                        </div>
                      `;
                    })}
                  </div>`
                : nothing}
            </div>

            <div class="body" role="rowgroup">
              ${this.rows.length === 0
                ? html`<div class="empty-message">
                    ${this.showLoadingSpinner ? "" : "No rows"}
                  </div>`
                : this.rows.map((row) => {
                    const isSelected = this.#isSelected(row);
                    return html`
                      <div
                        class="row body-row ${isSelected ? "selected" : ""}"
                        role="row"
                        style="grid-template-columns: ${gridTemplateColumns}"
                        @click=${() => this.#onRowClick(row)}
                      >
                        ${this.selectionMode === "multi"
                          ? html`<div class="cell select-cell">
                              <ui-checkbox
                                .checked=${isSelected}
                                @click=${(event: Event) =>
                                  event.stopPropagation()}
                                @change=${(event: Event) =>
                                  this.#setRowSelected(
                                    row,
                                    (event.target as Checkbox).checked,
                                  )}
                              ></ui-checkbox>
                            </div>`
                          : nothing}
                        ${this.columns.map((column) => {
                          const raw = (row as Record<string, unknown>)[
                            column.field
                          ];
                          const value = column.valueFormatter
                            ? column.valueFormatter(raw, row)
                            : String(raw ?? "");
                          return html`<div class="cell" role="cell">
                            ${value}
                          </div>`;
                        })}
                      </div>
                    `;
                  })}
            </div>
          </div>
        </div>

        ${this.showLoadingSpinner
          ? html`<div class="loading-overlay">
              <span class="spinner"></span>
            </div>`
          : nothing}

        ${this.pagination
          ? html`<div class="pagination-bar">
              ${this.selectionMode === "multi"
                ? html`<span class="selection-badge"
                    >${checkSquareIcon}${selected.length}</span
                  >`
                : nothing}
              <div class="page-size-group">
                <span class="page-label">Page Size:</span>
                <ui-select
                  class="page-size"
                  size="small"
                  .value=${String(this.pageSize)}
                  @change=${(event: Event) => {
                    this.pageSize = Number((event.target as Select).value);
                  }}
                >
                  ${this.pageSizeOptions.map(
                    (size) =>
                      html`<ui-option value=${String(size)}>${size}</ui-option>`,
                  )}
                </ui-select>
              </div>
              <span class="page-range"
                >${rangeStart} to ${rangeEnd} of ${this.rowCount}</span
              >
              <div class="page-nav">
                <ui-button
                  appearance="neutral"
                  variant="link"
                  style="--btn-font-size: 1.3em; --btn-padding-block: 0.3em; --btn-padding-inline: 0.4em;"
                  aria-label="First page"
                  ?disabled=${currentPage === 0}
                  @click=${() => {
                    this.page = 0;
                  }}
                >
                  ${chevronsLeftIcon}
                </ui-button>
                <ui-button
                  appearance="neutral"
                  variant="link"
                  style="--btn-font-size: 1.3em; --btn-padding-block: 0.3em; --btn-padding-inline: 0.4em;"
                  aria-label="Previous page"
                  ?disabled=${currentPage === 0}
                  @click=${() => {
                    this.page = currentPage - 1;
                  }}
                >
                  ${chevronLeftIcon}
                </ui-button>
                <span class="page-label">Page</span>
                <ui-number-field
                  class="page-input"
                  size="small"
                  hide-stepper
                  centered
                  .value=${String(displayPage + 1)}
                  @keydown=${(event: KeyboardEvent) => {
                    if (event.key === "Enter") {
                      (event.target as NumberField).blur();
                    }
                  }}
                  @change=${(event: Event) =>
                    this.#goToPageInput(
                      (event.target as NumberField).value,
                      pageCount,
                    )}
                ></ui-number-field>
                <span class="page-label">of ${pageCount}</span>
                <ui-button
                  appearance="neutral"
                  variant="link"
                  style="--btn-font-size: 1.3em; --btn-padding-block: 0.3em; --btn-padding-inline: 0.4em;"
                  aria-label="Next page"
                  ?disabled=${currentPage >= pageCount - 1}
                  @click=${() => {
                    this.page = currentPage + 1;
                  }}
                >
                  ${chevronRightIcon}
                </ui-button>
                <ui-button
                  appearance="neutral"
                  variant="link"
                  style="--btn-font-size: 1.3em; --btn-padding-block: 0.3em; --btn-padding-inline: 0.4em;"
                  aria-label="Last page"
                  ?disabled=${currentPage >= pageCount - 1}
                  @click=${() => {
                    this.page = pageCount - 1;
                  }}
                >
                  ${chevronsRightIcon}
                </ui-button>
              </div>
            </div>`
          : nothing}
        </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-datagrid": DataGrid;
  }
}
