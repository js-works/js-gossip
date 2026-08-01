import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PropertyValues } from "lit";
import Datepicker from "vanillajs-datepicker/Datepicker";
import type { DatepickerLocale } from "vanillajs-datepicker/Datepicker";

import { dateField2Styles } from "./date-field2.styles.js";
import { calendarIcon } from "./icons/calendar.icon.js";
import { clockIcon } from "./icons/clock.icon.js";
import { chevronLeftIcon } from "./icons/chevron-left.icon.js";
import { chevronRightIcon } from "./icons/chevron-right.icon.js";
import { renderFieldLabel } from "../../shared/field-label/field-label.js";
import "../select/select.js";
import type { Select } from "../select/select.js";
import "../button/button.js";

// One option per quarter hour, "00:00".."23:45" — the fixed set ui-date-field2
// offers in its time popup (see `type: "datetime"` below). Generated once at
// module load rather than duplicated as a 96-entry literal.
const TIME_OPTIONS: string[] = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = String(Math.floor(i / 4)).padStart(2, "0");
  const minutes = String((i % 4) * 15).padStart(2, "0");
  return `${hours}:${minutes}`;
});

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
@customElement("ui-date-field2")
export class DateField2 extends LitElement {
  static formAssociated = true;

  #internals: ElementInternals;
  #input!: HTMLInputElement;
  #datepicker?: Datepicker;
  // Set while pushing a `changeDate` result into `value`, so the resulting property
  // update doesn't feed the same date straight back into the picker.
  #syncingFromPicker = false;

  @property()
  accessor name = "";

  // Renders as a real <label for="input"> above the field when set — its own
  // accessible name and click-to-focus, no ARIA wiring needed on our part.
  @property()
  accessor label = "";

  // ISO format — `yyyy-mm-dd` for `type: "date"`, or `yyyy-mm-ddTHH:mm` (same
  // convention as native `<input type="datetime-local">`) once a time has
  // also been picked for `type: "datetime"` — or "" for no selection. Always
  // unambiguous regardless of locale.
  @property()
  accessor value = "";

  // "datetime" adds a second trigger button (clock icon) next to the
  // calendar one, opening a popup with a fixed list of times (00:00..23:45,
  // 15-minute steps) to pick from — see #timePart/#onTimeChange. There's
  // still exactly one text input either way; once a time is picked, its
  // displayed text combines both (#displayValue) — vanillajs-datepicker
  // itself only ever knows about the date part (format "yyyy-mm-dd"), so
  // #onChangeDate re-appends the time part after every write the library
  // makes to the input.
  @property()
  accessor type: "date" | "datetime" = "date";

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

  @property({ reflect: true })
  accessor size: "small" | "medium" | "large" = "medium";

  #spellcheckDefaulted = false;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.#spellcheckDefaulted) {
      this.#spellcheckDefaulted = true;
      // `spellcheck` is a native HTMLElement property/attribute (default
      // true); flip the default here, not the constructor — see
      // ui-text-field's own connectedCallback for why (constructor
      // invariant violation when created from within another custom
      // element's reaction). Guarded so a later reconnect never clobbers a
      // consumer's own explicit override.
      this.spellcheck = false;
    }
  }

  static styles = dateField2Styles;

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
      // Also resyncs the combined display text (not just "changeDate"
      // below) — re-picking the date that's *already* selected (e.g. the
      // footer's Today button, clicked twice) still closes the picker and
      // still ends with the library rewriting the input to its own
      // bare-date text, but doesn't consider the date "changed" and so never
      // fires changeDate at all, leaving nothing else to restore the time
      // suffix.
      this.#input.addEventListener("hide", () => {
        pickerEl.hidePopover();
        this.#syncInputDisplay();
      });
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
      // Only re-drive the datepicker when the *date* part actually changed —
      // #onTimeChange also goes through `value` (to combine the existing
      // date with the newly picked time), and calling setDate() here in that
      // case would make the datepicker re-fire its own `changeDate` event
      // re-entrantly (even for a date it's already showing), which then runs
      // #onChangeDate while `value` is only half-updated and corrupts it.
      const previousDatePart = String(changed.get("value") ?? "").slice(0, 10);
      if (previousDatePart !== this.#datePart) {
        this.#datepicker?.setDate({ clear: true });
        if (this.#datePart) {
          this.#datepicker?.setDate(this.#datePart);
        }
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

  // this.value.slice(...) rather than parsing — both parts are fixed-width
  // and fixed-position within the "yyyy-mm-ddTHH:mm" convention, and
  // .slice() past either end of a shorter string (a date-only value, or "")
  // just yields "", no bounds-checking needed.
  get #datePart(): string {
    return this.value.slice(0, 10);
  }

  get #timePart(): string {
    return this.type === "datetime" ? this.value.slice(11, 16) : "";
  }

  // What the single input should actually show — vanillajs-datepicker only
  // ever writes the bare date part to it (see #onChangeDate), so once a time
  // is also picked, this is what puts both back together into one value.
  get #displayValue(): string {
    const date = this.#datePart;
    const time = this.#timePart;
    return date && time ? `${date} ${time}` : date;
  }

  // The library just wrote its own bare-date text into the input as part of
  // firing "changeDate"/"hide" — restore the combined display on top of it.
  // Called unconditionally by both, even where #onChangeDate's own
  // `next === this.value` check below short-circuits before `value` itself
  // changes, since the library's overwrite already happened regardless.
  #syncInputDisplay() {
    const date = String(this.#datepicker?.getDate("yyyy-mm-dd") ?? "");
    const time = this.type === "datetime" ? this.#timePart : "";
    this.#input.value = date && time ? `${date} ${time}` : date;
  }

  #onChangeDate = () => {
    this.#syncInputDisplay();

    const nextDate = String(this.#datepicker?.getDate("yyyy-mm-dd") ?? "");
    const time = this.type === "datetime" ? this.#timePart : "";
    const next = time ? `${nextDate}T${time}` : nextDate;
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

  // ui-button (see render()) isn't itself a real <button>/<input>, so a
  // declarative popovertarget attribute on it wouldn't do anything — the
  // browser's popover-invoker behavior only recognizes that attribute on
  // the native form-associated elements it's defined for.
  #onTimeTriggerClick = () => {
    if (this.disabled || !this.#datePart) return;
    this.renderRoot.querySelector<HTMLElement>("#time-popup")?.togglePopover();
  };

  // Fired by the time popup's ui-select (see render()). The time trigger
  // button is disabled until a date is picked (#datePart empty), so
  // #datePart is always non-empty by the time this can run.
  #onTimeChange = (event: Event) => {
    const time = (event.target as Select).value;
    const next = `${this.#datePart}T${time}`;
    if (next === this.value) {
      return;
    }
    this.value = next;
    this.renderRoot.querySelector<HTMLElement>("#time-popup")?.hidePopover();

    this.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
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
    const timePart = this.#timePart;
    return html`
      ${renderFieldLabel(this.label, "input")}
      <div class="wrapper">
        <input
          id="input"
          type="text"
          .value=${this.#displayValue}
          name=${this.name}
          placeholder=${this.placeholder}
          autocomplete=${this.autocomplete}
          spellcheck=${this.spellcheck}
          ?disabled=${this.disabled}
          ?required=${this.required}
          ?readonly=${this.readonly}
        />
        <ui-button
          variant="link"
          size=${this.size}
          aria-label="Open date picker"
          ?disabled=${this.disabled}
          @click=${this.#onTriggerClick}
        >
          ${calendarIcon}
        </ui-button>
        ${this.type === "datetime"
          ? html`
              <ui-button
                variant="link"
                size=${this.size}
                aria-label="Open time picker"
                ?disabled=${this.disabled || !this.#datePart}
                @click=${this.#onTimeTriggerClick}
              >
                ${clockIcon}
              </ui-button>
            `
          : nothing}
      </div>
      ${this.type === "datetime"
        ? html`
            <div id="time-popup" class="time-popup" popover="auto">
              <ui-select
                class="time-select"
                inline
                .value=${timePart}
                aria-label="Select time"
                @change=${this.#onTimeChange}
              >
                ${TIME_OPTIONS.map(
                  (time) => html`<ui-option value=${time}>${time}</ui-option>`,
                )}
              </ui-select>
            </div>
          `
        : nothing}
    `;
  }
}
