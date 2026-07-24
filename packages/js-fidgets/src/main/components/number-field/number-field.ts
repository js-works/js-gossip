import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PropertyValues } from "lit";

import { defaultTheme } from "../../theming/theme.js";
import {
  renderFieldLabel,
  fieldLabelStyles,
} from "../../shared/field-label/field-label.js";

/**
 * A themed `<input type="number">` — min/max/step/required validity comes
 * straight from the native input's own `ValidityState` (rangeUnderflow/
 * rangeOverflow/stepMismatch/valueMissing), the same delegation approach
 * `ui-email-field` uses for its native email-format check, rather than
 * reimplementing numeric range/step logic by hand.
 */
@customElement("ui-number-field")
export class NumberField extends LitElement {
  static formAssociated = true;

  #internals: ElementInternals;
  #input!: HTMLInputElement;

  @property()
  accessor name = "";

  // Renders as a real <label for="input"> above the field when set — its own
  // accessible name and click-to-focus, no ARIA wiring needed on our part.
  @property()
  accessor label = "";

  @property()
  accessor value = "";

  @property({ reflect: true })
  accessor size: "small" | "medium" | "large" = "medium";

  @property({ type: Boolean })
  accessor disabled = false;

  @property({ type: Boolean })
  accessor required = false;

  @property({ type: Boolean })
  accessor readonly = false;

  @property()
  accessor min = "";

  @property()
  accessor max = "";

  // Empty means "any" (arbitrary decimals allowed), not the native default of
  // 1 — the native default would flag ordinary decimal input (e.g. "3.5") as
  // a stepMismatch unless a consumer remembered to opt out of it explicitly,
  // which isn't the sensible default for a general-purpose numeric field.
  @property()
  accessor step = "";

  @property()
  accessor placeholder = "";

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  static styles = [
    defaultTheme,
    fieldLabelStyles,
    css`
      :host {
        font-weight: var(--ui-font-weight-normal);
        display: block;

        /* size="medium" (the default). Set on :host so a consumer overriding
           this element's font-size from outside scales consistently. */
        font-size: var(--field-font-size);
        --field-font-size: var(--ui-font-size-md);
        /* Was 0.25rem (same as small below) at one point — collapsed medium
           and small to the same overall height, which read as broken rather
           than "compact". 0.4rem keeps a real, visible step between all
           three sizes. */
        --field-padding: 0.4rem;
      }

      :host([size="small"]) {
        --field-font-size: var(--ui-font-size-sm);
        --field-padding: 0.25rem;
      }

      :host([size="large"]) {
        --field-font-size: var(--ui-font-size-lg);
        --field-padding: 0.55rem;
      }

      .wrapper {
        display: flex;
        align-items: center;
        border: 1px solid var(--ui-field-border-color);
        border-radius: var(--ui-radius-sm);
        background: var(--ui-bg);
        box-sizing: border-box;
      }

      .wrapper:focus-within {
        outline: var(--ui-focus-ring-width) solid var(--ui-color-primary-500);
        outline-offset: var(--ui-focus-ring-offset);
      }

      input {
        flex-grow: 1;
        min-width: 0;
        padding: var(--field-padding);
        font-family: var(--ui-font-sans);
        font-size: var(--field-font-size);
        border: none;
        background: transparent;
        color: inherit;
        /* Plain numeric input, no stepper UI at all (native or custom) — the
           native spin buttons would otherwise overlap long placeholder/value
           text, since nothing reserves room for them. */
        appearance: textfield;
      }

      input::placeholder {
        color: var(--ui-color-neutral-400);
        font-weight: 400;
        font-size: var(--field-font-size);
      }

      input::-webkit-outer-spin-button,
      input::-webkit-inner-spin-button {
        appearance: none;
        margin: 0;
      }

      input:focus {
        outline: none;
      }

      :host([invalid]) .wrapper {
        border-color: var(--ui-color-danger-500);
      }
    `,
  ];

  protected firstUpdated() {
    this.#input = this.renderRoot.querySelector("input")!;
    this.#syncFormValue();
    this.#syncValidity();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("value") || changed.has("disabled")) {
      this.#syncFormValue();
    }

    if (
      changed.has("required") ||
      changed.has("min") ||
      changed.has("max") ||
      changed.has("step")
    ) {
      this.#syncValidity();
    }
  }

  #syncFormValue() {
    this.#internals.setFormValue(this.disabled ? null : this.value);
  }

  // Delegates to the internal <input type="number">'s own ValidityState, so
  // the browser's native range/step checks (rangeUnderflow/rangeOverflow/
  // stepMismatch) are reused rather than reimplemented.
  #syncValidity() {
    if (!this.#input) return;

    this.#internals.setValidity(
      this.#input.validity,
      this.#input.validationMessage,
      this.#input,
    );

    this.toggleAttribute("invalid", !this.#internals.validity.valid);
  }

  #onInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;

    this.value = input.value;

    this.#syncFormValue();
    this.#syncValidity();

    this.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  #onChange() {
    this.dispatchEvent(
      new Event("change", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  formResetCallback() {
    this.value = "";

    if (this.#input) {
      this.#input.value = "";
    }

    this.#syncFormValue();
    this.#syncValidity();
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
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
      this.#syncValidity();
    }
  }

  focus(options?: FocusOptions) {
    this.#input?.focus(options);
  }

  select() {
    this.#input?.select();
  }

  render() {
    return html`
      ${renderFieldLabel(this.label, "input")}
      <div class="wrapper">
        <input
          id="input"
          .value=${this.value}
          name=${this.name}
          type="number"
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?required=${this.required}
          ?readonly=${this.readonly}
          min=${this.min}
          max=${this.max}
          step=${this.step || "any"}
          @input=${this.#onInput}
          @change=${this.#onChange}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-number-field": NumberField;
  }
}
