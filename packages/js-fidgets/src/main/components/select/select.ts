import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PropertyValues } from "lit";

import { selectStyles } from "./select.styles.js";
import { chevronDownIcon } from "./icons/chevron.icon.js";
import "./option.js";
import "./option-group.js";
import type { Option } from "./option.js";
import { computeFlipPlacement } from "../../shared/dropdown-placement.js";
import { scrollIntoListboxView } from "../../shared/scroll-into-listbox-view.js";

let nextOptionId = 0;

/**
 * A custom `<select>` replacement — pick one value from `<ui-option>` children
 * (optionally grouped under `<ui-option-group>`), styled to match the rest of
 * this design system rather than the native `<select>` popup, which can't be
 * themed. The actual `<ui-option>` elements are slotted, unchanged, into the
 * open listbox; this component only tracks which one is selected/active (see
 * #syncSelected/#setActive) and opens/closes/positions the popup, using the
 * shared flip-when-tight-on-room placement helper (see shared/dropdown-placement.ts)
 * also used by `ui-combobox` and `ui-autocomplete`.
 */
@customElement("ui-select")
export class Select extends LitElement {
  static formAssociated = true;

  #internals: ElementInternals;
  #trigger!: HTMLButtonElement;
  #activeOption?: Option;

  @property()
  accessor name = "";

  @property()
  accessor value = "";

  @property()
  accessor placeholder = "";

  @property({ type: Boolean, reflect: true })
  accessor disabled = false;

  @property({ type: Boolean })
  accessor required = false;

  @property({ reflect: true })
  accessor size: "small" | "medium" | "large" = "medium";

  @state()
  accessor open = false;

  @state()
  accessor placement: "top" | "bottom" = "bottom";

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  static styles = selectStyles;

  protected firstUpdated() {
    this.#trigger = this.renderRoot.querySelector("button")!;
    this.#syncFormValue();
    this.#syncSelected();
    this.#syncValidity();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("value")) {
      this.#syncFormValue();
      this.#syncSelected();
      this.#syncValidity();
    }
    if (changed.has("required")) {
      this.#syncValidity();
    }
    if (changed.has("open") && this.open) {
      this.#updatePlacement();
    }
  }

  #options(): Option[] {
    return [...this.querySelectorAll<Option>("ui-option")];
  }

  get #selectedOption(): Option | undefined {
    return this.#options().find((option) => option.value === this.value);
  }

  #onSlotChange() {
    this.#syncSelected();
  }

  #syncFormValue() {
    this.#internals.setFormValue(this.disabled ? null : this.value || null);
  }

  #syncValidity() {
    if (!this.#trigger) return;

    const flags: ValidityStateFlags = {};
    let message = "";

    if (this.required && !this.value) {
      flags.valueMissing = true;
      message = "Please select an option.";
    }

    this.#internals.setValidity(flags, message, this.#trigger);
    this.toggleAttribute("invalid", !this.#internals.validity.valid);
  }

  #syncSelected() {
    for (const option of this.#options()) {
      option.selected = option.value === this.value;
    }
  }

  #setActive(option: Option | undefined) {
    if (this.#activeOption) this.#activeOption.active = false;
    this.#activeOption = option;
    if (option) {
      option.id ||= `ui-option-${++nextOptionId}`;
      option.active = true;
      const listbox = this.renderRoot.querySelector<HTMLElement>("#listbox");
      if (listbox) scrollIntoListboxView(listbox, option);
    }
  }

  #openList() {
    if (this.open || this.disabled) return;
    this.open = true;
    const options = this.#options().filter((option) => !option.disabled);
    this.#setActive(this.#selectedOption ?? options[0]);
  }

  #closeList() {
    if (!this.open) return;
    this.open = false;
    this.#setActive(undefined);
  }

  #moveActive(delta: number) {
    const options = this.#options().filter((option) => !option.disabled);
    if (options.length === 0) return;

    const current = this.#activeOption
      ? options.indexOf(this.#activeOption)
      : -1;
    const next = Math.min(Math.max(current + delta, 0), options.length - 1);
    this.#setActive(options[next]);
  }

  #selectActive() {
    if (this.#activeOption) this.#pick(this.#activeOption);
  }

  #pick(option: Option) {
    const changed = this.value !== option.value;
    this.value = option.value;
    this.#closeList();
    this.#trigger.focus();
    if (changed) {
      this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }
  }

  #onTriggerClick() {
    if (this.open) {
      this.#closeList();
    } else {
      this.#openList();
    }
  }

  #onTriggerKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (this.open) this.#moveActive(1);
        else this.#openList();
        break;
      case "ArrowUp":
        event.preventDefault();
        if (this.open) this.#moveActive(-1);
        else this.#openList();
        break;
      case "Home":
        if (this.open) {
          event.preventDefault();
          const options = this.#options().filter((option) => !option.disabled);
          this.#setActive(options[0]);
        }
        break;
      case "End":
        if (this.open) {
          event.preventDefault();
          const options = this.#options().filter((option) => !option.disabled);
          this.#setActive(options.at(-1));
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (this.open) this.#selectActive();
        else this.#openList();
        break;
      case "Escape":
        if (this.open) {
          event.preventDefault();
          this.#closeList();
        }
        break;
      case "Tab":
        this.#closeList();
        break;
      default:
        break;
    }
  }

  #onTriggerBlur() {
    this.#closeList();
  }

  #onListboxClick(event: Event) {
    const option = (event.target as Element).closest(
      "ui-option",
    ) as Option | null;
    if (!option || option.disabled) return;
    this.#pick(option);
  }

  // Keeps focus on the trigger through a listbox click rather than letting it
  // blur (which would close the popup, via #onTriggerBlur, before the click
  // that picks from it lands) — same technique as ui-combobox's
  // onOptionPointerDown.
  #onListboxPointerDown(event: Event) {
    event.preventDefault();
  }

  // Flips the popup above the trigger when there isn't enough room below for it
  // but there is more room above than below — see shared/dropdown-placement.ts
  // (same helper ui-combobox and ui-autocomplete use).
  #updatePlacement() {
    const listbox = this.renderRoot.querySelector<HTMLElement>("#listbox");
    if (!listbox) return;

    this.placement = computeFlipPlacement(
      this.getBoundingClientRect(),
      listbox.offsetHeight,
    );
  }

  focus(options?: FocusOptions) {
    this.#trigger?.focus(options);
  }

  blur() {
    this.#trigger?.blur();
  }

  formResetCallback() {
    this.value = "";
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === "string") {
      this.value = state;
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
      this.#internals.setValidity({ customError: true }, message, this.#trigger);
    } else {
      this.#syncValidity();
    }
  }

  render() {
    const label = this.#selectedOption?.label ?? "";

    return html`
      <button
        type="button"
        class="trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded=${this.open}
        aria-controls="listbox"
        aria-activedescendant=${this.#activeOption?.id ?? nothing}
        ?disabled=${this.disabled}
        @click=${this.#onTriggerClick}
        @keydown=${this.#onTriggerKeydown}
        @blur=${this.#onTriggerBlur}
      >
        <span class="value ${label ? "" : "placeholder"}">
          ${label || this.placeholder}
        </span>
        <span class="chevron ${this.open ? "chevron-open" : ""}"
          >${chevronDownIcon}</span
        >
      </button>
      <div
        id="listbox"
        role="listbox"
        class="listbox listbox-${this.placement}"
        ?hidden=${!this.open}
        @click=${this.#onListboxClick}
        @pointerdown=${this.#onListboxPointerDown}
      >
        <slot @slotchange=${this.#onSlotChange}></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-select": Select;
  }
}
