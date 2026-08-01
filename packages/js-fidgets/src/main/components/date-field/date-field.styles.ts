import { css } from "lit";

import { defaultTheme } from "../../themes/theme.js";
import { fieldLabelStyles } from "../../shared/field-label/field-label.js";

export const dateFieldStyles = [
  defaultTheme,
  fieldLabelStyles,
  css`
    :host {
      font-weight: var(--ui-font-weight-normal);
      display: block;

      /* size="medium" (the default) — same --ui-font-size-* tokens as
         ui-text-field/ui-select/etc., so "medium"/"small"/"large" mean the
         same rendered size everywhere. */
      font-size: var(--field-font-size);
      --field-font-size: var(--ui-font-size-md);
    }

    :host([size="small"]) {
      --field-font-size: var(--ui-font-size-sm);
    }

    :host([size="large"]) {
      --field-font-size: var(--ui-font-size-lg);
    }

    .wrapper {
      display: flex;
      align-items: center;
      /* The trigger buttons are <ui-button variant="link"> (see render()),
         which strips ui-button's own padding entirely — .wrapper no longer
         gives them any spacing itself (see the two ui-button rules below,
         which do instead: a wider gap after the input, a narrower one
         between the two buttons than a single flex gap value could give
         both at once). */
      padding-inline-end: 0.5rem;
      border: var(--ui-border-thin) solid var(--ui-field-border-color);
      border-radius: var(--ui-field-radius);
      box-sizing: border-box;
      /* Anchor for both picker popovers below (.datepicker and .time-popup) —
         on the wrapper itself, not an inner element, so both popups'
         left: anchor(left) lines up with this field's own visible left
         edge exactly. Anchoring to an inner element instead would leave a
         gap the width of this border (its own left edge sits 1px inside
         the wrapper's). Every instance lives in its own shadow root, so
         reusing one literal anchor name across all of them is safe — no
         cross-instance name collision to worry about. */
      anchor-name: --ui-date-field-anchor;
    }

    input {
      flex: 1 1 auto;
      min-width: 0;
      padding: 0.5rem;
      font-family: var(--ui-font-sans);
      font-size: var(--field-font-size);
      border: none;
      background: transparent;
      color: inherit;
    }

    input:focus {
      outline: none;
    }

    /* The calendar/clock trigger buttons are <ui-button variant="link">
       (see render(), which also passes this field's own size attribute
       through so they scale with it). Spacing after the input. */
    ui-button {
      flex: none;
      margin-inline-start: 0.4em;
    }

    /* Spacing between the two buttons themselves, distinct from the spacing
       after the input above — overrides that rule for whichever one isn't
       first. */
    ui-button + ui-button {
      margin-inline-start: 0.5em;
    }

    :host([invalid]) .wrapper {
      border-color: var(--ui-color-danger-500);
    }

    /* ---- Time trigger + popup (type: "datetime") ---- */

    .time-popup {
      position: fixed;
      /* Same anchor (the field's own .wrapper) and same top/left formula as
         .datepicker below, so this popup's top-left lands at exactly the
         same spot the calendar popup would — whichever of the two is open,
         it opens from the same corner of the field. */
      position-anchor: --ui-date-field-anchor;
      top: calc(anchor(bottom) + 0.25rem);
      left: anchor(left);
      position-try-fallbacks: flip-block;
      margin: 0;
      /* Reset the UA's default popover chrome — same reasoning as
         .datepicker above; the visible card here is .time-select's own
         inline listbox (see select.styles.ts's :host([inline]) rules). */
      border: none;
      padding: 0;
      background: transparent;
      /* The UA default is overflow: auto, which — combined with this
         element's own fit-content sizing hugging .time-select exactly —
         clips .time-select's box-shadow at this element's edge instead of
         letting it bleed outward as intended. Same fix as .datepicker
         below. */
      overflow: visible;
    }

    .time-select {
      /* Same fixed width as .datepicker-picker below, so the two picker
         popups this field opens read as the same kind of control rather
         than one being a full-size card and the other a narrow sliver. */
      width: 17em;
      margin: 0;
      /* Same height as .datepicker-picker below (17.5em) too — this select
         has no header/footer chrome of its own to eat into that budget the
         way the calendar's month nav and Today/Clear footer do, so the
         whole 17.5em goes to the listbox itself; the full 96-entry list
         always overflows it and scrolls regardless. */
      --select-inline-height: 17.5em;
      /* Same popup border/shadow as .datepicker-picker below too, instead of
         ui-select's own plain field-style default (see select.styles.ts's
         :host([inline]) .listbox for the override points this feeds). */
      --select-inline-border-color: var(--ui-popup-border-color);
      --select-inline-shadow: var(--ui-popup-shadow);
      font-size: 1.08em;
    }

    /* ---- Picker popup, themed entirely from our own --ui-* tokens ---- */

    .datepicker {
      position: fixed;
      position-anchor: --ui-date-field-anchor;
      /* The library computes its own top/left in JS (Picker.place(), re-run on
         every window resize while the popup is open) and sets them as plain
         (non-!important) inline styles — !important forces these anchor-derived
         values to win instead, regardless of when it (re)applies its own. */
      top: calc(anchor(bottom) + 0.25rem) !important;
      left: anchor(left) !important;
      position-try-fallbacks: flip-block;
      margin: 0;
      /* Reset the UA's default popover chrome (border: solid + padding, in
         currentColor/Canvas) — the actual visible card is .datepicker-picker
         below; this outer element is just the popover host. */
      border: none;
      padding: 0;
      background: transparent;
      /* The UA default is overflow: auto, which — combined with this
         element's own fit-content sizing hugging .datepicker-picker exactly
         — clips its box-shadow at this element's edge instead of letting it
         bleed outward as intended. */
      overflow: visible;
    }

    .datepicker-picker {
      display: flex;
      flex-direction: column;
      /* Fixed size (in em, so it scales with the field's font-size) rather than
         content-sized — otherwise switching between the days/months/years views,
         which have different grid shapes, makes the popup resize under the
         user's cursor. Sized to comfortably fit the tallest view (days: 6 rows). */
      width: 17em;
      height: 17.5em;
      box-sizing: border-box;
      background: var(--ui-bg);
      color: var(--ui-text);
      font-family: var(--ui-font-sans);
      /* A tiny bit larger than the field's own 1em — every other size in
         this picker (.datepicker-controls button, .dow, .datepicker-cell,
         etc.) is defined relative to this one, so bumping it here scales
         the whole picker's text (and, via the width/height above being in
         em too, the picker's own box) proportionally in one place. */
      font-size: 1.08em;
      border: var(--ui-border-thin) solid var(--ui-popup-border-color);
      border-radius: var(--ui-radius-sm);
      box-shadow: var(--ui-popup-shadow);
      padding: calc(2px * var(--ui-scale));
    }

    .datepicker-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: calc(2px * var(--ui-scale));
      padding: calc(2px * var(--ui-scale));
      width: 100%;
      box-sizing: border-box;
    }

    .datepicker-title {
      flex: 1;
      text-align: center;
      font-weight: 600;
    }

    .datepicker-controls {
      display: flex;
      align-items: center;
      gap: calc(2px * var(--ui-scale));
    }

    /* prev on the far left, next on the far right, the month/year switch
       (or title, if configured) in between. */
    .datepicker-header .datepicker-controls {
      width: 100%;
      justify-content: space-between;
    }

    .datepicker-controls button {
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      border-radius: var(--ui-radius-sm);
      padding: calc(2px * var(--ui-scale)) calc(8px * var(--ui-scale));
      font-size: 0.9em;
      cursor: pointer;
    }

    .prev-button,
    .next-button {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: calc(2px * var(--ui-scale));
      font-size: 0.85em;
    }

    .datepicker-controls button:hover:not(:disabled) {
      background: var(--ui-color-neutral-200);
    }

    .datepicker-controls button:disabled {
      opacity: 0.35;
      cursor: default;
    }

    .datepicker-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 0 calc(2px * var(--ui-scale));
    }

    /* Grows to fill the fixed-height picker. For the days view this is a plain
       wrapper (flex:1 makes it fill; .days below stacks its own children); for
       months/years/decades this element doubles as .datepicker-grid, whose own
       display: grid (declared below) wins on source order — flex: 1 still
       applies since that's independent of how the element lays out its own
       children. */
    .datepicker-view {
      flex: 1;
    }

    .days {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .datepicker-grid {
      flex: 1;
    }

    .days-of-week {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      margin-bottom: calc(1px * var(--ui-scale));
    }

    .dow {
      text-align: center;
      font-size: 0.8em;
      color: var(--ui-color-neutral-700);
      padding: calc(1px * var(--ui-scale)) 0;
    }

    .dow.disabled {
      opacity: 0.5;
    }

    .datepicker-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: calc(1px * var(--ui-scale));
    }

    .datepicker-grid.months,
    .datepicker-grid.years,
    .datepicker-grid.decades {
      grid-template-columns: repeat(4, 1fr);
      gap: calc(2px * var(--ui-scale));
      padding: calc(2px * var(--ui-scale)) 0;
    }

    .datepicker-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: calc(2px * var(--ui-scale));
      font-size: 0.9em;
      border-radius: var(--ui-radius-sm);
      cursor: pointer;
    }

    .datepicker-cell:hover:not(.disabled) {
      background: var(--ui-color-neutral-200);
    }

    .datepicker-cell.prev,
    .datepicker-cell.next {
      color: var(--ui-color-neutral-500);
    }

    .datepicker-cell.disabled {
      color: var(--ui-color-neutral-400);
      cursor: default;
      pointer-events: none;
    }

    .datepicker-cell.highlighted {
      background: var(--ui-color-primary-50);
    }

    .datepicker-cell.today {
      box-shadow: inset 0 0 0 1px var(--ui-color-primary-500);
    }

    .datepicker-cell.focused {
      box-shadow: 0 0 0 1px var(--ui-color-primary-500);
    }

    .datepicker-cell.selected {
      background: var(--ui-color-primary-500);
      color: var(--ui-color-on-accent);
    }

    .datepicker-footer {
      width: 100%;
      box-sizing: border-box;
    }

    .datepicker-footer .datepicker-controls {
      width: 100%;
      align-items: stretch;
      padding-top: calc(2px * var(--ui-scale));
      border-top: var(--ui-border-thin) solid var(--ui-color-neutral-200);
    }

    /* Today/Clear stretch to fill the footer's width equally, like the original
       (Bootstrap-datepicker-derived) theme's button group. */
    .datepicker-footer .datepicker-controls button {
      flex: 1;
    }
  `,
];
