import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PropertyValues } from "lit";
import Datepicker from "vanillajs-datepicker/Datepicker";
import type { DatepickerLocale } from "vanillajs-datepicker/Datepicker";

import { dateFieldStyles } from "./date-field.styles.js";
import { calendarIcon } from "./icons/calendar.icon.js";
import { chevronLeftIcon } from "./icons/chevron-left.icon.js";
import { chevronRightIcon } from "./icons/chevron-right.icon.js";

// ---- Locale, built from the platform's Intl data (see buildIntlLocale below) ----

const ENGLISH_FALLBACK: DatepickerLocale = {
  days: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  monthsShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  today: "Today",
  clear: "Clear",
  titleFormat: "MM y",
};

// 2023-01-01 was a Sunday; used as a fixed reference to read out weekday names in
// order regardless of the current date. Formatted in UTC so the reference instant
// never rolls over to a different local calendar day depending on the runtime's zone.
const REF_SUNDAY_UTC = Date.UTC(2023, 0, 1);
const refMonthUtc = (month: number) => Date.UTC(2000, month, 1);

function weekdayNames(lang: string, width: "long" | "short"): string[] {
  const fmt = new Intl.DateTimeFormat(lang, { weekday: width, timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(REF_SUNDAY_UTC + i * 86_400_000),
  );
}

function monthNames(lang: string, width: "long" | "short"): string[] {
  const fmt = new Intl.DateTimeFormat(lang, { month: width, timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, month) => fmt.format(refMonthUtc(month)));
}

// Intl.RelativeTimeFormat happens to give a translated, idiomatic "today" in most
// locales (e.g. "heute", "aujourd'hui") via the day-offset-0 case.
function todayLabel(lang: string): string {
  return new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(0, "day");
}

// Intl.Locale's `weekInfo` (where supported) reports the locale's actual first day
// of the week; ISO numbering (1 Monday..7 Sunday) is converted to the 0 Sunday..6
// Saturday numbering vanillajs-datepicker uses.
function weekStartFor(lang: string): number {
  try {
    const weekInfo = (new Intl.Locale(lang) as unknown as { weekInfo?: { firstDay: number } })
      .weekInfo;
    if (weekInfo && typeof weekInfo.firstDay === "number") {
      return weekInfo.firstDay % 7;
    }
  } catch {
    // Intl.Locale/weekInfo unsupported, or lang isn't a valid tag — fall through.
  }
  return 0;
}

// Each piece is derived independently and falls back to its English default in
// isolation if Intl can't produce it for this language, rather than failing the
// whole locale — good enough for now; there's no Intl primitive for "Clear" at all,
// so that one is always the English word until this is revisited.
function buildIntlLocale(lang: string): DatepickerLocale {
  const locale = { ...ENGLISH_FALLBACK };

  try {
    locale.months = monthNames(lang, "long");
    locale.monthsShort = monthNames(lang, "short");
  } catch {
    // keep English fallback
  }

  try {
    locale.days = weekdayNames(lang, "long");
    const short = weekdayNames(lang, "short");
    locale.daysShort = short;
    // Intl has no distinct 2-letter form, and `narrow` gives ambiguous single
    // letters (e.g. "S" for both Sunday and Saturday), so the short form doubles
    // as the calendar header's minimal label too.
    locale.daysMin = short;
  } catch {
    // keep English fallback
  }

  try {
    locale.today = todayLabel(lang);
  } catch {
    // keep English fallback ("Today")
  }

  return locale;
}

/**
 * A date field with a picker, built on vanillajs-datepicker. Combines a plain
 * ISO-format (`yyyy-mm-dd`) text input with a calendar button; both open the same
 * picker popup, which renders via the native Popover API (`popover="manual"`,
 * driven off the picker's own `show`/`hide` events) and is positioned with CSS
 * anchor positioning rather than the library's own JS-computed placement — see the
 * `.datepicker` rule in `styles` for why.
 */
@customElement("ui-date-field")
export class DateField extends LitElement {
  static formAssociated = true;

  #internals: ElementInternals;
  #input!: HTMLInputElement;
  #datepicker?: Datepicker;
  // Set while pushing a `changeDate` result into `value`, so the resulting property
  // update doesn't feed the same date straight back into the picker.
  #syncingFromPicker = false;

  @property()
  accessor name = "";

  // ISO format (yyyy-mm-dd), or "" for no selection — matches native
  // `<input type="date">`, and keeps the value unambiguous regardless of locale.
  @property()
  accessor value = "";

  @property()
  accessor min: string | undefined = undefined;

  @property()
  accessor max: string | undefined = undefined;

  @property({ type: Boolean })
  accessor disabled = false;

  @property({ type: Boolean })
  accessor required = false;

  @property({ type: Boolean })
  accessor readonly = false;

  @property()
  accessor placeholder = "yyyy-mm-dd";

  @property()
  accessor autocomplete = "off";

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.spellcheck = false;
  }

  static styles = dateFieldStyles;

  protected firstUpdated() {
    this.#input = this.renderRoot.querySelector("input")!;

    const lang =
      this.lang || document.documentElement.lang || navigator.language || "en";
    Datepicker.locales[lang] ??= buildIntlLocale(lang);

    this.#datepicker = new Datepicker(this.#input, {
      language: lang,
      format: "yyyy-mm-dd",
      weekStart: weekStartFor(lang),
      autohide: true,
      todayButton: true,
      todayButtonMode: 1,
      clearButton: true,
      prevArrow: chevronLeftIcon,
      nextArrow: chevronRightIcon,
      minDate: this.min ?? null,
      maxDate: this.max ?? null,
    });

    const pickerEl = this.#datepicker.pickerElement;
    if (pickerEl) {
      pickerEl.setAttribute("popover", "manual");
      // "manual" so the browser's own light-dismiss/focus handling stays out of the
      // way — the library already drives its own click-outside/Escape/focus
      // behavior; popover here is only for top-layer rendering (escaping any
      // ancestor's `overflow: auto`, e.g. a js-gossip dialog's own scroll
      // container) and the CSS anchor positioning above.
      this.#input.addEventListener("show", () => pickerEl.showPopover());
      this.#input.addEventListener("hide", () => pickerEl.hidePopover());
    }

    this.#input.addEventListener("changeDate", this.#onChangeDate);

    this.#syncFormValue();
    this.#syncValidity();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Datepicker attaches document/window-level listeners (click-outside, resize);
    // without this they'd leak once this element (and its dialog) are removed.
    this.#datepicker?.destroy();
    this.#datepicker = undefined;
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("value") || changed.has("disabled")) {
      this.#syncFormValue();
    }

    if (changed.has("value") && !this.#syncingFromPicker) {
      this.#datepicker?.setDate({ clear: true });
      if (this.value) {
        this.#datepicker?.setDate(this.value);
      }
    }
    this.#syncingFromPicker = false;

    if (changed.has("min") || changed.has("max")) {
      this.#datepicker?.setOptions({
        minDate: this.min ?? null,
        maxDate: this.max ?? null,
      });
    }

    if (
      changed.has("required") ||
      changed.has("min") ||
      changed.has("max") ||
      changed.has("value")
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
    } else if (this.min && this.value && this.value < this.min) {
      flags.rangeUnderflow = true;
      message = `Date must be on or after ${this.min}.`;
    } else if (this.max && this.value && this.value > this.max) {
      flags.rangeOverflow = true;
      message = `Date must be on or before ${this.max}.`;
    }

    this.#internals.setValidity(flags, message, this.#input);
    this.toggleAttribute("invalid", !this.#internals.validity.valid);
  }

  #onChangeDate = () => {
    const next = String(this.#datepicker?.getDate("yyyy-mm-dd") ?? "");
    if (next === this.value) {
      return;
    }
    this.#syncingFromPicker = true;
    this.value = next;

    this.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  };

  #onTriggerClick = () => {
    if (this.disabled) return;
    this.#datepicker?.toggle();
  };

  formResetCallback() {
    this.value = "";
    this.#datepicker?.setDate({ clear: true });
    this.#syncFormValue();
    this.#syncValidity();
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
      <div class="wrapper">
        <input
          type="text"
          .value=${this.value}
          name=${this.name}
          placeholder=${this.placeholder}
          autocomplete=${this.autocomplete}
          spellcheck=${this.spellcheck}
          ?disabled=${this.disabled}
          ?required=${this.required}
          ?readonly=${this.readonly}
        />
        <button
          type="button"
          class="trigger"
          aria-label="Open date picker"
          ?disabled=${this.disabled}
          @click=${this.#onTriggerClick}
        >
          ${calendarIcon}
        </button>
      </div>
    `;
  }
}
