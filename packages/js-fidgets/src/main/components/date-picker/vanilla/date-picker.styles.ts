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

  /* time sliders */

  .cal-time-sliders {
    display: grid;
    grid-template-columns: min-content auto;
    gap: 0.5em 1em;
  }

  /* time slider */

  .cal-time-slider {
    -webkit-appearance: none;
    appearance: none;
    outline: none;
    height: 0.75px;
    width: 100%;
    margin: 1em 0;

    background-image: linear-gradient(
      var(--cal-slider-track-color),
      var(--cal-slider-track-color)
    );

    background-position: 0 50%;
    background-size: 100% 1px;
    background-repeat: no-repeat;
    box-sizing: border-box;
    cursor: pointer;
    background-color: var(--cal-background-color);
  }

  .cal-time-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    height: 1.25em;
    width: 1.25em;
    border-radius: var(--cal-slider-thumb-border-radius);
    background-color: var(--cal-slider-thumb-background-color);
    border: var(--cal-slider-thumb-border-width) solid
      var(--cal-slider-thumb-border-color);
  }

  .cal-time-slider::-moz-range-thumb {
    -webkit-appearance: none;
    appearance: none;
    height: 1.25em;
    width: 1.25em;
    border-radius: var(--cal-slider-thumb-border-radius);
    background-color: var(--cal-slider-thumb-background-color);
    border: var(--cal-slider-thumb-border-width) solid
      var(--cal-slider-thumb-border-color);
  }

  .cal-time-slider::-webkit-slider-thumb:hover {
    background-color: var(--cal-slider-thumb-hover-background-color);
    border-color: var(--cal-slider-thumb-hover-border-color);
  }

  .cal-time-slider::-moz-range-thumb:hover {
    background-color: var(--cal-slider-thumb-hover-background-color);
    border-color: var(--cal-slider-thumb-hover-border-color);
  }

  .cal-time-slider:focus::-webkit-slider-thumb {
    background-color: var(--cal-slider-thumb-focus-background-color);
    border-color: var(--cal-slider-thumb-focus-border-color);
  }

  .cal-time-slider:focus::-moz-range-thumb {
    background-color: var(--cal-slider-thumb-focus-background-color);
    border-color: var(--cal-slider-thumb-focus-border-color);
  }

  .cal-time-slider::-webkit-slider-runnable-track,
  .cal-time-slider::-moz-range-track {
    -webkit-appearance: none;
    box-shadow: none;
    border: none;
    background-color: transparent;
  }
`;
