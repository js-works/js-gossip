export default /*css*/ `
  .cal-base {
    display: flex;
    flex-direction: column;
    color: var(--cal-color);
    background-color: var(--cal-background-color);
    font-family: var(--cal-font-family);
    font-size: var(--cal-font-size);
    user-select: none;
    min-width: 20em;
    min-height: 17em;
  }
  
  .cal-base * {
    box-spacing: border-box;
  }

  .cal-view--month .cal-sheet {
    min-height: 12em;
  }

  .cal-view--year .cal-sheet,
  .cal-view--decade .cal-sheet {
    min-height: 8em;
  }

  .cal-view--century .cal-sheet {
    min-height: 12em;
  }

  /* calendar sheet and sheet header */

  .cal-header {
    display: grid;
    grid-template-columns: min-content auto min-content;
    align-items: stretch;
    color: var(--cal-nav-color);
    background-color: var(--cal-nav-active-background-color);
  }

  .cal-header--accentuated {
    color: var(--cal-header-accentuated-color);
    background-color: var(--cal-header-accentuated-background-color);
  }

  .cal-title:not(.cal-title--disabled),
  .cal-prev:not(.cal-prev--disabled),
  .cal-next:not(.cal-next--disabled) {
    cursor: pointer;
  }

  .cal-header:not(.cal-header--accentuated)
    > :where(
      .cal-title:not(.cal-title--disabled),
      .cal-prev:not(.cal-prev--disabled),
      .cal-next:not(.cal-next--disabled)
    ):hover {
    color: var(--cal-header-hover-color);
    background-color: var(--cal-header-hover-background-color);
  }
  
  .cal-header:not(.cal-header--accentuated)
    > :where(
      .cal-title:not(.cal-title--disabled),
      .cal-prev:not(.cal-prev--disabled),
      .cal-next:not(.cal-next--disabled)
    ):active {
    color: var(--cal-header-active-color);
    background-color: var(--cal-header-active-background-color);
  }


  .cal-header--accentuated
    > :where(
      .cal-title:not(.cal-title--disabled),
      .cal-prev:not(.cal-prev--disabled),
      .cal-next:not(.cal-next--disabled)
    ):hover {
    color: var(--cal-header-accentuated-hover-color);
    background-color: var(--cal-header-accentuated-hover-background-color);
  }

  .cal-header--accentuated
    > :where(
      .cal-title:not(.cal-title--disabled),
      .cal-prev:not(.cal-prev--disabled),
      .cal-next:not(.cal-next--disabled)
    ):active {
    color: var(--cal-header-accentuated-active-color);
    background-color: var(--cal-header-accentuated-active-background-color);
  }

  .cal-title {
    text-align: center;
    text-transform: capitalize;
  }

  .cal-title,
  .cal-prev,
  .cal-next {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0.25em 0.5em;
  }

  .cal-prev--disabled,
  .cal-next--disabled {
    visibility: hidden;
  }

  .cal-sheet {
    display: grid;
    grid-template-rows: auto;
    align-items: stretch;
    flex-grow: 1;
  }

  .cal-column-name {
    text-align: center;
    padding: 0.5em;
    font-size: 90%;
    text-transform: capitalize;
  }

  .cal-column-name--highlighted {
    background-color: var(--cal-cell-highlighted-background-color);
  }

  .cal-row-name {
    align-self: center;
    text-align: center;
    min-width: 3em;
    font-size: 75%;
    padding: 0.125em;
  }

  .cal-cell--highlighted {
    background-color: var(--cal-cell-highlighted-background-color);
  }

  .cal-cell {
    display: flex;
    flex-grow: 1;
    justify-content: center;
    align-items: center;
    justify-items: stretch;
    padding: 0.125em 0.75em;
    text-transform: capitalize;
    hyphens: auto;
  }

  .cal-cell:not(.cal-cell--disabled):not(.cal-cell--selected):hover {
    color: var(--cal-cell-hover-color);
    background-color: var(--cal-cell-hover-background-color);
  }

  .cal-cell:not(.cal-cell--disabled) {
    cursor: pointer;
  }

  .cal-cell--selected:not(.cal-cell--disabled) {
    color: var(--cal-cell-selected-color);
    background-color: var(--cal-cell-selected-background-color);
  }

  .cal-cell--selected:not(.cal-cell--disabled):hover {
    background-color: var(--cal-cell-selected-hover-background-color);
  }

  .cal-cell--disabled {
    cursor: not-allowed;
    color: var(--cal-cell-disabled-color);
  }

  .cal-cell--disabled.cal-cell--adjacent > .cal-cell-text {
    opacity: 10%;
  }

  .cal-cell--adjacent:not(.cal-cell--disabled):not(.cal-cell--selected) {
    color: var(--cal-cell-adjacent-color);
  }

  .cal-cell--adjacent.cal-cell--selected {
    color: var(--cal-cell-adjacent-selected-color);
  }

  .cal-cell--adjacent.cal-cell--disabled {
    color: var(--cal-cell-adjacent-disable-color);
  }

  .cal-cell--current {
    font-weight: 600;
  }
  
  .cal-cell--current:not(.cal-cell--selected):not(.cal-cell--disabled) {
    color: var(--cal-cell-current-highlighted-color, inherit);
  }

  .cal-cell--in-selection-range:not(.cal-cell--selected) {
    background-color: var(--cal-cell-selection-range-background-color);
  }

  .cal-cell--first-in-selection-range:not(.cal-cell--last-in-selection-range) {
    border-top-left-radius: 6px;
    border-bottom-left-radius: 6px;
  }
  
  .cal-cell--first-in-selection-range ~ .cal-cell--first-in-selection-range {
    border-top-left-radius: 0; 
    border-bottom-left-radius: 0;
  }
  
  .cal-cell--last-in-selection-range:not(.cal-cell--first-in-selection-range) {
    border-top-right-radius: 6px;
    border-bottom-right-radius: 6px;
  }


  .cal-cell--before-singleton-selection-range:has(~ .cal-cell):hover ~ .cal-cell--before-singleton-selection-range {
    background-color: var(--cal-cell-selection-range-background-color) !important;
  }
  
  .cal-cell--after-singleton-selection-range:has(~ .cal-cell--after-singleton-selection-range:hover) { 
    background-color: var(--cal-cell-selection-range-background-color) !important;
  }
  

  /* time links */

  .cal-time-links {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    padding: 0 3em;
    min-height: 2em;
    box-sizing: border-box;
    margin: 0.5em;
    gap: 0 2em;
    white-space: nowrap;
  }

  .cal-time-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    cursor: pointer;
    text-align: center;
    justify-self: center;
    padding: 0.25em 0.75em;
    border-radius: 1em;
  }

  .cal-time-link:hover {
    background-color: var(--cal-button-background-color);
  }

  .cal-time-link--disabled {
    pointer-events: none;
  }

  /* time view */

  .cal-view--time1,
  .cal-view--time2 {
    display: flex;
    flex-direction: column;
    gap: 1.5em;
    padding: 0.5em 1em;
  }

  /* time */

  .cal-time {
    margin: 0.5rem 0 0 0;
  }

  .cal-time-header {
    font-size: calc(100% - 1px);
    margin-bottom: 0.25em;
    font-weight: 200;
  }

  .cal-time-value {
    font-size: 150%;
  }

  /* time tabs */

  .cal-time-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .cal-time-tabs > .cal-time {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    white-space: nowrap;
  }

  .cal-time-tabs > .cal-time:only-child {
    text-align: center;
    grid-column: span 2;
  }

  .cal-time-tabs--active-tab-time1 > .cal-time:first-child,
  .cal-time-tabs--active-tab-time2 > .cal-time:nth-child(2) {
    pointer-events: none;
  }

  .cal-time-tabs--active-tab-time1 > .cal-time:nth-child(2):hover,
  .cal-time-tabs--active-tab-time2 > .cal-time:first-child:hover {
    cursor: pointer;
    background-color: var(--cal-button-background-color);
    border-color: var(--cal-button-background-color);
  }

  .cal-time-tabs--active-tab-time1 > .cal-time:nth-child(2) {
    font-size: 75%;
    border-width: 0 0 1px 1px;
    border: 0 solid var(--cal-border-color);
    border-width: 0 0 1px 1px;
    white-space: nowrap;
    padding: 1em 2em;
  }

  .cal-time-tabs > .cal-time:nth-child(2) {
    padding-left: 1em;
  }

  .cal-time-tabs--active-tab-time1 > .cal-time:first-child:not(:only-child) {
    padding-left: 0.5em;
  }

  .cal-time-tabs--active-tab-time2 > .cal-time:first-child {
    font-size: 75%;
    border: 0 solid var(--cal-border-color);
    border-width: 0 1px 1px 0;
    white-space: nowrap;
    padding: 1em 2em;
  }

  /* back to month link */

  .cal-back-to-month-link {
    display: block;
    padding: 0.5em 2em;
    text-align: center;
    background-color: var(--cal-button-background-color);
    border-radius: var(--cal-button-border-radius, 3px);
    cursor: pointer;
  }

  .cal-back-to-month-link:hover {
    background-color: var(--cal-button-hover-background-color);
  }

  .cal-back-to-month-link:active {
    background-color: var(--cal-button-active-background-color);
  }

  /* time selector — hour/minute option columns, see #renderTimeSelector */

  .cal-time-selector {
    display: flex;
    /* center, so the separator and the AM/PM control line up with the
       *selected* option rather than with the top of the columns — the
       selection always sits at each column's vertical middle
       (#scrollSelectedTimeIntoView keeps it there), and these two read as part
       of the current value. --cal-time-label-offset undoes the height the
       column captions add above the columns, which would otherwise push the
       shared centre line up by half a caption. */
    align-items: flex-start;
    justify-content: center;
    gap: 0.4em;
    padding-top: 0.25em;

    /* The colon and the AM/PM control line up with the *selected* option, not
       with the top of the columns — the selection always sits at each column's
       vertical middle (#scrollSelectedTimeIntoView keeps it there) and both
       read as part of the current value. That alignment is structural: every
       child of this row is a .cal-time-column-group with an equal-height
       caption on top (empty for those two, see #renderTimeAside) and a
       column-height box below it, so there is no offset to compute. */
    --cal-time-column-height: 9.5em;
    --cal-time-caption-height: 1.25em;
    --cal-time-caption-gap: 0.3em;
  }

  .cal-time-column-group {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--cal-time-caption-gap);
  }

  .cal-time-column-label {
    height: var(--cal-time-caption-height);
    /* line-height pinned to the same value so the caption box is exactly the
       declared height regardless of the font's own metrics — the offset below
       is derived from it. */
    line-height: var(--cal-time-caption-height);
    text-align: center;
    font-size: 0.8em;
    opacity: 0.65;
  }

  .cal-time-column {
    /* position: relative so the options' offsetTop is measured against this
       box — that is what #scrollSelectedTimeIntoView does its centring maths
       with. */
    position: relative;
    height: var(--cal-time-column-height);
    overflow-y: auto;
    /* Fades the clipped options at both ends rather than cutting them dead,
       so it reads as a list that continues past the frame. */
    mask-image: linear-gradient(
      to bottom,
      transparent 0,
      black 1.6em,
      black calc(100% - 1.6em),
      transparent 100%
    );
    scrollbar-width: none;
    /* Half the column's height above and below the options, so the first and
       last entry can still reach the vertical centre. */
    padding: 4em 0;
    box-sizing: border-box;
  }

  .cal-time-column::-webkit-scrollbar {
    display: none;
  }

  .cal-time-option {
    display: block;
    padding: 0.25em 0.7em;
    border-radius: var(--cal-button-border-radius);
    text-align: center;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    user-select: none;
    transition:
      background-color 100ms ease,
      color 100ms ease;
  }

  .cal-time-option:hover {
    background-color: var(--cal-cell-hover-background-color);
    color: var(--cal-cell-hover-color);
  }

  .cal-time-option--selected,
  .cal-time-option--selected:hover {
    background-color: var(--cal-cell-selected-background-color);
    color: var(--cal-cell-selected-color);
    font-weight: 600;
  }

  /* The same height as a column, so centring within it lands on the column's
     own centre — which is where the selected option is kept. */
  .cal-time-separator,
  .cal-time-meridiem {
    height: var(--cal-time-column-height);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .cal-time-separator {
    opacity: 0.5;
  }

  .cal-time-meridiem {
    gap: 0.25em;
    margin-inline-start: 0.5em;
  }

  .cal-time-meridiem-option {
    padding: 0.25em 0.6em;
    border: 1px solid var(--cal-border-color);
    border-radius: var(--cal-button-border-radius);
    text-align: center;
    font-size: 0.85em;
    cursor: pointer;
    user-select: none;
    transition:
      background-color 100ms ease,
      color 100ms ease,
      border-color 100ms ease;
  }

  .cal-time-meridiem-option:hover {
    background-color: var(--cal-cell-hover-background-color);
    color: var(--cal-cell-hover-color);
  }

  .cal-time-meridiem-option--selected,
  .cal-time-meridiem-option--selected:hover {
    background-color: var(--cal-cell-selected-background-color);
    border-color: var(--cal-cell-selected-background-color);
    color: var(--cal-cell-selected-color);
    font-weight: 600;
  }
`;
