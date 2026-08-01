// The three icons ui-date-field's trigger button uses, and the mapping from
// selection mode to glyph.
//
// Upstream had fourteen, one per mode (see temp/icons/register-icons.ts's
// `date-field.*` entries, resolved through a Shoelace icon library). They were
// ported and then cut back deliberately: at the size this button actually
// renders them — 1em, so 16px at the default scale — the only distinction that
// survives is shape-level, circle versus rounded square. The per-mode
// differences were all interior detail (a bar for a range, a dot row for a
// week, an "Aug" for a month, a block for a quarter) which turns to mush at
// 16px, so twelve of the fourteen read as the same calendar. They were also
// doing labelling work the field already does twice: it has a visible label and,
// once filled, a formatted value.
//
// What's left is the one thing worth signalling — what kind of popup opens: a
// calendar grid, or time sliders.
//
// All three are sized in em, not px, so they scale with the field's font-size.

import { html } from "lit";
import type { TemplateResult } from "lit";

import type { DateFieldSelectionMode } from "./format.js";

/**
 * Bootstrap Icons' "calendar" glyph with the filled header strip, matching
 * ui-date-field2's own trigger icon so the two components read as siblings.
 *
 * overflow="visible": this glyph draws to the very edge of its 16x16 viewBox
 * (the tabs touch y=0, the body x=0/16), and the UA's default style clips a
 * root <svg> to its viewBox at small rendered sizes.
 */
export const calendarIcon = html`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" overflow="visible">
    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M2 2a1 1 0 0 0-1 1v1h14V3a1 1 0 0 0-1-1zm13 3H1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z"/>
  </svg>
`;

// Stroked rather than filled, unlike every other icon here — and drawn fresh
// rather than taken from Bootstrap Icons, whose "clock" was the previous glyph
// (and the only clock in either the upstream icon set or the picker core: all
// three copies were the same paths).
//
// The reason is legibility at 16px. Bootstrap's clock draws its ring as a
// filled band one viewBox unit thick and its hands thinner still, which at
// 16px is sub-pixel and greys out into an indistinct blob. A stroke gives
// direct control of that weight: 1.4 units renders as a crisp ~1.4px ring,
// which sits closest to the calendar glyph above without out-weighing it.
// (Compared 1.1 / 1.4 / 1.7 side by side at 16/20/24px before settling here;
// 1.1 was still too faint, 1.7 noticeably heavier than the calendar.)
const CLOCK_STROKE = 1.4;
// r + stroke/2 = 7.45, so the glyph still sits inside the 16x16 viewBox and,
// unlike the calendar, needs no overflow escape.
const CLOCK_RADIUS = 6.75;

export const clockIcon = html`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16">
    <g
      fill="none"
      stroke="currentColor"
      stroke-width=${CLOCK_STROKE}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="8" cy="8" r=${CLOCK_RADIUS} />
      <path d="M8 4.3V8l2.9 1.9" />
    </g>
  </svg>
`;

/**
 * The same clock face with a filled quadrant instead of hands — a swept span
 * rather than an instant. Deliberately the same ring weight as `clockIcon` so
 * the pair reads as one family; a filled wedge is one of the few interior
 * details that does still register at 16px, because it's a solid mass rather
 * than a thin line.
 */
export const timeRangeIcon = html`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16">
    <circle
      cx="8"
      cy="8"
      r=${CLOCK_RADIUS}
      fill="none"
      stroke="currentColor"
      stroke-width=${CLOCK_STROKE}
    />
    <path d="M8 8V2.2A5.8 5.8 0 0 1 13.8 8z" fill="currentColor" />
  </svg>
`;

// Record, not Partial<Record>, so adding a selection mode to
// DateFieldSelectionMode without deciding its icon is a compile error rather
// than a silently blank trigger button.
export const FIELD_ICONS: Record<DateFieldSelectionMode, TemplateResult> = {
  date: calendarIcon,
  dateTime: calendarIcon,
  dateRange: calendarIcon,
  dateTimeRange: calendarIcon,
  week: calendarIcon,
  weekRange: calendarIcon,
  month: calendarIcon,
  monthRange: calendarIcon,
  quarter: calendarIcon,
  quarterRange: calendarIcon,
  year: calendarIcon,
  yearRange: calendarIcon,
  time: clockIcon,
  timeRange: timeRangeIcon,
};
