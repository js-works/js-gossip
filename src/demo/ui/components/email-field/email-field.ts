import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PropertyValues } from "lit";

import { defaultTheme } from "../../theming/theme.js";
import { emailIcon } from "./icons/email.icon.js";

@customElement("ui-email-field")
export class UiEmailField extends LitElement {
  static formAssociated = true;

  #internals: ElementInternals;
  #input!: HTMLInputElement;

  @property()
  accessor name = "";

  @property()
  accessor value = "";

  // Default to "off": autocomplete's native default ("on") is rarely what a form
  // actually wants.
  @property()
  accessor autocomplete = "off";

  @property({ type: Boolean })
  accessor disabled = false;

  @property({ type: Boolean })
  accessor required = false;

  @property({ type: Boolean })
  accessor readonly = false;

  @property({ type: Number })
  accessor minlength: number | undefined = undefined;

  @property({ type: Number })
  accessor maxlength: number | undefined = undefined;

  @property()
  accessor placeholder = "";

  constructor() {
    super();
    this.#internals = this.attachInternals();
    // `spellcheck` is a native HTMLElement property/attribute (default true); flip
    // the default here rather than redeclaring it as a reactive property (its type
    // is fixed to boolean by the platform, and it rarely needs to react to changes).
    this.spellcheck = false;
  }

  static styles = [
    defaultTheme,
    css`
      :host {
        display: block;
      }

      /* The border lives on the wrapper, surrounding both the input and the icon;
         the input itself stays borderless so the two read as one control. */
      .wrapper {
        display: flex;
        align-items: center;
        border: 1px solid var(--ui-color-gray-600, #999);
        border-radius: var(--ui-radius-sm, 0.25rem);
        box-sizing: border-box;
      }

      input {
        flex-grow: 1;
        min-width: 0;
        padding: 0.5rem;
        font-family: var(--ui-font-sans, inherit);
        font-size: inherit;
        border: none;
        background: transparent;
      }

      input:focus {
        outline: none;
      }

      .icon {
        flex: none;
        display: flex;
        align-items: center;
        padding-inline-end: 0.5rem;
        font-size: 1em;
        color: inherit;
      }

      :host([invalid]) .wrapper {
        border-color: var(--ui-color-danger-500, crimson);
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
      changed.has("minlength") ||
      changed.has("maxlength")
    ) {
      this.#syncValidity();
    }
  }

  #syncFormValue() {
    this.#internals.setFormValue(this.disabled ? null : this.value);
  }

  // Delegates to the internal <input type="email">'s own ValidityState, so the
  // browser's native email-format check (typeMismatch) is reused rather than
  // reimplemented.
  #syncValidity() {
    if (!this.#input) {
      return;
    }

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
      <div class="wrapper">
        <input
          .value=${this.value}
          name=${this.name}
          type="email"
          placeholder=${this.placeholder}
          autocomplete=${this.autocomplete}
          spellcheck=${this.spellcheck}
          ?disabled=${this.disabled}
          ?required=${this.required}
          ?readonly=${this.readonly}
          minlength=${this.minlength ?? ""}
          maxlength=${this.maxlength ?? ""}
          @input=${this.#onInput}
          @change=${this.#onChange}
        />
        <span class="icon">${emailIcon}</span>
      </div>
    `;
  }
}
