import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PropertyValues } from "lit";

import { comboboxStyles } from "./combobox.styles.js";
import { checkIcon } from "./icons/check.icon.js";
import { chevronDownIcon } from "./icons/chevron.icon.js";
import {
  createSuggestions,
  type SuggestionsHandle,
  type SuggestionState,
  type SuggestionResult,
  type Row,
} from "./suggestions.js";

// How many characters the user must type before this data source is queried at
// all — e.g. skip hitting a server for a 1-character query. This is a trait of a
// *data source* (a plain local filter needs none; a paginated server endpoint might
// need 3), not of the combobox itself, so it's declared on the function rather than
// as a combobox-level property/attribute (a `min-length` attribute there would read
// as a constraint on the length of the *selected value*, like `<input minlength>`).
export type ComboboxDataSource = ((
  query: string,
  opts: { signal: AbortSignal },
) => Promise<SuggestionResult<string>>) & { minLength?: number };

// A labeled run of items — pass an array of these to `items`/`localFilter`
// instead of a flat string array to get a labeled separator per group in the
// dropdown (see suggestions.ts's flatten(), which already renders separators
// for however many groups a data source's result comes back with — this is
// just a declarative way to reach that from the plain `items` list rather
// than writing a custom `dataSource`).
export interface ComboboxItemGroup {
  label?: string;
  items: string[];
}

function isGroupedItems(
  items: readonly string[] | readonly ComboboxItemGroup[],
): items is readonly ComboboxItemGroup[] {
  return items.length > 0 && typeof items[0] !== "string";
}

// Default data source when no `dataSource` override is set: filters `items` locally,
// case-insensitively (within each group, if grouped). The delay keeps the "loading"
// state genuinely reachable rather than only theoretical, and doubles as a
// debounce-friendly stand-in for a real server round-trip.
export function localFilter(
  items: readonly string[] | readonly ComboboxItemGroup[],
  delayMs = 150,
  minLength = 0,
): ComboboxDataSource {
  const groups: ComboboxItemGroup[] = isGroupedItems(items)
    ? items.slice()
    : [{ items: items.slice() }];

  const source: ComboboxDataSource = (query, { signal }) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const q = query.trim().toLowerCase();
        const filtered = groups
          .map((group) => ({
            label: group.label,
            items: q
              ? group.items.filter((item) => item.toLowerCase().includes(q))
              : group.items.slice(),
          }))
          .filter((group) => group.items.length > 0);
        resolve({ groups: filtered });
      }, delayMs);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  source.minLength = minLength;
  return source;
}

/**
 * A combobox: a text input with a filtered dropdown, built on top of the
 * framework-agnostic `createSuggestions` core (see suggestions.ts), which owns
 * querying/debouncing/keyboard navigation. This component only renders that core's
 * state as an ARIA combobox/listbox and forwards the real `<input>` to it — the core
 * attaches its own input/focus/blur/keydown listeners directly.
 *
 * Single-select (default) tracks the pick in `value` and mirrors it into the input
 * text, closing the popup on pick. `multiple` (like `<select multiple>`) instead
 * accumulates picks in `values`, toggling per option and leaving the popup open and
 * the input's text as free-form search; each selected value renders as a removable
 * pill at the start of the field. Form submission then goes through a `FormData`
 * with one entry per selected value rather than a single string.
 *
 * Either pass a static `items` list — a flat string array, or an array of
 * `ComboboxItemGroup` for a labeled separator per group (filtered locally, see
 * `localFilter` above) — or a `dataSource` (e.g. to query a server); `dataSource`
 * takes precedence when set.
 */
@customElement("ui-combobox")
export class Combobox extends LitElement {
  static formAssociated = true;

  #internals: ElementInternals;
  #input!: HTMLInputElement;
  #suggestions?: SuggestionsHandle<string>;

  @property({ type: Array })
  accessor items: string[] | ComboboxItemGroup[] = [];

  @property({ attribute: false })
  accessor dataSource: ComboboxDataSource | undefined = undefined;

  @property()
  accessor name = "";

  @property()
  accessor value = "";

  @property({ type: Boolean })
  accessor multiple = false;

  @property({ type: Array })
  accessor values: string[] = [];

  @property()
  accessor placeholder = "";

  @property({ type: Boolean })
  accessor disabled = false;

  @property({ type: Boolean })
  accessor required = false;

  @property({ reflect: true })
  accessor size: "small" | "medium" | "large" = "medium";

  // Makes the input readonly — pick-only, like a native <select>, rather than a
  // free-text search box the dropdown happens to filter. Typing is blocked (the
  // native `readonly` semantics), but focus/click/keyboard navigation still work
  // normally, so the "open on focus, show every option" behavior (see
  // suggestions.ts's onFocus) is what actually lets you choose a value.
  @property({ type: Boolean })
  accessor dropdown = false;

  @state()
  accessor status: SuggestionState<string>["status"] = "idle";

  // Shown only once "loading" has lasted 100ms (see #updateSpinner) — a data
  // source that resolves faster than that shouldn't ever flash a spinner.
  @state()
  accessor showSpinner = false;

  #spinnerTimer?: ReturnType<typeof setTimeout>;

  @state()
  accessor rows: SuggestionState<string>["rows"] = [];

  @state()
  accessor activeIndex = -1;

  @state()
  accessor open = false;

  @state()
  accessor query = "";

  // Which side of the input the popup renders on. Recomputed on every open/content
  // change (see #updatePlacement) rather than tracked continuously (no resize/scroll
  // listeners) — good enough for a popup that only needs to be positioned right at
  // the moment it appears or its content reflows.
  @state()
  accessor placement: "top" | "bottom" = "bottom";

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.spellcheck = false;
  }

  static styles = comboboxStyles;

  protected firstUpdated() {
    this.#input = this.renderRoot.querySelector("input")!;

    // dropdown mode is pick-only over a static local list, like a native <select>
    // — no server round-trip to stand in for, so unlike the free-typing search
    // case, its default filter shouldn't add localFilter's artificial delay.
    const resolveDataSource = () =>
      this.dataSource ?? localFilter(this.items, this.dropdown ? 0 : undefined);

    this.#suggestions = createSuggestions<string>({
      input: this.#input,
      dataSource: (query, opts) => resolveDataSource()(query, opts),
      getKey: (item) => item,
      selectionMode: this.multiple ? "multi" : "single",
      minLength: resolveDataSource().minLength ?? 0,
      onSelectionChange: (selected) => this.#applySelection(selected),
      onSuggestionsChange: (next) => {
        this.query = next.query;
        this.status = next.status;
        this.rows = next.rows;
        this.activeIndex = next.activeIndex;
        this.open = next.open;
      },
    });

    this.#syncFormValue();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("activeIndex") && this.activeIndex >= 0) {
      this.#scrollActiveIntoView();
    }
    if (
      this.open &&
      (changed.has("open") || changed.has("rows") || changed.has("query"))
    ) {
      this.#updatePlacement();
    }
    if (changed.has("status")) {
      this.#updateSpinner();
    }
  }

  #updateSpinner() {
    clearTimeout(this.#spinnerTimer);
    if (this.status === "loading") {
      this.#spinnerTimer = setTimeout(() => {
        this.showSpinner = true;
      }, 100);
    } else {
      this.showSpinner = false;
    }
  }

  // Flips the popup above the input when there isn't enough room below for it but
  // there is more room above than below.
  #updatePlacement() {
    const listbox = this.renderRoot.querySelector<HTMLElement>("#listbox");
    const status = this.renderRoot.querySelector<HTMLElement>(".status");
    const popup = listbox && !listbox.hidden ? listbox : status;
    if (!popup) return;

    const hostRect = this.getBoundingClientRect();
    const spaceBelow = window.innerHeight - hostRect.bottom;
    const spaceAbove = hostRect.top;

    this.placement =
      popup.offsetHeight > spaceBelow && spaceAbove > spaceBelow
        ? "top"
        : "bottom";
  }

  // Rolled by hand rather than option.scrollIntoView(): that aligns the option
  // flush with the listbox's padding edge, which — once scrolled — leaves the
  // padding-block reserved space permanently scrolled past even when back at the
  // first/last option. Comparing against the padding edges directly keeps the
  // padding visible at both ends.
  #scrollActiveIntoView() {
    const listbox = this.renderRoot.querySelector<HTMLElement>("#listbox");
    const option = this.renderRoot.querySelector<HTMLElement>(
      `#option-${this.activeIndex}`,
    );
    if (!listbox || !option) return;

    const listboxStyle = getComputedStyle(listbox);
    const paddingTop = parseFloat(listboxStyle.paddingTop);
    const paddingBottom = parseFloat(listboxStyle.paddingBottom);
    const listboxRect = listbox.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();

    const topEdge = listboxRect.top + paddingTop;
    const bottomEdge = listboxRect.bottom - paddingBottom;

    if (optionRect.top < topEdge) {
      listbox.scrollTop -= topEdge - optionRect.top;
    } else if (optionRect.bottom > bottomEdge) {
      listbox.scrollTop += optionRect.bottom - bottomEdge;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#suggestions?.destroy();
    clearTimeout(this.#spinnerTimer);
  }

  #applySelection(selected: string[]) {
    if (this.multiple) {
      this.values = selected;
    } else {
      this.value = selected[0] ?? "";
      this.#input.value = this.value;
    }
    this.#syncFormValue();
    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }

  // Multi-select has no single string to submit, so it hands the internals a
  // FormData with one entry per selected value under this element's own `name` —
  // the browser folds those straight into the parent form's submission.
  #syncFormValue() {
    if (this.disabled) {
      this.#internals.setFormValue(null);
      return;
    }
    if (this.multiple) {
      const formData = new FormData();
      for (const item of this.values) {
        formData.append(this.name, item);
      }
      this.#internals.setFormValue(formData);
    } else {
      this.#internals.setFormValue(this.value);
    }
  }

  // Routed through the core's own deselect (rather than splicing `this.values`
  // directly) so its internal `selected` stays in sync — otherwise re-picking the
  // same item from the dropdown later would desync from what the pills show.
  #removePill(item: string, event: Event) {
    event.preventDefault();
    this.#suggestions?.deselect(item);
  }

  #onOptionPointerDown(index: number, event: Event) {
    // Keep focus on the input rather than letting it blur to the option, which
    // would otherwise close the listbox (via the core's onBlur) before the click
    // that selects from it lands.
    event.preventDefault();
    this.#suggestions?.select(index);
  }

  // Same toggle affordance as ui-select's trigger chevron. Focusing the input
  // (rather than calling suggestions.open() alone) is what actually shows every
  // option when nothing's been typed yet — see suggestions.ts's onFocus.
  #onChevronClick() {
    if (this.disabled) return;
    if (this.open) {
      this.#suggestions?.close();
    } else {
      this.#input.focus();
      this.#suggestions?.open();
    }
  }

  formResetCallback() {
    this.value = "";
    this.values = [];
    if (this.#input) {
      this.#input.value = "";
    }
    this.#syncFormValue();
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (this.multiple) {
      if (state instanceof FormData) {
        this.values = state.getAll(this.name).map(String);
        this.#syncFormValue();
      }
      return;
    }
    if (typeof state === "string") {
      this.value = state;
      if (this.#input) {
        this.#input.value = state;
      }
      this.#syncFormValue();
    }
  }

  checkValidity() {
    return this.#internals.checkValidity();
  }

  reportValidity() {
    return this.#internals.reportValidity();
  }

  setCustomValidity(message: string) {
    if (message) {
      this.#internals.setValidity({ customError: true }, message, this.#input);
    } else {
      this.#internals.setValidity({});
    }
  }

  focus(options?: FocusOptions) {
    this.#input?.focus(options);
  }

  #isSelected(item: string): boolean {
    return this.multiple ? this.values.includes(item) : item === this.value;
  }

  render() {
    const activeId =
      this.activeIndex >= 0 ? `option-${this.activeIndex}` : undefined;
    const showListbox = this.open && this.rows.length > 0;

    // Preview the arrow-key-highlighted item in the input itself (single-select
    // only — in multi-select the input stays a free-form search box while picks
    // toggle checkmarks, so previewing one item's text there would fight typing).
    // Falls back to `value` — the last actual pick — whenever nothing is
    // highlighted (activeIndex is -1 both before any navigation and again once the
    // popup closes), which also happens to be the correctly resolved text on
    // Escape/blur without picking, since those reset activeIndex the same way.
    const activeRow = this.rows.find(
      (row): row is Extract<Row<string>, { kind: "item" }> =>
        row.kind === "item" && row.selectableIndex === this.activeIndex,
    );
    const displayValue =
      !this.multiple && activeRow ? activeRow.item : this.value;

    return html`
      <div class="wrapper">
        ${this.multiple
          ? this.values.map(
              (item) => html`<span class="pill">
                <span class="pill-label">${item}</span>
                <button
                  type="button"
                  class="pill-remove"
                  aria-label="Remove ${item}"
                  @pointerdown=${(event: Event) => this.#removePill(item, event)}
                >
                  ×
                </button>
              </span>`,
            )
          : nothing}
        <input
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded=${this.open}
          aria-controls="listbox"
          aria-activedescendant=${activeId ?? nothing}
          .value=${displayValue}
          name=${this.name}
          placeholder=${this.placeholder}
          autocomplete="off"
          spellcheck="false"
          ?disabled=${this.disabled}
          ?required=${this.required}
          ?readonly=${this.dropdown}
        />
        <span class="spinner-slot"
          >${this.showSpinner
            ? html`<span class="spinner"></span>`
            : nothing}</span
        >
        <span
          class="chevron ${this.open ? "chevron-open" : ""}"
          @pointerdown=${(event: Event) => event.preventDefault()}
          @click=${() => this.#onChevronClick()}
          >${chevronDownIcon}</span
        >
        <ul
          id="listbox"
          role="listbox"
          class="listbox listbox-${this.placement}"
          aria-multiselectable=${this.multiple}
          ?hidden=${!showListbox}
          @pointerdown=${(event: Event) => event.preventDefault()}
        >
          ${this.rows.map((row) =>
            row.kind === "separator"
              ? html`<li role="presentation" class="separator">
                  ${row.label ?? nothing}
                </li>`
              : html`<li
                  id="option-${row.selectableIndex}"
                  role="option"
                  class=${row.selectableIndex === this.activeIndex ? "active" : ""}
                  aria-selected=${this.#isSelected(row.item)}
                  @pointerdown=${(event: Event) =>
                    this.#onOptionPointerDown(row.selectableIndex, event)}
                >
                  <span class="check"
                    >${this.#isSelected(row.item) ? checkIcon : nothing}</span
                  >
                  <span class="option-label">${row.item}</span>
                </li>`,
          )}
        </ul>
        ${this.open &&
        this.status === "ready" &&
        this.rows.length === 0 &&
        this.query
          ? html`<div class="status status-${this.placement}">No matches</div>`
          : nothing}
      </div>
    `;
  }
}
