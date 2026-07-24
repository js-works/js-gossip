import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  InfiniteRowModelModule,
  PaginationModule,
  CustomFilterModule,
  RowSelectionModule,
  EventApiModule,
  RowApiModule,
  ValidationModule,
  themeQuartz,
  createGrid,
} from "ag-grid-community";
import type {
  ColDef,
  ColDefField,
  GridApi,
  GridOptions,
  ICellRendererComp,
  ICellRendererParams,
  IDatasource,
  IDoesFilterPassParams,
  IFilterComp,
  IFilterParams,
  IFloatingFilterComp,
  IFloatingFilterParams,
  IGetRowsParams,
  IHeaderComp,
  IHeaderParams,
  IRowNode,
  RowSelectionOptions,
  SelectionChangedEvent,
  ValueFormatterParams,
} from "ag-grid-community";

import { agGridStyles } from "./ag-grid.styles.js";
import "../button/button.js";
import "../text-field/text-field.js";
import type { TextField } from "../text-field/text-field.js";
import "../select/select.js";
import type { Select } from "../select/select.js";
import type { Option } from "../select/option.js";
import "../checkbox/checkbox.js";
import type { Checkbox } from "../checkbox/checkbox.js";

// Registered once per module load, not per instance. AG Grid Community is
// split into feature modules precisely so a consumer only pays (in bundle
// size) for what's actually used — this is deliberately a narrow slice:
// client-side rows, infinite-row-model rows (for `dataSource` — see
// AgGridDataSource below), pagination, row selection, dev-time validation
// warnings, and CustomFilterModule (both filters below are custom
// components, not AG Grid's own `agTextColumnFilter`/etc. — see the comment
// above SimpleFilter). EventApiModule/RowApiModule are here specifically for
// HeaderSelectAll's own use of `api.addEventListener`/`api.forEachNode`
// below — both throw a runtime "module not registered" error otherwise, even
// though `GridApi`'s TypeScript types don't reflect that split. None of AG
// Grid's larger optional features (row grouping/pivoting, master/detail,
// integrated charts, tool panels, the Enterprise-only server-side row
// model, …) are registered, so they never reach the bundle.
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  InfiniteRowModelModule,
  PaginationModule,
  CustomFilterModule,
  RowSelectionModule,
  EventApiModule,
  RowApiModule,
  ValidationModule,
]);

// Maps AG Grid's Theming API onto this library's own --ui-* tokens (see
// theming/theme.ts) so ui-ag-grid reads as part of the same design system as
// every other component here rather than an embedded third-party widget.
// `fontFamily` is given a plain CSS value (not `{ googleFont: … }`, themeQuartz's
// own default) so the grid never triggers AG Grid's default network fetch of a
// Google Font. No `input*` params here (unlike an earlier version of this
// file) — both floating filters below render this library's own
// `ui-text-field`/`ui-select`, themed the normal way already.
const theme = themeQuartz.withParams({
  accentColor: "var(--ui-color-primary-500)",
  backgroundColor: "var(--ui-bg)",
  foregroundColor: "var(--ui-text)",
  textColor: "var(--ui-text)",
  borderColor: "var(--ui-color-neutral-200)",
  chromeBackgroundColor: "var(--ui-color-neutral-50)",
  headerBackgroundColor: "var(--ui-color-neutral-50)",
  headerTextColor: "var(--ui-text)",
  fontFamily: "var(--ui-font-sans)",
  fontSize: "var(--ui-font-size-sm)",
  borderRadius: "var(--ui-radius-sm)",
  wrapperBorderRadius: "var(--ui-radius-md)",
  // Deliberately independent of `accentColor` above (which stays primary
  // regardless — checkboxes, sort icons, focus rings, …): these two drive
  // *only* row selection/hover, and read `--ag-grid-row-accent`, a CSS
  // custom property `ag-grid.styles.ts` toggles via
  // `:host([selection-appearance])` (see `AgGrid.selectionAppearance`) — so
  // that property can flip both, plus the matching border-color rule in
  // ag-grid.styles.ts, between neutral/primary without recreating the grid
  // or this theme object.
  selectedRowBackgroundColor:
    "color-mix(in srgb, var(--ag-grid-row-accent) 12%, var(--ui-bg))",
  rowHoverColor: "color-mix(in srgb, var(--ag-grid-row-accent) 6%, var(--ui-bg))",
});

// --- Both floating filters are built from this library's own field
// components, not AG Grid's — both are custom filter + floating filter
// pairs (`CustomFilterModule` above), which also means neither goes through
// `agTextColumnFilter`/`agNumberColumnFilter`/`agSetColumnFilter` at all, so
// there's no AG Grid provided-filter behavior (operators, debounce
// defaults, …) to reconcile with a UI we don't render ourselves. Both
// suppress AG Grid's header filter button/popup entirely (see
// `suppressHeaderFilterButton`/`suppressFloatingFilterButton` in
// #columnDefs) — the floating filter is the *only* UI, matching the "simple
// filter, not a gateway to AG Grid's whole filter model" scope from
// `AgGridColumn.filter`'s doc below.

// `filter: true` — a case-insensitive "contains" match against the field's
// stringified value, typed into a `ui-text-field`. Deliberately one simple
// rule for every data type rather than AG Grid's own type-aware operators
// (equals/greaterThan/inRange/…) — this is meant to stay "the simple filter".
interface SimpleFilterModel {
  value: string;
}

class SimpleFilter implements IFilterComp {
  #value = "";
  #params!: IFilterParams;

  init(params: IFilterParams) {
    this.#params = params;
  }

  getGui(): HTMLElement {
    return document.createElement("div");
  }

  doesFilterPass(params: IDoesFilterPassParams): boolean {
    if (!this.#value) return true;
    const raw = this.#params.getValue(params.node);
    return String(raw ?? "")
      .toLowerCase()
      .includes(this.#value.toLowerCase());
  }

  isFilterActive(): boolean {
    return this.#value !== "";
  }

  getModel(): SimpleFilterModel | null {
    return this.#value === "" ? null : { value: this.#value };
  }

  setModel(model: SimpleFilterModel | null): void {
    this.#value = model?.value ?? "";
  }

  // Called by SimpleFloatingFilter via `parentFilterInstance` below.
  onFloatingInput(value: string): void {
    this.#value = value;
    this.#params.filterChangedCallback();
  }
}

class SimpleFloatingFilter implements IFloatingFilterComp<SimpleFilter> {
  #field!: TextField;
  #debounce?: ReturnType<typeof setTimeout>;

  init(params: IFloatingFilterParams<SimpleFilter>) {
    const field = document.createElement("ui-text-field") as TextField;
    field.size = "small";
    field.placeholder = "Filter…";
    // Debounced by hand (~300ms) — this is a plain custom filter, not one of
    // AG Grid's provided filters, so there's no built-in `debounceMs` to lean
    // on the way the earlier, AG-Grid-rendered version of this filter had.
    field.addEventListener("input", () => {
      clearTimeout(this.#debounce);
      this.#debounce = setTimeout(() => {
        params.parentFilterInstance((instance) =>
          instance.onFloatingInput(field.value),
        );
      }, 300);
    });
    this.#field = field;
  }

  getGui(): HTMLElement {
    return this.#field;
  }

  onParentModelChanged(model: SimpleFilterModel | null): void {
    this.#field.value = model?.value ?? "";
  }
}

// `filter: "select"` — a multi-select dropdown listing whatever values are
// actually present in the column's data (computed in #columnDefs below); a
// row passes if its value is one of the ones currently picked (any picked at
// all = pass everything, same "not active" convention every filter here
// uses). Stands in for AG Grid's own checkbox-list filter
// (`agSetColumnFilter`), which is Enterprise-only.
//
// This is `ui-select` itself (`multiple`, so a real multi-value picker, not
// just an exact-match single choice) with `popup-portal` set — AG Grid's
// floating filter cell reuses the `.ag-header-cell` class (yes, even the
// floating filter row), which sets `overflow: hidden` and a fixed height;
// `ui-select`'s dropdown is normally a locally-positioned element (see
// shared/popup-layout/popup-layout.ts) that gets clipped the moment it needs
// to extend past that cell. `popup-portal` promotes the dropdown into the
// browser's top layer via the Popover API instead, which no ancestor's
// `overflow`/`z-index` can touch — see that property's own doc comment on
// `Select` for the full story.
interface CategoryFilterModel {
  values: string[];
}

class CategoryFilter implements IFilterComp {
  #values: string[] = [];
  #params!: IFilterParams;

  init(params: IFilterParams) {
    this.#params = params;
  }

  getGui(): HTMLElement {
    return document.createElement("div");
  }

  doesFilterPass(params: IDoesFilterPassParams): boolean {
    if (this.#values.length === 0) return true;
    return this.#values.includes(
      String(this.#params.getValue(params.node) ?? ""),
    );
  }

  isFilterActive(): boolean {
    return this.#values.length > 0;
  }

  getModel(): CategoryFilterModel | null {
    return this.#values.length === 0 ? null : { values: this.#values };
  }

  setModel(model: CategoryFilterModel | null): void {
    this.#values = model?.values ?? [];
  }

  // Called by CategoryFloatingFilter via `parentFilterInstance` below.
  onFloatingSelect(values: string[]): void {
    this.#values = values;
    this.#params.filterChangedCallback();
  }
}

class CategoryFloatingFilter implements IFloatingFilterComp<CategoryFilter> {
  #select!: Select;

  init(params: IFloatingFilterParams<CategoryFilter>) {
    const select = document.createElement("ui-select") as Select;
    select.size = "small";
    select.multiple = true;
    select.popupPortal = true;
    select.placeholder = "(All)";
    // A narrow floating filter cell has no room for more than one pill
    // before it'd start wrapping/growing — collapse the rest into "+N"
    // instead (see ui-select's maxOptionsVisible).
    select.maxOptionsVisible = 1;

    // `values` isn't a real IFilterParams field — it's this column's own
    // `filterParams: { values }` (set in #columnDefs), which AG Grid merges
    // into what's handed to the floating filter unchanged (the same channel
    // the docs describe for the provided filters' own `debounceMs`).
    const values =
      (params.filterParams as unknown as { values?: string[] }).values ?? [];
    for (const value of values) {
      const option = document.createElement("ui-option") as Option;
      option.value = value;
      option.textContent = value;
      select.append(option);
    }

    select.addEventListener("change", () => {
      const picked = select.values;
      params.parentFilterInstance((instance) =>
        instance.onFloatingSelect(picked),
      );
    });
    this.#select = select;
  }

  getGui(): HTMLElement {
    return this.#select;
  }

  onParentModelChanged(model: CategoryFilterModel | null): void {
    this.#select.values = model?.values ?? [];
  }
}

// Both selection-column pieces below (this header checkbox, and
// RowSelectionCheckbox further down) replace AG Grid's own native checkbox
// rendering with this library's own `ui-checkbox`, wired in unconditionally
// via `#gridOptions()`'s shared `selectionColumnDef` — so the selection
// column looks like the rest of a `ui-ag-grid`-hosting app rather than an
// embedded third-party widget's own input styling, in both `data` and
// `dataSource` mode alike.
//
// This one specifically also *fixes* something AG Grid's own native header
// checkbox can't do at all under `dataSource` mode: that native checkbox is
// implemented deep inside ag-grid-community by a `SelectAllFeature` gated to
// `rowModelType: "clientSide"`/`"serverSide"` — Infinite Row Model
// (`dataSource` mode's row model, see AgGridDataSource's own doc) isn't in
// that list, so AG Grid's own `headerCheckbox: true` silently renders
// nothing there. Worse, `GridApi.selectAll()`/`deselectAll()` are *also*
// gated the same way internally (`canSelectAll()` no-ops `selectAll()`, and
// `deselectAll("currentPage"/"filtered")` throws error #102) — so this
// reimplements the whole thing directly against `IRowNode.setSelected()`,
// the un-gated primitive a per-row checkbox click already uses (which is
// why individual row selection works fine under this row model despite the
// above), plus `api.forEachNode` to reach every currently-known node.
//
// That last part is also why using this everywhere (not just for
// `dataSource` mode) doesn't change `data` mode's own behavior: `forEachNode`
// visits every node the row model currently holds, which for Client-Side Row
// Model genuinely is every row (the whole array lives in memory at once —
// AG Grid's own native default, `selectAll: "all"`, means exactly this
// already), and for Infinite Row Model is only whatever's in AG Grid's
// current cache block — which, since `#gridOptions()` sets `cacheBlockSize`
// equal to `pageSize`, is exactly this page's rows, the same range an
// `AgGridDataRequest`'s `startRow`/`endRow` would describe. Each mode's
// natural "everything I currently know about" already lines up with what
// that mode's own selection semantics should be.
class HeaderSelectAll<T> implements IHeaderComp {
  #checkbox!: Checkbox;
  #api!: GridApi<T>;
  #unsubscribe?: () => void;

  init(params: IHeaderParams<T>) {
    this.#api = params.api;
    const checkbox = document.createElement("ui-checkbox") as Checkbox;
    checkbox.addEventListener("change", () => {
      const next = checkbox.checked;
      // Not `api.selectAll()`/`deselectAll()` — both are *also* gated to
      // Client-Side Row Model internally (`canSelectAll()` inside
      // ag-grid-community silently no-ops `selectAll()`, and errors #102 on
      // `deselectAll("currentPage")`), the same restriction that hides the
      // native header checkbox in the first place. `node.setSelected()`
      // isn't gated — it's the same primitive a per-row checkbox click
      // already uses, which is why individual row selection works fine
      // under this row model despite the above.
      this.#api.forEachNode((node) => {
        if (node.data === undefined) return;
        node.setSelected(next);
      });
    });
    this.#checkbox = checkbox;

    const update = () => this.#update();
    const events = [
      "selectionChanged",
      "modelUpdated",
      "paginationChanged",
    ] as const;
    for (const event of events) this.#api.addEventListener(event, update);
    this.#unsubscribe = () => {
      for (const event of events) this.#api.removeEventListener(event, update);
    };
    this.#update();
  }

  getGui(): HTMLElement {
    return this.#checkbox;
  }

  refresh(): boolean {
    return true;
  }

  destroy() {
    this.#unsubscribe?.();
  }

  #update() {
    let total = 0;
    let selected = 0;
    // Loading-placeholder nodes (a block requested but not yet resolved)
    // have no `data` yet — skip them rather than counting them as
    // unselected, which would make the checkbox appear indeterminate for a
    // fully-selected page that just hasn't finished loading.
    this.#api.forEachNode((node) => {
      if (node.data === undefined) return;
      total++;
      if (node.isSelected()) selected++;
    });
    this.#checkbox.checked = total > 0 && selected === total;
    this.#checkbox.indeterminate = selected > 0 && selected < total;
    this.#checkbox.disabled = total === 0;
  }
}

// The per-row selection checkbox — see HeaderSelectAll's own doc for why
// both exist. `IRowNode`'s own `rowSelected` event (rather than relying on
// AG Grid calling `refresh()`, which only fires for actual param/value
// changes, not selection) is what a click elsewhere — the header checkbox
// above, or `enableClickSelection` letting a plain row click toggle
// selection — needs to stay in sync here.
class RowSelectionCheckbox<T> implements ICellRendererComp<T> {
  #checkbox!: Checkbox;
  #node!: IRowNode<T>;
  #onRowSelected = () => {
    this.#checkbox.checked = this.#node.isSelected() ?? false;
  };

  init(params: ICellRendererParams<T>) {
    this.#node = params.node;
    const checkbox = document.createElement("ui-checkbox") as Checkbox;
    checkbox.checked = params.node.isSelected() ?? false;
    // Without this, a checkbox click also bubbles up as a plain click on
    // the row — which `enableClickSelection`/`enableSelectionWithoutKeys`
    // (#rowSelectionOption's "multi" case) treats as its own toggle, right
    // alongside the explicit `setSelected()` below, canceling each other
    // out. AG Grid's own native checkbox stops this the same way; ours has
    // to do it by hand since it's a real click on a real element, not
    // AG Grid's own internal one.
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", () => {
      params.node.setSelected(checkbox.checked);
    });
    params.node.addEventListener("rowSelected", this.#onRowSelected);
    this.#checkbox = checkbox;
  }

  getGui(): HTMLElement {
    return this.#checkbox;
  }

  refresh(params: ICellRendererParams<T>): boolean {
    // AG Grid can recycle a cell renderer instance onto a different row
    // node entirely (row virtualization) — re-subscribe rather than leaving
    // a listener on the node this instance no longer represents.
    if (params.node !== this.#node) {
      this.#node.removeEventListener("rowSelected", this.#onRowSelected);
      this.#node = params.node;
      this.#node.addEventListener("rowSelected", this.#onRowSelected);
    }
    this.#checkbox.checked = this.#node.isSelected() ?? false;
    return true;
  }

  destroy() {
    this.#node.removeEventListener("rowSelected", this.#onRowSelected);
  }
}

/**
 * This component's own column shape — deliberately not AG Grid's `ColDef`
 * (same rationale as `ui-data-navigator`'s `DataNavigatorColumn`: AG Grid is
 * an internal implementation detail, so a consumer of `ui-ag-grid` should
 * never need to import anything from `ag-grid-community` themselves, or learn
 * its property names).
 */
export interface AgGridColumn<T> {
  /** Which field of a row this column reads from. */
  field: keyof T & string;
  /** Column header label. Falls back to `field` if omitted. */
  header?: string;
  /** Fixed width in pixels. Columns without one share the remaining space equally. */
  width?: number;
  /** Whether clicking the header sorts by this column. Defaults to true. */
  sortable?: boolean;
  /**
   * Enables filtering for this column, as a "floating filter" built from this
   * library's own field components — a plain control directly beneath the
   * header, no menu to open (AG Grid's fuller operator/menu-based filter
   * isn't exposed here, on purpose — this is meant to be the "simple filter",
   * not a gateway to AG Grid's whole filter model).
   *
   * - `true`: a `ui-text-field` that filters as you type — a case-insensitive
   *   "contains" match against the field's stringified value, debounced
   *   ~300ms.
   * - `"select"`: a multi-select dropdown listing every distinct value seen
   *   in `data` for this field (or `selectOptions`, if given — see below) —
   *   a row passes if its value is one of the ones currently picked. A
   *   better fit than free text for a column with a small fixed set of
   *   values (e.g. a status or category).
   *
   * Defaults to false.
   */
  filter?: boolean | "select";
  /**
   * Explicit dropdown values for a `"select"` filter — only needed when
   * `dataSource` is used instead of `data` (see `AgGrid.dataSource`), since
   * then there's no complete local dataset to scan for "every distinct value
   * seen". Ignored for any other `filter` setting. Falls back to scanning
   * `data` when omitted, which is the only option that made sense before
   * `dataSource` existed and remains the default for that mode.
   */
  selectOptions?: string[];
  /** Formats the raw cell value for display; defaults to printing it as-is. */
  valueFormatter?: (value: unknown, row: T) => string;
}

/** One column's current sort — part of an `AgGridDataRequest`. */
export interface AgGridSort<T> {
  field: keyof T & string;
  direction: "asc" | "desc";
}

/**
 * One column's current filter value, keyed by field in
 * `AgGridDataRequest.filters` — the same two shapes `SimpleFilter`/
 * `CategoryFilter` above already produce for `filter: true`/`"select"`
 * respectively, just under a public name so a `dataSource` implementation
 * can apply them without reaching into this file's internals.
 */
export type AgGridColumnFilter = { value: string } | { values: string[] };

/**
 * What `AgGridDataSource` is called with for one request: the row range AG
 * Grid currently needs, plus whatever sort/filter state should shape it.
 * `startRow`/`endRow` are a half-open range (`[startRow, endRow)`) — e.g.
 * `{ startRow: 20, endRow: 40 }` asks for rows 20 through 39, matching a
 * `pageSize` of 20 on page 2. `signal` aborts when a later request
 * supersedes this one (a fresh sort or page change before this one
 * resolved) — an implementation that's already using `fetch` gets
 * cancellation for free by passing it straight through as `{ signal }`.
 */
export interface AgGridDataRequest<T> {
  startRow: number;
  endRow: number;
  /** Empty when unsorted. Only ever one entry — `ui-ag-grid` doesn't expose multi-column sort. */
  sort: AgGridSort<T>[];
  /** Only present for columns with an active filter. */
  filters: Partial<Record<keyof T & string, AgGridColumnFilter>>;
  signal: AbortSignal;
}

export interface AgGridDataResult<T> {
  /** The rows for the requested `[startRow, endRow)` range. */
  rows: T[];
  /**
   * Total row count across the *entire* dataset (not just this page) —
   * drives the pagination bar's page count. Always required: unlike AG
   * Grid's own Infinite Row Model, which tolerates an unknown total (it
   * just keeps requesting further blocks), this component's pagination UI
   * needs a real count to render page numbers/the "last page" state.
   */
  rowCount: number;
}

/**
 * An async row source — an alternative to `data` for rows that live behind
 * a real request rather than already being fully loaded on the client.
 * Passing this switches the grid from AG Grid's Client-Side Row Model to
 * its Infinite Row Model: sorting and changing page each re-invoke this
 * function for just the range currently in view, instead of AG Grid
 * re-sorting/re-paging an in-memory array — the way a real paginated/sorted
 * server endpoint would actually be driven, with sort/filter/pagination
 * state sent as part of each request rather than applied after the fact to
 * data already sitting in the browser.
 *
 * Mutually exclusive with `data`; whichever is set when the grid first
 * mounts decides its row model, since AG Grid's `rowModelType` can't change
 * after grid creation — pick one at construction, not both interchangeably
 * later. When both are set, `dataSource` wins and `data` is ignored.
 */
export type AgGridDataSource<T> = (
  request: AgGridDataRequest<T>,
) => Promise<AgGridDataResult<T>>;

/**
 * "none": no selection UI. "single": clicking a row selects it (and only it —
 * AG Grid's own `rowSelection: { mode: "singleRow" }`). "multi": a checkbox
 * column (select-all in the header, one per row — `{ mode: "multiRow" }`),
 * AG Grid's standard multi-select behavior.
 */
export type AgGridSelectionMode = "none" | "single" | "multi";

/**
 * "neutral" (default): selected/hovered rows get a grayish tint — the row
 * background, the hover background, and the accent border
 * `ag-grid.styles.ts` draws along a selected/hovered row's top/bottom edge
 * (see its own comment for why that border exists) all switch together.
 * "primary": the same three, but in this component's primary accent color
 * instead. Independent of the `theme` object's own `accentColor` above,
 * which stays primary regardless (checkboxes, sort icons, focus rings, …) —
 * this only ever affects row selection/hover, never the rest of the grid's
 * chrome.
 */
export type AgGridSelectionAppearance = "neutral" | "primary";

/**
 * A toolbar action, rendered as a subtle `ui-button` above the grid. AG Grid
 * does have its own `toolbar` grid option — but that's an Enterprise-only
 * feature (`ToolbarModule` isn't part of `ag-grid-community`), so there's no
 * AG Grid feature to hand this off to; this is a small hand-rolled bar
 * instead, reusing `ui-data-navigator`'s `DataNavigatorAction` shape and
 * visibility rule rather than inventing a third one: "general" always shows,
 * "single" only at exactly one selected row, "multi" only above that, so
 * e.g. an "Edit" action (needs exactly one target) and a "Delete selected"
 * action (needs several) can coexist without either ever showing when it
 * wouldn't make sense. Requires `selectionMode` to be something other than
 * `"none"` for "single"/"multi" actions to ever become visible.
 */
export interface AgGridAction<T> {
  label: string;
  icon?: TemplateResult;
  type: "general" | "single" | "multi";
  onClick: (selected: T[]) => void;
  disabled?: boolean;
}

/**
 * A datagrid built directly on AG Grid Community (the open-source edition of
 * AG Grid) — unlike `ui-data-navigator`, which hand-rolls a table plus
 * TanStack Table, this component hands the rendering surface (rows, header,
 * the pagination bar) to AG Grid itself and only translates this component's
 * own small `columns`/`data` properties into AG Grid's `GridOptions`, via
 * `GridApi.setGridOption` on every change. Filtering is the one exception —
 * both floating filters are custom components (see the two pairs of classes
 * above), not AG Grid's own filter UI, rendering this library's own
 * `ui-text-field`/`ui-select` respectively (the latter with `popup-portal`,
 * so its dropdown escapes AG Grid's clipping header cell — see the comment
 * on CategoryFloatingFilter for the full story).
 *
 * This is deliberately a starting point, not the ceiling: only columns,
 * simple per-column filters (plain "contains" text, or the "select" dropdown
 * — see `SimpleFilter`/`CategoryFilter` above), pagination, row selection,
 * and toolbar actions are wired up (see the `ModuleRegistry.registerModules`
 * call above for exactly which AG Grid modules are pulled in). Richer
 * features AG Grid Community also offers — custom cell renderers/editors,
 * column grouping, CSV export, … — are left for a follow-up once this basic
 * surface is in use.
 *
 * Rows come from either `data` (a plain, already-loaded array — AG Grid's
 * Client-Side Row Model does all sorting/pagination itself, in-browser,
 * against that array) or `dataSource` (an `AgGridDataSource` callback — AG
 * Grid's Infinite Row Model instead, which re-invokes it for the current
 * row range on every sort/page change, the way a real server-backed grid
 * would work). See `AgGridDataSource`'s own doc for why these are mutually
 * exclusive and fixed at mount.
 *
 * Selection (`selectionMode`) is handled entirely through AG Grid's own
 * `rowSelection` grid option and `selectionChanged` event — this component
 * only translates its own `"none" | "single" | "multi"` property into that
 * option (see `#rowSelectionOption` below) and re-exposes the result as a
 * plain `selectedRows` getter plus a `row-selection-change` event carrying
 * this component's own row objects, the same shape `ui-data-navigator` uses,
 * so a caller never needs to import anything from `ag-grid-community` to
 * read a selection back. `actions` (see `AgGridAction`) reads that same
 * selection to decide which toolbar buttons are currently visible.
 * `selectionAppearance` (see `AgGridSelectionAppearance`) is unrelated to
 * any of the above — it only changes the color selected/hovered rows are
 * tinted, not selection behavior itself.
 *
 * AG Grid needs an explicit height on its container — it does not auto-size
 * to its own row count — set via the `height` property (any CSS length).
 *
 * `title`/`subtitle` are an optional plain-text header above the toolbar —
 * same idea, same markup/styling, as `ui-data-navigator`'s own `title`/
 * `subtitle` (this component renders both, not AG Grid, which has no header
 * concept of its own beyond column headers).
 */
@customElement("ui-ag-grid")
export class AgGrid<T = unknown> extends LitElement {
  #gridApi?: GridApi<T>;
  // Aborted whenever a new #buildDatasource() getRows call supersedes an
  // in-flight one (a fresh sort/page-change before the previous request
  // resolved), so a `dataSource` built on `fetch` gets real cancellation.
  #activeRequest?: AbortController;

  @property({ attribute: false })
  accessor columns: AgGridColumn<T>[] = [];

  @property({ attribute: false })
  accessor data: T[] = [];

  // See AgGridDataSource's own doc for the data/dataSource split — this is
  // read only once, at grid creation (#gridOptions() in firstUpdated()),
  // since AG Grid's rowModelType can't change afterwards.
  @property({ attribute: false })
  accessor dataSource: AgGridDataSource<T> | undefined = undefined;

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

  @property({ attribute: "selection-mode" })
  accessor selectionMode: AgGridSelectionMode = "none";

  // reflect: true — ag-grid.styles.ts's `--ag-grid-row-accent` swap is a
  // plain `:host([selection-appearance="primary"])` CSS rule, which needs
  // the live property value mirrored onto the actual DOM attribute (Lit
  // doesn't do that by default; see e.g. ui-select's `size` for the same
  // reflect: true, for the same reason).
  @property({ attribute: "selection-appearance", reflect: true })
  accessor selectionAppearance: AgGridSelectionAppearance = "neutral";

  @property({ attribute: false })
  accessor actions: AgGridAction<T>[] = [];

  @property()
  accessor height = "480px";

  // Mirrors AG Grid's own selection state so render() (the toolbar's
  // visibility rules) reacts to it — kept in sync from #onSelectionChanged.
  // Prefer the `selectedRows` getter below when reading selection outside of
  // render().
  @state()
  accessor selectionSnapshot: T[] = [];

  // Drives the loading-spinner overlay in render() — only ever set from
  // #buildDatasource() below (so only ever true in `dataSource` mode; `data`
  // mode has no async gap to show a spinner for). Delayed by
  // #loadingSpinnerTimer so a request that resolves quickly never flashes it.
  @state()
  accessor showLoadingSpinner = false;

  #loadingSpinnerTimer?: ReturnType<typeof setTimeout>;

  static styles = agGridStyles;

  /** The currently selected rows. */
  get selectedRows(): T[] {
    return this.selectionSnapshot;
  }

  #rowSelectionOption(): RowSelectionOptions<T> | undefined {
    switch (this.selectionMode) {
      case "none":
        return undefined;
      case "single":
        return {
          mode: "singleRow",
          checkboxes: false,
          enableClickSelection: true,
        };
      case "multi":
        // `enableClickSelection` + `enableSelectionWithoutKeys` together make
        // a plain click anywhere on the row toggle its own checkbox (select
        // when unselected, deselect when already selected) — without
        // `enableSelectionWithoutKeys`, a second click on an already-selected
        // row wouldn't deselect it; that'd need Ctrl-click instead (AG
        // Grid's default click behavior for `multiRow`).
        return {
          mode: "multiRow",
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: true,
          enableSelectionWithoutKeys: true,
        };
    }
  }

  #onSelectionChanged = (event: SelectionChangedEvent<T>) => {
    const selected = event.api.getSelectedRows();
    this.selectionSnapshot = selected;
    this.dispatchEvent(
      new CustomEvent("row-selection-change", {
        detail: { selected },
        bubbles: true,
        composed: true,
      }),
    );
  };

  // The distinct values a "select" filter column offers — every value
  // actually present in `data` for that field, so the dropdown never lists a
  // value that would filter down to nothing.
  #distinctValues(field: string): string[] {
    const values = new Set<string>();
    for (const row of this.data) {
      const raw = (row as Record<string, unknown>)[field];
      if (raw !== null && raw !== undefined) values.add(String(raw));
    }
    return [...values].sort();
  }

  #columnDefs(): ColDef<T>[] {
    return this.columns.map((column) => ({
      // AG Grid's own `ColDefField<T>` is a template-literal type over T's
      // nested paths, which can't resolve against our still-generic T here —
      // this cast is safe since `column.field` is already constrained to
      // `keyof T & string` by `AgGridColumn<T>` above.
      field: column.field as unknown as ColDefField<T>,
      headerName: column.header ?? column.field,
      width: column.width,
      flex: column.width === undefined ? 1 : undefined,
      sortable: column.sortable ?? true,
      filter:
        column.filter === "select"
          ? CategoryFilter
          : column.filter
            ? SimpleFilter
            : false,
      floatingFilter: Boolean(column.filter),
      floatingFilterComponent:
        column.filter === "select"
          ? CategoryFloatingFilter
          : column.filter
            ? SimpleFloatingFilter
            : undefined,
      filterParams:
        column.filter === "select"
          ? { values: column.selectOptions ?? this.#distinctValues(column.field) }
          : undefined,
      // Both suppressions remove the only paths into AG Grid's fuller
      // operator/menu-based filter — see the `filter` doc above for why.
      suppressHeaderFilterButton: true,
      suppressFloatingFilterButton: true,
      valueFormatter: column.valueFormatter
        ? (params: ValueFormatterParams<T>) =>
            column.valueFormatter!(params.value, params.data as T)
        : undefined,
    }));
  }

  // Bridges AG Grid's own IDatasource (raw ag-grid-community types: a
  // colId-keyed filterModel, a SortModelItem[] sortModel, index-based
  // callbacks) to the plain `AgGridDataSource<T>` a consumer of this
  // component actually implements — the one seam where this file talks
  // ag-grid-community on one side and this component's own vocabulary on
  // the other.
  #buildDatasource(): IDatasource {
    return {
      getRows: (params: IGetRowsParams) => {
        this.#activeRequest?.abort();
        const request = new AbortController();
        this.#activeRequest = request;

        // Delayed 200ms so a request that resolves quickly never flashes the
        // spinner — restarting this timer (rather than leaving an earlier
        // one running) on every getRows call means a burst of quick
        // supersessions (e.g. clicking through several sorts fast) only
        // starts counting once things settle on the last one.
        clearTimeout(this.#loadingSpinnerTimer);
        this.#loadingSpinnerTimer = setTimeout(() => {
          this.showLoadingSpinner = true;
        }, 200);

        const sort: AgGridSort<T>[] = params.sortModel.flatMap((item) =>
          item.sort === "asc" || item.sort === "desc"
            ? [{ field: item.colId as keyof T & string, direction: item.sort }]
            : [],
        );
        const filters = { ...(params.filterModel as AgGridDataRequest<T>["filters"]) };

        this.dataSource!({
          startRow: params.startRow,
          endRow: params.endRow,
          sort,
          filters,
          signal: request.signal,
        }).then(
          (result) => {
            if (request.signal.aborted) return;
            clearTimeout(this.#loadingSpinnerTimer);
            this.showLoadingSpinner = false;
            params.successCallback(result.rows, result.rowCount);
          },
          () => {
            if (request.signal.aborted) return;
            clearTimeout(this.#loadingSpinnerTimer);
            this.showLoadingSpinner = false;
            params.failCallback();
          },
        );
      },
    };
  }

  #gridOptions(): GridOptions<T> {
    const shared: GridOptions<T> = {
      theme,
      columnDefs: this.#columnDefs(),
      pagination: this.pagination,
      paginationPageSize: this.pageSize,
      paginationPageSizeSelector: this.pageSizeOptions,
      rowSelection: this.#rowSelectionOption(),
      onSelectionChanged: this.#onSelectionChanged,
      // No cell-level focus/keyboard navigation — this is a read-oriented
      // grid (selection is handled at the row level via rowSelection above,
      // not per-cell), and columns are likewise never made resizable (no
      // column here sets `resizable`, nor is there a `defaultColDef` — AG
      // Grid's own default for `resizable` is already false).
      suppressCellFocus: true,
      // See HeaderSelectAll's own doc — both this and RowSelectionCheckbox
      // apply the same in `data` and `dataSource` mode.
      selectionColumnDef: {
        headerComponent: HeaderSelectAll,
        cellRenderer: RowSelectionCheckbox,
      },
    };
    return this.dataSource
      ? {
          ...shared,
          rowModelType: "infinite",
          // One AG Grid "block" per page, so a page turn maps onto exactly
          // one AgGridDataSource request instead of AG Grid batching several
          // pages' worth of rows into a single block.
          cacheBlockSize: this.pageSize,
          // AG Grid's Infinite Row Model otherwise caches every block it's
          // ever fetched, so paging back to an already-seen page reuses the
          // cached rows instead of calling `dataSource` again — 0 disables
          // that: only the page currently on screen is kept, so navigating
          // away and back always issues a fresh request (and re-runs the
          // 200ms-delayed spinner) rather than resolving instantly from
          // cache. Fixed at grid creation (an `@initial` AG Grid option).
          maxBlocksInCache: 0,
          datasource: this.#buildDatasource(),
        }
      : { ...shared, rowData: this.data };
  }

  protected firstUpdated() {
    const container = this.renderRoot.querySelector<HTMLDivElement>(".grid")!;
    this.#gridApi = createGrid(container, this.#gridOptions());
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (!this.#gridApi) return;

    // A "select" column's dropdown values are derived from `data`
    // (`selectOptions`, when given, doesn't need this rebuild — but it's
    // harmless to recompute columnDefs regardless), so a data change needs
    // the same columnDefs rebuild a `columns` change gets.
    if (changed.has("columns") || changed.has("data")) {
      this.#gridApi.setGridOption("columnDefs", this.#columnDefs());
    }
    // Only meaningful in `data` mode — `dataSource` mode never sets
    // `rowData` in the first place (see #gridOptions()).
    if (!this.dataSource && changed.has("data")) {
      this.#gridApi.setGridOption("rowData", this.data);
    }
    if (changed.has("dataSource") && this.dataSource) {
      this.#gridApi.setGridOption("datasource", this.#buildDatasource());
    }
    if (changed.has("pagination")) {
      this.#gridApi.setGridOption("pagination", this.pagination);
    }
    if (changed.has("pageSize")) {
      this.#gridApi.setGridOption("paginationPageSize", this.pageSize);
      if (this.dataSource) {
        this.#gridApi.setGridOption("cacheBlockSize", this.pageSize);
      }
    }
    if (changed.has("pageSizeOptions")) {
      this.#gridApi.setGridOption(
        "paginationPageSizeSelector",
        this.pageSizeOptions,
      );
    }
    if (changed.has("selectionMode")) {
      this.#gridApi.setGridOption("rowSelection", this.#rowSelectionOption());
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#activeRequest?.abort();
    clearTimeout(this.#loadingSpinnerTimer);
    this.#gridApi?.destroy();
    this.#gridApi = undefined;
  }

  render() {
    const selected = this.selectionSnapshot;
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
      <div class="grid-wrapper">
        <div class="grid" style="height: ${this.height}"></div>
        ${this.showLoadingSpinner
          ? html`<div class="loading-overlay">
              <span class="spinner"></span>
            </div>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-ag-grid": AgGrid;
  }
}
