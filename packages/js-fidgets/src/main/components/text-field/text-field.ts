import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PropertyValues } from "lit";

import { defaultTheme } from "../../theming/theme.js";

@customElement("ui-text-field")
export class TextField extends LitElement {
  static formAssociated = true;

  #internals: ElementInternals;
  #input!: HTMLInputElement;

  @property()
  accessor name = "";

  @property()
  accessor value = "";

  @property()
  accessor type: HTMLInputElement["type"] = "text";

  @property({ reflect: true })
  accessor size: "small" | "medium" | "large" = "medium";

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
  accessor pattern = "";

  @property()
  accessor placeholder = "";

  // Default to "off": autocomplete's native default ("on") is rarely what a form
  // actually wants.
  @property()
  accessor autocomplete = "off";

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
        display: flex;

        /* size="medium" (the default). Set on :host (not just the input) so
           slotted prefix/suffix content, which inherits ambient font-size
           rather than the input's own, scales the same way. */
        font-size: var(--field-font-size);
        --field-font-size: var(--ui-font-size-md);
        --field-padding: 0.5rem;
      }

      :host([size="small"]) {
        --field-font-size: var(--ui-font-size-sm);
        --field-padding: 0.35rem;
      }

      :host([size="large"]) {
        --field-font-size: var(--ui-font-size-lg);
        --field-padding: 0.65rem;
      }

      .wrapper {
        display: flex;
        align-items: center;
        flex-grow: 1;
        box-sizing: border-box;
        /* Per-side custom properties (rather than one border shorthand) so a
           consumer can drop individual sides — e.g. data-navigator's global
           filter, styled bottom-border-only — via a plain custom-property
           override from outside, without reaching into the shadow root. */
        border-block-start: var(
          --field-border-block-start,
          1px solid var(--ui-color-neutral-600)
        );
        border-inline: var(
          --field-border-inline,
          1px solid var(--ui-color-neutral-600)
        );
        border-block-end: var(
          --field-border-block-end,
          1px solid var(--ui-color-neutral-600)
        );
        border-radius: var(--field-border-radius, var(--ui-radius-sm));
        background: var(--ui-bg);
      }

      :host([invalid]) .wrapper {
        border-color: var(--ui-color-danger-500);
      }

      .wrapper:focus-within {
        outline: var(--ui-focus-ring-width) solid var(--ui-color-primary-500);
        outline-offset: var(--ui-focus-ring-offset);
      }

      input {
        flex-grow: 1;
        min-width: 0;
        font-family: var(--ui-font-sans);
        font-size: var(--field-font-size);
        padding: var(--field-padding);
        border: none;
        background: transparent;
        color: inherit;
      }

      input:focus {
        outline: none;
      }

      /* Only styled/spaced when something is actually assigned — an empty slot
         has no assigned nodes for ::slotted to match, so it contributes zero
         width/space on its own (no leftover gap for an unused slot). */
      ::slotted([slot="prefix"]),
      ::slotted([slot="suffix"]) {
        display: flex;
        align-items: center;
        flex: none;
        color: var(--ui-color-neutral-700);
      }

      ::slotted([slot="prefix"]) {
        margin-inline-start: 0.5rem;
      }

      ::slotted([slot="suffix"]) {
        margin-inline-end: 0.5rem;
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
      changed.has("maxlength") ||
      changed.has("pattern")
    ) {
      this.#syncValidity();
    }
  }

  #syncFormValue() {
    this.#internals.setFormValue(this.disabled ? null : this.value);
  }

  #syncValidity() {
    if (!this.#input) return;

    const flags: ValidityStateFlags = {};
    let message = "";

    if (this.required && !this.value) {
      flags.valueMissing = true;
      message = "This field is required.";
    }

    if (this.minlength !== undefined && this.value.length < this.minlength) {
      flags.tooShort = true;
      message = `Minimum length is ${this.minlength}.`;
    }

    if (this.maxlength !== undefined && this.value.length > this.maxlength) {
      flags.tooLong = true;
      message = `Maximum length is ${this.maxlength}.`;
    }

    if (
      this.pattern &&
      this.value &&
      !new RegExp(this.pattern).test(this.value)
    ) {
      flags.patternMismatch = true;
      message = "Invalid format.";
    }

    this.#internals.setValidity(flags, message, this.#input);

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
        <slot name="prefix"></slot>
        <input
          .value=${this.value}
          name=${this.name}
          type=${this.type}
          placeholder=${this.placeholder}
          autocomplete=${this.autocomplete}
          spellcheck=${this.spellcheck}
          ?disabled=${this.disabled}
          ?required=${this.required}
          ?readonly=${this.readonly}
          minlength=${this.minlength ?? ""}
          maxlength=${this.maxlength ?? ""}
          pattern=${this.pattern}
          @input=${this.#onInput}
          @change=${this.#onChange}
        />
        <slot name="suffix"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-text-field": TextField;
  }
}
