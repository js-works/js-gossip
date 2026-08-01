import type { Calendar } from './calendar.js';
import { h, render, renderToString } from './vdom.js';
import { classMap } from './utils.js';
import { selectionModeMeta, calendarViewOrder } from './meta.js';

// types
import type { VNode } from './vdom.js';
import type { CalendarView, View } from './meta.js';
import type { SelectionMode, SelectionMode as _SelectionMode } from './meta.js';

// icons
import arrowLeftIcon from './icons/arrow-left.icon.js';
import arrowRightIcon from './icons/arrow-right.icon.js';
import timeIcon from './icons/time.icon.js';

// styles
import datePickerBaseStyles from './date-picker.styles.js';

// === exports =======================================================

export { DatePicker };

// === exported types ================================================

namespace DatePicker {
  export type SelectionMode = _SelectionMode;

  export type Props = {
    selectionMode: SelectionMode;
    accentuateHeader: boolean;
    showWeekNumbers: boolean;
    calendarSize: 'default' | 'minimal' | 'maximal';
    highlightCurrent: boolean;
    highlightWeekends: boolean;
    disableWeekends: boolean;
    enableCenturyView: boolean;
    /**
     * The increment, in minutes, between the options the minute column offers
     * — 15 for quarter hours, 60 to pin minutes to the hour. See
     * normalizeMinuteStep for how out-of-range values are handled.
     */
    minuteStep: number;
    minDate: Date | Calendar.Date | null;
    maxDate: Date | Calendar.Date | null;
  };
}

// === local types ===================================================

type Time = Readonly<{ hours: number; minutes: number }>;

// Everything the cell fills are derived from, worked out once per sheet — see
// #selectionBounds.
type SelectionBounds = Readonly<{
  hasRange: boolean;
  start: string;
  end: string;
  // Null unless the pointer is proposing a range: one endpoint chosen, pointer
  // over another selectable cell.
  pendingStart: string | null;
  pendingEnd: string | null;
}>;

// === local VDOM factories ==========================================

const a = h.bind(null, 'a');
const div = h.bind(null, 'div');

// === exported classes ==============================================

class DatePicker {
  static styles = datePickerBaseStyles;

  #calendar: Calendar;
  #getLocale: () => string;
  #getProps: () => DatePicker.Props;
  #requestUpdate: () => void;
  #onChange: () => void;

  #selection = new Set<string>();
  #year: number;
  #month: number;
  #time1: Time = { hours: 0, minutes: 0 };
  #time2: Time = { hours: 0, minutes: 0 };

  #selectionMode: SelectionMode = 'date';
  #view: View = 'month';
  #sheet: Calendar.Sheet | null = null;
  // Which cell the pointer is over, as an index into the current sheet's items.
  // Tracked because a hovered cell paints a fill like a selected one does, so it
  // has to take part in the joined-edge adjacency (see #isFilledCell) — and
  // "the cell one row up is hovered" is not something CSS can express.
  #hoveredIndex: number | null = null;
  #lastTimeValueKey = '';
  #lastTimeLayoutKey = '';
  #renderTarget?: HTMLElement;
  #timeColumnResizeObserver?: ResizeObserver;
  #observedTimeColumn?: Element;

  constructor(params: {
    calendar: Calendar;
    getLocale: () => string;
    getDirection: () => string;
    getProps: () => DatePicker.Props; //
    requestUpdate: () => void;
    onChange: () => void;
  }) {
    this.#calendar = params.calendar;
    this.#getLocale = params.getLocale;
    const today = this.#calendar.today();
    this.#year = today.year;
    this.#month = today.month;
    this.#getProps = params.getProps;
    this.#requestUpdate = params.requestUpdate;
    this.#onChange = params.onChange;
  }

  render(target: HTMLElement) {
    this.#renderTarget = target;
    render(this.#renderDatePicker(), target);
    this.#scrollSelectedTimeIntoView(target);
    this.#observeTimeColumnResize(target);
  }

  /**
   * Releases what `render` attached to the DOM — currently the time columns'
   * ResizeObserver. Call it when the rendered output is discarded for good;
   * the picker is reusable afterwards (a further `render` re-attaches).
   */
  destroy() {
    this.#timeColumnResizeObserver?.disconnect();
    this.#timeColumnResizeObserver = undefined;
    this.#observedTimeColumn = undefined;
    this.#renderTarget = undefined;
  }

  renderToString(): string {
    return renderToString(this.#renderDatePicker());
  }

  getValue(): string {
    const items = [...this.#selection].sort();
    const { kind, selectType } = selectionModeMeta[this.#selectionMode];

    if (kind !== 'time' && items.length === 0) {
      return '';
    }

    if (kind === 'calendar') {
      return items.join(',');
    }

    if (kind === 'calendar+time') {
      const items2: string[] = [];

      items2.push(
        items[0] +
          'T' +
          getHourMinuteString(this.#time1.hours, this.#time1.minutes)
      );

      if (items.length > 1) {
        items2.push(
          items[1] +
            'T' +
            getHourMinuteString(this.#time2.hours, this.#time2.minutes)
        );
      }

      return items2.join(',');
    }

    if (selectType === 'single') {
      return getHourMinuteString(this.#time1.hours, this.#time1.minutes);
    }

    return (
      getHourMinuteString(this.#time1.hours, this.#time1.minutes) +
      ',' +
      getHourMinuteString(this.#time2.hours, this.#time2.minutes)
    );
  }

  setValue(value: string) {
    this.#selection.clear();

    if (!value) {
      this.#requestUpdate();
      return;
    }

    const { kind } = selectionModeMeta[this.#selectionMode];
    const items = value.split(',');

    // Routed by kind, because a time doesn't live in #selection: the clock
    // half of the value is held in #time1/#time2 and only reassembled by
    // getValue. Restoring therefore has to split the two apart again.
    //
    // Every item used to go into #selection verbatim, which meant a "14:30"
    // landed where #renderTime expected a date key and its own date
    // formatting threw RangeError on the way past ("Invalid time value") —
    // reachable from ui-date-field, which hands its value back to the picker
    // whenever the popup reopens.
    if (kind === 'time') {
      items.slice(0, 2).forEach((item, index) => {
        const time = parseHoursMinutes(item);

        if (time) {
          this.#setTime(index === 0 ? 'time1' : 'time2', time.hours, time.minutes);
        }
      });
    } else if (kind === 'calendar+time') {
      items.slice(0, 2).forEach((item, index) => {
        const [datePart, timePart] = item.split('T');

        if (datePart) {
          this.#selection.add(datePart);
        }

        const time = timePart ? parseHoursMinutes(timePart) : null;

        if (time) {
          this.#setTime(index === 0 ? 'time1' : 'time2', time.hours, time.minutes);
        }
      });
    } else {
      // Still unvalidated (the calendar kinds' own keys are several different
      // shapes — a day, a week, a quarter — and there's no parser for them
      // yet), so an unparseable key here is simply carried until something
      // downstream ignores it. That part of the original TODO stands.
      items.forEach((item) => this.#selection.add(item));
    }

    this.#requestUpdate();
  }

  resetView() {
    this.#view = selectionModeMeta[this.#selectionMode].initialView;
    this.#requestUpdate();
  }

  #getTime(type: 'time1' | 'time2') {
    return type === 'time1' ? this.#time1 : this.#time2;
  }

  #setTime(
    type: 'time1' | 'time2',
    hours: number | null,
    minutes: number | null
  ) {
    const oldTime = type === 'time1' ? this.#time1 : this.#time2;

    const newTime = {
      hours: hours ?? oldTime.hours,
      minutes: minutes ?? oldTime.minutes
    };

    if (type === 'time1') {
      this.#time1 = newTime;
    } else {
      this.#time2 = newTime;
    }
  }

  #onParentClick = () => {
    // The sheet changes under the pointer; a stale index would mark the
    // wrong cell as filled, and mouseleave may not fire across a patch.
    this.#hoveredIndex = null;

    const idx = calendarViewOrder.indexOf(this.#view as CalendarView);

    const nextView =
      idx < 0 || idx === calendarViewOrder.length - 1
        ? null
        : calendarViewOrder[idx + 1];

    if (nextView) {
      this.#view = nextView as View;
      this.#requestUpdate();
    }
  };

  #onNextClick = () => {
    // The sheet changes under the pointer; a stale index would mark the
    // wrong cell as filled, and mouseleave may not fire across a patch.
    this.#hoveredIndex = null;

    if (this.#sheet?.next) {
      this.#year = this.#sheet.next.year;
      this.#month = this.#sheet.next.month ?? this.#month;
      this.#requestUpdate();
    }
  };

  #onPreviousClick = () => {
    // The sheet changes under the pointer; a stale index would mark the
    // wrong cell as filled, and mouseleave may not fire across a patch.
    this.#hoveredIndex = null;

    if (this.#sheet?.previous) {
      this.#year = this.#sheet.previous.year;
      this.#month = this.#sheet.previous.month ?? this.#month;
      this.#requestUpdate();
    }
  };

  #onItemClick = (_ev: Event, props: DatePicker.Props, item: Calendar.Item) => {
    const selectionKey = getSelectionKey(item, this.#selectionMode);
    const selectType = selectionModeMeta[props.selectionMode].selectType;
    const initialView = selectionModeMeta[props.selectionMode].initialView;
    const selected = this.#selection.has(selectionKey);

    if (this.#view !== initialView) {
      const idx = calendarViewOrder.indexOf(this.#view as CalendarView);

      const nextView = idx < 1 ? null : calendarViewOrder[idx - 1];

      if (nextView) {
        this.#year = item.year;

        if (item.type === 'day' || item.type === 'month') {
          this.#month = item.month;
        }

        this.#view = nextView as View;
        this.#requestUpdate();
      }

      return;
    }

    if (selectType === 'single') {
      this.#selection.clear();

      if (!selected) {
        this.#selection.add(selectionKey);
      }
    } else if (selectType === 'multi') {
      if (selected) {
        this.#selection.delete(selectionKey);
      } else {
        this.#selection.add(selectionKey);
      }
    } else if (selected) {
      this.#selection.delete(selectionKey);
    } else if (this.#selection.size > 1) {
      this.#selection.clear();
      this.#selection.add(selectionKey);
    } else {
      this.#selection.add(selectionKey);
    }

    this.#requestUpdate();
    this.#onChange?.();
  };

  #onBackToMonthClick = () => {
    // The sheet changes under the pointer; a stale index would mark the
    // wrong cell as filled, and mouseleave may not fire across a patch.
    this.#hoveredIndex = null;

    this.#view = 'month';
    this.#requestUpdate();
  };

  #renderDatePicker() {
    const props = this.#getProps();

    const minDate =
      props.minDate === null || !(props.minDate instanceof Date)
        ? props.minDate
        : this.#calendar.convertDate(props.minDate);

    const maxDate =
      props.maxDate === null || !(props.maxDate instanceof Date)
        ? props.maxDate
        : this.#calendar.convertDate(props.maxDate);

    if (this.#selectionMode !== props.selectionMode) {
      if (this.#selection.size > 0) {
        this.#selection.clear();
        this.#onChange?.();
      }

      this.#view = selectionModeMeta[props.selectionMode].initialView;
      this.#setTime('time1', 0, 0);
      this.#setTime('time2', 0, 0);
    }

    this.#selectionMode = props.selectionMode;
    this.#sheet = null;

    if (this.#view === 'month') {
      this.#sheet = this.#calendar.getMonthSheet({
        year: this.#year,
        month: this.#month,
        showWeekNumbers: props.showWeekNumbers,
        highlightWeekends: props.highlightWeekends,
        highlightCurrent: props.highlightCurrent,
        disableWeekends: props.disableWeekends,

        selectWeeks:
          props.selectionMode === 'week' ||
          props.selectionMode === 'weeks' ||
          props.selectionMode === 'weekRange',

        calendarSize: props.calendarSize,
        minDate,
        maxDate
      });
    } else if (this.#view === 'year') {
      this.#sheet = this.#calendar.getYearSheet({
        year: this.#year,
        minDate,
        maxDate,

        selectQuarters:
          props.selectionMode === 'quarter' ||
          props.selectionMode === 'quarters' ||
          props.selectionMode === 'quarterRange'
      });
    } else if (this.#view === 'decade') {
      this.#sheet = this.#calendar.getDecadeSheet({
        year: this.#year,
        minDate,
        maxDate
      });
    } else if (this.#view === 'century') {
      this.#sheet = this.#calendar.getCenturySheet({
        year: this.#year,
        minDate,
        maxDate
      });
    }

    return this.#view !== 'time1' && this.#view !== 'time2'
      ? this.#renderCalendarView(this.#sheet!, props)
      : this.#renderTimeView(props);
  }

  #renderCalendarView(sheet: Calendar.Sheet, props: DatePicker.Props) {
    const kind = selectionModeMeta[props.selectionMode].kind;

    return div(
      {
        class: 'cal-base cal-view--' + this.#view
      },
      this.#renderSheetHeader(sheet, props),
      this.#renderSheet(sheet, props),
      kind === 'calendar' ? null : this.#renderTimeLinks()
    );
  }

  #renderTimeView(props: DatePicker.Props) {
    const { kind } = selectionModeMeta[props.selectionMode];

    return div(
      {
        class: 'cal-base cal-view--' + this.#view
      },
      this.#renderTimeTabs(this.#view === 'time2' ? 'time2' : 'time1', props),
      this.#renderTimeSelector(this.#view == 'time2' ? 'time2' : 'time1', props),

      kind !== 'calendar+time'
        ? null
        : a(
            {
              class: 'cal-back-to-month-link',
              onclick: this.#onBackToMonthClick
            },
            // The same arrow SVG the sheet header's prev control uses, rather
            // than the U+1F860 character this had: that codepoint is in none of
            // the fonts this library specifies, so it rendered as a tofu box.
            // It was also a *rightwards* arrow on a "back" link.
            arrowLeftIcon,
            'Back to month'
          )
    );
  }

  #renderSheetHeader(sheet: Calendar.Sheet, props: DatePicker.Props) {
    const parentViewDisabled =
      this.#view === 'century' ||
      (this.#view === 'decade' && !props.enableCenturyView);

    return div(
      {
        class: classMap({
          'cal-header': true,
          'cal-header--accentuated': props.accentuateHeader
        })
      },
      div(
        {
          class: classMap({
            'cal-prev': true,
            'cal-prev--disabled': !sheet.previous
          }),
          onclick: !sheet.previous ? null : this.#onPreviousClick
        },
        arrowLeftIcon
      ),
      div(
        {
          class: classMap({
            'cal-title': true,
            'cal-title--disabled': parentViewDisabled
          }),
          onclick: parentViewDisabled ? null : this.#onParentClick
        },
        sheet.name
      ),
      div(
        {
          class: classMap({
            'cal-next': true,
            'cal-next--disabled': !sheet.next
          }),
          onclick: !sheet.next ? null : this.#onNextClick
        },
        arrowRightIcon
      )
    );
  }

  #renderSheet(sheet: Calendar.Sheet, props: DatePicker.Props) {
    const hasRowNames = !!sheet.rowNames?.length;

    let gridTemplateColumns =
      (hasRowNames ? 'min-content ' : '') + `repeat(${sheet.columnCount}, 1fr)`;

    return div(
      {
        class: 'cal-sheet',
        style: `grid-template-columns: ${gridTemplateColumns};`
      },
      sheet.columnNames?.length ? this.#renderTableHead(sheet, props) : null,
      this.#renderTableBody(sheet, props)
    );
  }

  #renderTableHead(sheet: Calendar.Sheet, _props: DatePicker.Props) {
    const hasRowNames = !!sheet.rowNames?.length;

    const headRow = sheet.columnNames!.map((it, idx) =>
      div(
        {
          class: classMap({
            'cal-meta-cell': true,
            'cal-column-name': true,
            'cal-column-name--highlighted':
              sheet.highlightedColumns?.includes(idx)
          })
        },
        it
      )
    );

    if (hasRowNames) {
      headRow.unshift(div({ class: 'cal-meta-cell' }));
    }

    return headRow;
  }

  #renderTableBody(sheet: Calendar.Sheet, props: DatePicker.Props) {
    const hasRowNames = !!sheet.rowNames?.length;
    const cells: VNode[] = [];

    // Which cells carry a selection fill — the selected ones plus anything
    // inside a selection range. Computed once for the whole sheet because each
    // cell needs to know about its neighbours, not just itself: where two
    // filled cells touch, the shared edge is squared off so a run of them reads
    // as one region rather than a row of rounded tiles.
    const bounds = this.#selectionBounds(sheet);

    const filled = sheet.items.map((_, idx) =>
      this.#isFilledCell(sheet, props, idx, bounds)
    );

    sheet.items.forEach((item, idx) => {
      if (hasRowNames && idx % 7 === 0) {
        cells.push(
          div({ class: 'cal-meta-cell cal-row-name' }, sheet.rowNames![idx / 7])
        );
      }

      cells.push(
        this.#renderTableCell(item, sheet, props, idx, filled, bounds)
      );
    });

    return cells;
  }

  // Every boundary the fills depend on, worked out once per sheet rather than
  // per cell (it used to sort the selection inside each cell's render).
  //
  // `pending` is the range the pointer is currently *proposing*: with one
  // endpoint chosen, hovering another cell previews the range those two would
  // make. That preview used to be done entirely in CSS, with two !important
  // rules keyed off `~` sibling chains — which meant the core had no idea which
  // cells were in it, so they couldn't take part in the corner joining.
  #selectionBounds(sheet: Calendar.Sheet): SelectionBounds {
    const { selectType } = selectionModeMeta[this.#selectionMode];
    const sorted = [...this.#selection].sort();
    const hasRange = selectType === 'range' && sorted.length > 0;
    const start = sorted[0];
    const end = sorted.length < 2 ? sorted[0] : sorted[1];

    let pendingStart: string | null = null;
    let pendingEnd: string | null = null;

    if (hasRange && sorted.length === 1 && this.#hoveredIndex !== null) {
      const hovered = sheet.items[this.#hoveredIndex];

      // A minimal-size placeholder can't be hovered (it has no handlers), so
      // only `disabled` needs excluding here.
      if (hovered && !hovered.disabled) {
        const hoveredKey = getSelectionKey(hovered, this.#selectionMode);
        const before = hoveredKey < start;

        pendingStart = before ? hoveredKey : start;
        pendingEnd = before ? start : hoveredKey;
      }
    }

    return { hasRange, start, end, pendingStart, pendingEnd };
  }

  // Whether the cell at `index` paints a selection fill. Anything that doesn't
  // render as a real cell counts as not filled — in calendarSize "minimal" an
  // adjacent day is an empty placeholder (see #renderTableCell), and a gap
  // should break a run rather than be bridged across.
  #isFilledCell(
    sheet: Calendar.Sheet,
    props: DatePicker.Props,
    index: number,
    bounds: SelectionBounds
  ): boolean {
    const item = sheet.items[index];

    if (!item || (props.calendarSize === 'minimal' && item.adjacent)) {
      return false;
    }

    // A hovered cell paints the same fill the selection range does, so it joins
    // its neighbours exactly like one. Disabled cells have no hover fill.
    if (index === this.#hoveredIndex && !item.disabled) {
      return true;
    }

    const key = getSelectionKey(item, this.#selectionMode);

    if (this.#selection.has(key)) {
      return true;
    }

    if (bounds.hasRange && key >= bounds.start && key <= bounds.end) {
      return true;
    }

    // The range being proposed reads as one region too, so it joins as one.
    return (
      bounds.pendingStart !== null &&
      key >= bounds.pendingStart &&
      key <= bounds.pendingEnd!
    );
  }

  #renderTableCell(
    item: Calendar.Item,
    sheet: Calendar.Sheet,
    props: DatePicker.Props,
    columnIndex: number,
    filled: boolean[],
    bounds: SelectionBounds
  ) {
    if (props.calendarSize === 'minimal' && item.adjacent) {
      const highlighted = !!sheet.highlightedColumns?.includes(
        columnIndex % sheet.columnCount
      );

      return div({
        class: classMap({
          'cal-cell--highlighted': highlighted
        })
      });
    }

    const selectionKey = getSelectionKey(item, this.#selectionMode);
    const selected = this.#selection.has(selectionKey);

    return a(
      {
        class: classMap({
          'cal-cell': true,
          'cal-cell--current': !props.highlightCurrent ? null : item.current,
          'cal-cell--disabled': item.disabled,
          'cal-cell--adjacent': item.adjacent,
          'cal-cell--highlighted': item.highlighted,
          'cal-cell--selected': selected,

          'cal-cell--in-selection-range':
            bounds.hasRange &&
            selectionKey >= bounds.start &&
            selectionKey <= bounds.end,

          // The range the pointer is proposing. Replaces the pair of
          // before-/after-singleton-selection-range classes, which existed only
          // so CSS could infer the preview from `~` sibling chains — the core
          // knows the actual bounds now, so the preview rounds and joins like
          // any other fill.
          'cal-cell--in-pending-range':
            bounds.pendingStart !== null &&
            selectionKey >= bounds.pendingStart &&
            selectionKey <= bounds.pendingEnd!,

          // Edges shared with another filled cell, so the corners there can be
          // squared off (see the .cal-cell--joined-* rules). Named for the
          // logical axes rather than left/right/top/bottom: the sheet is a grid
          // that flips in an RTL locale, so the previous item in reading order
          // is the one to the visual *right* there — and the CSS uses logical
          // corner properties to match.
          ...this.#joinedEdgeClasses(sheet, columnIndex, filled)
        }),

        onclick: item.disabled
          ? null
          : (ev: Event) => this.#onItemClick(ev, props, item),

        // mouseenter/mouseleave rather than mouseover/mouseout: these don't
        // bubble, so each cell's handler fires once on entry and once on exit
        // instead of again for the inner .cal-cell-text.
        onmouseenter: item.disabled ? null : () => this.#setHovered(columnIndex),
        onmouseleave: item.disabled ? null : () => this.#setHovered(null)
      },
      div({ class: 'cal-cell-text' }, item.name)
    );
  }

  // --- time links ------------------------------------------------

  #renderTimeLinks() {
    const selectionSize = this.#selection.size;

    return div(
      { class: 'cal-time-links' },
      this.#renderTimeLink('time1'),
      selectionSize > 1 ? this.#renderTimeLink('time2') : null
    );
  }

  #renderTimeLink(type: 'time1' | 'time2') {
    const time = this.#getTime(type);

    let timeString =
      this.#selection.size > 0 //
        ? this.#calendar.formatTime(time)
        : '';

    return a(
      {
        class: classMap({
          'cal-time-link': true,
          'cal-time-link--disabled': timeString === ''
        }),
        onclick: () => {
          this.#view = type;
          this.#requestUpdate();
        }
      },
      timeIcon,
      timeString === '' ? '--:--' : timeString
    );
  }

  // --- time --------------------------------------------------------

  #renderTime(type: 'time1' | 'time2', _props: DatePicker.Props) {
    const { kind, selectType } = selectionModeMeta[this.#selectionMode];
    const time = this.#getTime(type);

    // Only well-formed year-month-day keys, so a malformed entry yields no
    // header instead of reaching formatDate and throwing on an Invalid Date.
    const items = [...this.#selection]
      .sort()
      .map((it) =>
        it
          .split('T')[0]
          .split('-')
          .map((part) => parseInt(part, 10))
      )
      .filter(
        (parts) => parts.length === 3 && parts.every((n) => Number.isFinite(n))
      );

    const formattedDate =
      type === 'time1' && items.length > 0
        ? this.#calendar.formatDate({
            year: items[0][0],
            month: items[0][1],
            day: items[0][2]
          })
        : type === 'time2' && items.length > 1
        ? this.#calendar.formatDate({
            year: items[1][0],
            month: items[1][1],
            day: items[1][2]
          })
        : '';

    const formattedTime = this.#calendar.formatTime(time);
    let timeHeader: VNode = null;

    if (formattedDate) {
      const fromOrToLabel =
        selectType === 'range' && this.#selection.size > 1
          ? (type === 'time1' ? 'From:' : 'To:') + '\u00a0\u00a0'
          : '';

      timeHeader = div(
        { class: 'cal-time-header' },
        fromOrToLabel,
        formattedDate
      );
    } else if (
      this.#selection.size > 1 ||
      (kind === 'time' && selectType === 'range')
    ) {
      timeHeader = div(
        { class: 'cal-time-header' },
        (type === 'time1' ? 'From:' : 'To:') + '\u00a0\u00a0'
      );
    }

    return div(
      {
        class: 'cal-time',
        onclick: () => {
          this.#view = type;
          this.#requestUpdate();
        }
      },
      timeHeader,
      div({ class: 'cal-time-value' }, formattedTime)
    );
  }

  // --- time tabs ---------------------------------------------------

  #renderTimeTabs(type: 'time1' | 'time2', props: DatePicker.Props) {
    const { kind, selectType } = selectionModeMeta[props.selectionMode];
    const showsTwoTabs = kind === 'time' || this.#selection.size > 1;

    return div(
      {
        class: classMap({
          'cal-time-tabs': true,
          [`cal-time-tabs--active-tab-${type}`]: showsTwoTabs
        })
      },
      this.#renderTime('time1', props),
      (kind === 'time' && selectType === 'range') || this.#selection.size > 1
        ? this.#renderTime('time2', props)
        : null
    );
  }

  #setHovered(index: number | null) {
    if (this.#hoveredIndex === index) {
      return;
    }

    this.#hoveredIndex = index;
    this.#requestUpdate();
  }

  // The joined-edge classes for the cell at `index`. Only a filled cell can be
  // joined to anything; an unfilled one has no fill whose corners could need
  // squaring.
  #joinedEdgeClasses(
    sheet: Calendar.Sheet,
    index: number,
    filled: boolean[]
  ): Record<string, boolean> {
    if (!filled[index]) {
      return {};
    }

    const column = index % sheet.columnCount;

    return {
      // Guarded by column, or the last cell of a row would be treated as
      // touching the first cell of the next one: adjacent in the DOM, nowhere
      // near each other on screen.
      'cal-cell--joined-inline-start': column > 0 && !!filled[index - 1],
      'cal-cell--joined-inline-end':
        column < sheet.columnCount - 1 && !!filled[index + 1],
      'cal-cell--joined-block-start': !!filled[index - sheet.columnCount],
      'cal-cell--joined-block-end': !!filled[index + sheet.columnCount]
    };
  }

  // --- time selector -----------------------------------------------

  // Two scrollable option columns (hour, minute) plus an AM/PM control where
  // the locale uses a 12-hour clock — replacing the pair of range sliders this
  // used to be. Sliders were the wrong control for the job: dragging a 0..23
  // track to land on one hour is imprecise, the value only became visible in
  // the header above, and the minute slider was stepped to 5 so two thirds of
  // the minutes in an hour simply weren't reachable. Every minute is
  // selectable here, and the current value is a highlighted option you can
  // see in place.
  //
  // Positionally diffed like everything else in this vdom (no keys). The hour
  // and AM/PM counts are fixed, so patching a click there only rewrites the two
  // affected class attributes. The minute count can change — with minuteStep,
  // and again when an off-grid value adds or drops its extra option — which the
  // diff handles by appending or removing at the tail; it just re-patches more
  // of the column when it happens.
  #renderTimeSelector(type: 'time1' | 'time2', props: DatePicker.Props) {
    const time = this.#getTime(type);
    const twelveHour = uses12HourClock(this.#getLocale());

    const setHours = (hours: number) => {
      this.#setTime(type, hours, null);
      this.#requestUpdate();
      this.#onChange?.();
    };

    // In 12-hour mode the options read 12, 1, 2 … 11 and carry the active
    // meridiem, so clicking "3" in the afternoon means 15:00, not 03:00.
    const hourOptions = twelveHour
      ? Array.from({ length: 12 }, (_, i) => {
          const clockHour = i === 0 ? 12 : i;
          return {
            label: String(clockHour),
            selected: time.hours % 12 === i,
            onSelect: () => setHours(time.hours < 12 ? i : i + 12)
          };
        })
      : Array.from({ length: 24 }, (_, hours) => ({
          label: twoDigits(hours),
          selected: time.hours === hours,
          onSelect: () => setHours(hours)
        }));

    const minuteStep = normalizeMinuteStep(props.minuteStep);
    const minuteValues: number[] = [];

    for (let minutes = 0; minutes < 60; minutes += minuteStep) {
      minuteValues.push(minutes);
    }

    // A minute that isn't on the step's grid is added to the list rather than
    // rounded away. The value can easily be off-grid — restored from a form, an
    // API, or picked while the step was finer — and silently rewriting it on
    // render would mean this component quietly changed data it was only asked
    // to display. The extra option disappears as soon as an on-grid minute is
    // picked.
    if (!minuteValues.includes(time.minutes)) {
      minuteValues.push(time.minutes);
      minuteValues.sort((a, b) => a - b);
    }

    const minuteOptions = minuteValues.map((minutes) => ({
      label: twoDigits(minutes),
      selected: time.minutes === minutes,
      onSelect: () => {
        this.#setTime(type, null, minutes);
        this.#requestUpdate();
        this.#onChange?.();
      }
    }));

    const meridiemOptions = (['AM', 'PM'] as const).map((label, index) => ({
      label,
      selected: (time.hours >= 12 ? 1 : 0) === index,
      // Keeps the hour-of-day within its half and swaps which half it's in, so
      // picking PM at 9am gives 21:00 rather than resetting the hour.
      onSelect: () => setHours((time.hours % 12) + index * 12)
    }));

    // Whether the from:/to: tabs above are both showing — the same condition
    // #renderTimeTabs uses to decide whether to render the second one.
    const { kind, selectType } = selectionModeMeta[props.selectionMode];
    const twoTabs =
      (kind === 'time' && selectType === 'range') || this.#selection.size > 1;

    return div(
      {
        // The outer box only positions the wheels; .cal-time-wheels below is
        // the row itself. With both tabs showing, the wheels sit under whichever
        // one is being edited so it's visually obvious which half of the range
        // is changing; with a single tab there's nothing to disambiguate and
        // they stay centred.
        class: classMap({
          'cal-time-selector': true,
          [`cal-time-selector--${type}`]: twoTabs
        })
      },
      div(
      { class: 'cal-time-wheels' },
      this.#renderTimeColumn('Hour', 'Hour', hourOptions),
      // The colon is the one child that isn't a column, so it borrows the
      // columns' group shape to line up with them — see #renderTimeAside.
      this.#renderTimeAside(div({ class: 'cal-time-separator' }, ':')),
      this.#renderTimeColumn('Minute', 'Minute', minuteOptions),
      // Deliberately a third column rather than the pair of buttons it started
      // as: two options is few enough that buttons were tempting, but they put
      // a second visual language (bordered chips) next to two borderless
      // option lists, and needed their own alignment handling to sit level
      // with the selected rows. As a column it matches the other two exactly,
      // costs no extra styling, and is how native time pickers present it.
      // Captionless — "AM/PM" above AM and PM would only restate them — but
      // the empty caption is still rendered, since that is what holds all
      // three columns level.
      !twelveHour
        ? null
        : this.#renderTimeColumn('', 'AM/PM', meridiemOptions)
      )
    );
  }

  // Wraps a non-column child of the time selector so it shares the columns'
  // group structure — see the note at the call site.
  #renderTimeAside(content: VNode) {
    return div(
      { class: 'cal-time-column-group' },
      div({ class: 'cal-time-column-label', 'aria-hidden': 'true' }),
      content
    );
  }

  #renderTimeColumn(
    caption: string,
    ariaLabel: string,
    options: { label: string; selected: boolean; onSelect: () => void }[]
  ) {
    return div(
      { class: 'cal-time-column-group' },
      caption
        ? div({ class: 'cal-time-column-label' }, caption)
        : div({ class: 'cal-time-column-label', 'aria-hidden': 'true' }),
      div(
        // The scroll container. Kept scrollable rather than showing all 60
        // minutes at once so the time view stays roughly as tall as the month
        // sheet and the popup doesn't resize when switching between them;
        // #scrollSelectedTimeIntoView centres the current value in it.
        { class: 'cal-time-column', role: 'listbox', 'aria-label': ariaLabel },
        ...options.map((option) =>
          a(
            {
              class: classMap({
                'cal-time-option': true,
                'cal-time-option--selected': option.selected
              }),
              role: 'option',
              'aria-selected': option.selected,
              onclick: option.onSelect
            },
            option.label
          )
        )
      )
    );
  }

  // A resize moves where a column's centre *is* without changing what's
  // selected, so it can't be caught by re-rendering — nothing re-renders. The
  // case that reaches this in practice is a consumer changing --ui-scale or an
  // inherited font-size while a time view is open: every em-based measurement
  // here rescales, and the scroll offset that centred the old layout no longer
  // centres the new one.
  //
  // Observed once per set of columns rather than on every render: the vdom
  // patches these elements in place, so while the view stays a time view the
  // same nodes persist and re-observing would only re-fire the callback for
  // nothing. Switching away removes them, which disconnects.
  #observeTimeColumnResize(target: HTMLElement) {
    // Absent in a non-DOM runtime; renderToString never gets here anyway.
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const columns = target.querySelectorAll('.cal-time-column');

    if (columns[0] === this.#observedTimeColumn) {
      return;
    }

    this.#timeColumnResizeObserver?.disconnect();
    this.#observedTimeColumn = columns[0];

    if (!columns.length) {
      return;
    }

    this.#timeColumnResizeObserver ??= new ResizeObserver(() => {
      // Just re-run the positioning: it reads the column's live clientHeight
      // itself, so it detects a height change on its own and no-ops when only
      // the width moved.
      //
      // It must NOT invalidate #lastTimeLayoutKey first. That looks harmless —
      // the key is recomputed anyway — but a ResizeObserver fires for *width*
      // too, and this observer's own columns change width whenever the selected
      // option is re-bolded. Clearing the key there forced the follow-up
      // re-centre into 'auto', which landed a microtask after the smooth scroll
      // had started and snapped it straight to the end. The visible symptom was
      // the AM/PM column jumping while the hour and minute columns glided: it's
      // the one column narrow enough that re-bolding two-letter labels actually
      // shifts its measured width.
      if (this.#renderTarget) {
        this.#scrollSelectedTimeIntoView(this.#renderTarget);
      }
    });

    for (const column of columns) {
      this.#timeColumnResizeObserver.observe(column);
    }
  }

  // Centres the selected option in each column after a patch. Runs from
  // render() rather than from the click handlers so it also covers the value
  // being set from outside (setValue) and the view being switched to.
  //
  // Animates only when the *value* moved: picking an option glides the columns
  // to the new time, which is what makes three separate lists read as one
  // control settling on a value. A first positioning or a relayout jumps
  // instead — those should look already-settled, not animate in from whatever
  // offset they happened to be sitting at.
  //
  // Skipped entirely while a column has no layout (clientHeight 0 — the picker
  // sits inside a closed popover in ui-date-field), leaving the keys unset so
  // the next render, once it is visible, does the positioning.
  #scrollSelectedTimeIntoView(target: HTMLElement) {
    if (this.#view !== 'time1' && this.#view !== 'time2') {
      this.#lastTimeValueKey = '';
      this.#lastTimeLayoutKey = '';
      return;
    }

    const columns = target.querySelectorAll<HTMLElement>('.cal-time-column');

    if (!columns.length) {
      this.#lastTimeValueKey = '';
      this.#lastTimeLayoutKey = '';
      return;
    }

    const time = this.#getTime(this.#view);
    const valueKey = `${this.#view}:${time.hours}:${time.minutes}`;
    // The column's own height, tracked separately from the value: a relayout
    // moves where the centre *is* without changing what's selected, so the
    // positioning has to re-run — but as a jump, not a glide.
    const layoutKey = String(columns[0].clientHeight);

    if (
      valueKey === this.#lastTimeValueKey &&
      layoutKey === this.#lastTimeLayoutKey
    ) {
      return;
    }

    const settled =
      this.#lastTimeValueKey !== '' && layoutKey === this.#lastTimeLayoutKey;

    // Honoured explicitly: unlike a CSS transition, a programmatic smooth
    // scroll is not suppressed for a reduced-motion preference on its own.
    const reducedMotion =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    const behavior: ScrollBehavior =
      settled && !reducedMotion ? 'smooth' : 'auto';

    let scrolled = false;

    for (const column of columns) {
      const selected = column.querySelector<HTMLElement>(
        '.cal-time-option--selected'
      );

      if (!selected || !column.clientHeight) {
        continue;
      }

      column.scrollTo({
        top:
          selected.offsetTop -
          (column.clientHeight - selected.offsetHeight) / 2,
        behavior
      });

      scrolled = true;
    }

    if (scrolled) {
      this.#lastTimeValueKey = valueKey;
      this.#lastTimeLayoutKey = layoutKey;
    }
  }
}

// === local helpers =================================================

// Valid steps are 1 to 60. Anything else falls back to 60, which produces
// exactly one option, "00" — minutes pinned to the hour. That covers a missing
// or non-numeric value, zero, a negative, and anything longer than an hour.
//
// In particular 120 does *not* mean "every two hours". The time wheels are a
// product of an hour list and a minute list, so a minute step has no way to
// filter hours; expressing that would take a separate hour step. Rather than
// half-honour it, an out-of-range step lands on the coarsest thing this control
// can actually represent, which is visibly coarse rather than silently wrong.
//
// Fractions are truncated (7.5 behaves as 7) — the conventional coercion for a
// numeric attribute, and friendlier than treating it as invalid.
//
// Only divisors of 60 give an even grid across the hour. A non-divisor is still
// accepted: 25 offers 00 and 25, and the wrap from 25 to the next hour's 00 is
// simply a shorter gap.
function normalizeMinuteStep(value: number): number {
  const step = Math.trunc(value);

  return Number.isFinite(step) && step >= 1 && step <= 60 ? step : 60;
}

function parseHoursMinutes(
  text: string
): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours > 23 || minutes > 59 ? null : { hours, minutes };
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

// Whether the locale writes times on a 12-hour clock, and so whether the hour
// column should read 12,1..11 with an AM/PM control beside it or 00..23 on its
// own. Read off Intl's own resolution rather than guessed from the region, so
// an explicit override in the tag (e.g. "en-GB-u-hc-h12") is honoured.
// Memoized: this is consulted on every render of the time view.
const twelveHourByLocale = new Map<string, boolean>();

function uses12HourClock(locale: string): boolean {
  let result = twelveHourByLocale.get(locale);

  if (result === undefined) {
    try {
      const { hourCycle } = new Intl.DateTimeFormat(locale, {
        hour: 'numeric'
      }).resolvedOptions();

      result = hourCycle === 'h11' || hourCycle === 'h12';
    } catch {
      // An invalid language tag — fall back to the 24-hour layout, which needs
      // no meridiem control and so can't render a half-broken one.
      result = false;
    }

    twelveHourByLocale.set(locale, result);
  }

  return result;
}

function getSelectionKey(
  item: Calendar.Item,
  selectionMode: DatePicker.SelectionMode
) {
  let ret;

  if (item.type !== 'day' || typeof item.weekNumber !== 'number') {
    ret = String(item.year).padStart(4, '0');

    // TODO!!!
    if (
      (selectionMode !== 'quarter' &&
        selectionMode !== 'quarters' &&
        selectionMode !== 'quarterRange') ||
      item.type !== 'month'
    ) {
      if (item.type === 'day' || item.type === 'month') {
        ret += '-' + String(item.month + 1).padStart(2, '0');
      }

      if (item.type === 'day') {
        ret += '-' + String(item.day).padStart(2, '0');
      }
    } else {
      ret += '-Q' + String(Math.floor(item.month! / 3) + 1);
    }
  } else {
    ret =
      String(item.weekYear).padStart(4, '0') +
      '-W' +
      String(item.weekNumber).padStart(2, '0');
  }

  return ret;
}

function getHourMinuteString(hour: number, minute: number) {
  const h = hour.toString().padStart(2, '0');
  const m = minute.toString().padStart(2, '0');

  return `${h}:${m}`;
}
