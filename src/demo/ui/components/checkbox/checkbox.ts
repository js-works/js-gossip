import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PropertyValues } from "lit";

import { checkboxStyles } from "./checkbox.styles.js";
import { checkIcon } from "./icons/check.icon.js";
import { dashIcon } from "./icons/dash.icon.js";

/**
 * A tri-state checkbox (checked / unchecked / indeterminate), form-associated like
 * the demo's other custom fields. Wraps a real `<input type="checkbox">` — visually
 * hidden but still focusable and keyboard-operable — inside a `<label>`, so the
 * native label-wraps-input association makes the whole row (box + slotted label
 * text) clickable without any click handling of our own; a decorative `.box`
 * sibling (see checkbox.styles.ts) draws the actual checked/indeterminate glyph.
 *
 * Label content is the default slot: `<ui-checkbox name="subscribe">Subscribe to
 * updates</ui-checkbox>`, rather than a separate wrapping `<label>` element the way
 * a plain native checkbox needs — one less thing for a consumer to wire up.
 */
@customElement("ui-checkbox")
export class UiCheckbox extends LitElement {
  static formAssociated = true;

  #internals: ElementInternals;
  #input!: HTMLInputElement;
  // What `formResetCallback` restores — captured once, from whatever `checked`
  // resolved to (attribute or property) by the first update, matching how a native
  // checkbox's `defaultChecked` freezes at its initial attribute.
  #defaultChecked = false;

  @property()
  accessor name = "";

  // Matches native `<input type="checkbox">`'s own default `value` of "on" — the
  // value submitted when checked; unchecked never submits anything, same as native.
  @property()
  accessor value = "on";

  @property({ type: Boolean })
  accessor checked = false;

  @property({ type: Boolean })
  accessor indeterminate = false;

  @property({ type: Boolean })
  accessor disabled = false;

  @property({ type: Boolean })
  accessor required = false;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  static styles = checkboxStyles;

  protected firstUpdated() {
    this.#input = this.renderRoot.querySelector("input")!;
    this.#defaultChecked = this.checked;
    this.#syncFormValue();
    this.#syncValidity();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("checked") || changed.has("disabled")) {
      this.#syncFormValue();
    }
    if (changed.has("required") || changed.has("checked")) {
      this.#syncValidity();
    }
  }

  #syncFormValue() {
    this.#internals.setFormValue(
      this.disabled ? null : this.checked ? this.value : null,
    );
  }

  #syncValidity() {
    if (!this.#input) return;

    const flags: ValidityStateFlags = {};
    let message = "";

    if (this.required && !this.checked) {
      flags.valueMissing = true;
      message = "This field is required.";
    }

    this.#internals.setValidity(flags, message, this.#input);
    this.toggleAttribute("invalid", !this.#internals.validity.valid);
  }

  #onChange(event: Event) {
    const input = event.target as HTMLInputElement;

    this.checked = input.checked;
    // Clicking a checkbox always clears indeterminate natively, before this
    // handler runs — mirror that onto our own tracked property so the next
    // render's `.indeterminate=` binding doesn't stomp the native state back to
    // stale `true`.
    this.indeterminate = input.indeterminate;

    this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }

  formResetCallback() {
    this.checked = this.#defaultChecked;
    if (this.#input) {
      this.#input.checked = this.#defaultChecked;
    }
    this.#syncFormValue();
    this.#syncValidity();
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    const isChecked = typeof state === "string";
    this.checked = isChecked;
    if (this.#input) {
      this.#input.checked = isChecked;
    }
    this.#syncFormValue();
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
      this.#syncValidity();
    }
  }

  focus(options?: FocusOptions) {
    this.#input?.focus(options);
  }

  render() {
    return html`
      <label class="wrapper">
        <input
          type="checkbox"
          class="native"
          name=${this.name}
          .checked=${this.checked}
          .indeterminate=${this.indeterminate}
          ?disabled=${this.disabled}
          ?required=${this.required}
          @change=${this.#onChange}
        />
        <span
          class="box ${this.indeterminate
            ? "indeterminate"
            : this.checked
              ? "checked"
              : ""}"
        >
          ${this.indeterminate ? dashIcon : this.checked ? checkIcon : nothing}
        </span>
        <span class="label"><slot></slot></span>
      </label>
    `;
  }
}
