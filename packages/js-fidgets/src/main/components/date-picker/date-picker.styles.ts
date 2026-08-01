import { css, unsafeCSS } from "lit";

import { defaultTheme } from "../../themes/theme.js";
import { DatePicker as Picker } from "./vanilla/date-picker.js";

/**
 * The vanilla core's own stylesheet, plus the bridge that maps its `--cal-*`
 * tokens onto this library's `--ui-*` theme.
 *
 * The core ships its CSS as a plain string (`DatePicker.styles`, a
 * `date-picker.styles.ts` default export) rather than a Lit `CSSResult`,
 * deliberately — it has no Lit dependency and must stay usable from any
 * framework, so `unsafeCSS` is where that string re-enters Lit. The core
 * itself is never edited to suit this wrapper; everything framework- or
 * design-system-specific lives in the bridge below.
 *
 * The upstream version of this bridge mapped `--cal-*` onto Shoelace's
 * `--sl-*` tokens. Every one of those is remapped here to the `--ui-*`
 * equivalent, so the picker inherits this library's theme — and, because
 * those tokens are `light-dark()` pairs (see themes/theme.ts), gets dark
 * mode for free without a single dark-specific rule.
 */
export const datePickerStyles = [
  defaultTheme,
  unsafeCSS(Picker.styles),
  css`
    :host {
      display: inline-block;
      font-family: var(--ui-font-sans);
    }

    /* Every --cal-* custom property the core's stylesheet actually reads, in
       the order the core groups them. Note this sets all of them: the
       upstream Shoelace bridge left eight unset (--cal-cell-hover-color,
       --cal-header-hover-color, --cal-header-active-color, both
       --cal-header-accentuated-{hover,active}-color, --cal-nav-color,
       --cal-nav-active-background-color) so those var() lookups fell back to
       nothing at all — and it set --cal-cell-adjacent-disabled-color while
       the core reads --cal-cell-adjacent-disable-color (no "d"), so that one
       never connected either. Both are among the flaws to sort out properly
       later; for now the names below are matched to what the core reads. */
    .base {
      /* type */
      --cal-font-family: var(--ui-font-sans);
      --cal-font-size: var(--ui-font-size-md);
      --cal-color: var(--ui-text);
      --cal-background-color: transparent;
      --cal-border-color: var(--ui-color-neutral-300);

      /* header (month/year title and its prev/next controls) */
      --cal-header-color: var(--ui-text);
      --cal-header-background-color: transparent;
      --cal-header-hover-color: var(--ui-text);
      --cal-header-hover-background-color: var(--ui-color-primary-100);
      --cal-header-active-color: var(--ui-text);
      --cal-header-active-background-color: var(--ui-color-primary-200);
      --cal-header-accentuated-color: var(--ui-color-on-accent);
      --cal-header-accentuated-background-color: var(--ui-color-primary-600);
      --cal-header-accentuated-hover-color: var(--ui-color-on-accent);
      --cal-header-accentuated-hover-background-color: var(--ui-color-primary-700);
      --cal-header-accentuated-active-color: var(--ui-color-on-accent);
      --cal-header-accentuated-active-background-color: var(--ui-color-primary-800);

      /* nav arrows */
      --cal-nav-color: var(--ui-color-neutral-600);
      --cal-nav-active-background-color: var(--ui-color-primary-200);

      /* grid cells */
      --cal-cell-hover-color: var(--ui-text);
      --cal-cell-hover-background-color: var(--ui-color-primary-100);
      --cal-cell-disabled-color: var(--ui-color-neutral-400);
      --cal-cell-highlighted-background-color: var(--ui-color-neutral-100);
      --cal-cell-adjacent-color: var(--ui-color-neutral-400);
      --cal-cell-adjacent-disable-color: var(--ui-color-neutral-300);
      --cal-cell-adjacent-selected-color: var(--ui-color-neutral-800);
      --cal-cell-current-highlighted-color: var(--ui-color-primary-600);
      --cal-cell-selected-color: var(--ui-color-on-accent);
      --cal-cell-selected-background-color: var(--ui-color-primary-500);
      --cal-cell-selected-hover-background-color: var(--ui-color-primary-600);
      --cal-cell-selection-range-background-color: var(--ui-color-primary-100);

      /* time selector — the hour/minute option columns read the cell and
         button tokens above rather than having any of their own. The nine
         --cal-slider-* tokens that used to be set here went with the range
         sliders they styled (see the core's #renderTimeSelector). */

      /* buttons (the time view's "back to month" control) */
      --cal-button-background-color: var(--ui-color-primary-100);
      --cal-button-hover-background-color: var(--ui-color-primary-200);
      --cal-button-active-background-color: var(--ui-color-primary-300);
      --cal-button-border-radius: var(--ui-radius-md);
    }
  `,
];
