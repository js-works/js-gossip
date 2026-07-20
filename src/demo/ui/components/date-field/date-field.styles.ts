import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";

export const dateFieldStyles = [
  defaultTheme,
  css`
    :host {
      display: block;
    }

    .wrapper {
      display: flex;
      align-items: center;
      border: 1px solid var(--ui-color-gray-600);
      border-radius: var(--ui-radius-sm);
      box-sizing: border-box;
    }

    input {
      flex-grow: 1;
      min-width: 0;
      padding: 0.5rem;
      font-family: var(--ui-font-sans);
      font-size: inherit;
      border: none;
      background: transparent;
      color: inherit;
      /* Anchor for the picker popover below. Every instance lives in its own
         shadow root, so reusing one literal anchor name across all of them is
         safe — there's no cross-instance name collision to worry about. */
      anchor-name: --ui-date-field-anchor;
    }

    input:focus {
      outline: none;
    }

    .trigger {
      flex: none;
      display: flex;
      align-items: center;
      padding-inline: 0.5rem;
      border: none;
      background: transparent;
      color: inherit;
      font-size: 1em;
      cursor: pointer;
    }

    /* SVG's default display is inline, which leaves it sitting on the text
       baseline with line-height-driven space around it — throwing off flex
       centering by a few px even though align-items: center is set above.
       display: block (plus pinning the size, redundant with the width/height
       attributes already on the SVG itself) makes it a plain centered box. */
    .trigger svg {
      display: block;
      width: 1em;
      height: 1em;
    }

    .trigger:disabled {
      cursor: default;
      opacity: 0.5;
    }

    :host([invalid]) .wrapper {
      border-color: var(--ui-color-danger-500);
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
      font-size: 1em;
      border: 1px solid var(--ui-color-gray-300);
      border-radius: var(--ui-radius-sm);
      box-shadow:
        0 10px 25px -5px rgba(0, 0, 0, 0.2),
        0 4px 8px -4px rgba(0, 0, 0, 0.15);
      padding: 2px;
    }

    .datepicker-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 2px;
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
      gap: 2px;
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
      padding: 2px 8px;
      font-size: 0.9em;
      cursor: pointer;
    }

    .prev-button,
    .next-button {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      font-size: 0.85em;
    }

    .datepicker-controls button:hover:not(:disabled) {
      background: var(--ui-color-gray-200);
    }

    .datepicker-controls button:disabled {
      opacity: 0.35;
      cursor: default;
    }

    .datepicker-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 0 2px;
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
      margin-bottom: 1px;
    }

    .dow {
      text-align: center;
      font-size: 0.8em;
      color: var(--ui-color-gray-700);
      padding: 1px 0;
    }

    .dow.disabled {
      opacity: 0.5;
    }

    .datepicker-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
    }

    .datepicker-grid.months,
    .datepicker-grid.years,
    .datepicker-grid.decades {
      grid-template-columns: repeat(4, 1fr);
      gap: 2px;
      padding: 2px 0;
    }

    .datepicker-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      font-size: 0.9em;
      border-radius: var(--ui-radius-sm);
      cursor: pointer;
    }

    .datepicker-cell:hover:not(.disabled) {
      background: var(--ui-color-gray-200);
    }

    .datepicker-cell.prev,
    .datepicker-cell.next {
      color: var(--ui-color-gray-500);
    }

    .datepicker-cell.disabled {
      color: var(--ui-color-gray-400);
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
      color: white;
    }

    .datepicker-footer {
      width: 100%;
      box-sizing: border-box;
    }

    .datepicker-footer .datepicker-controls {
      width: 100%;
      align-items: stretch;
      padding-top: 2px;
      border-top: 1px solid var(--ui-color-gray-200);
    }

    /* Today/Clear stretch to fill the footer's width equally, like the original
       (Bootstrap-datepicker-derived) theme's button group. */
    .datepicker-footer .datepicker-controls button {
      flex: 1;
    }
  `,
];
