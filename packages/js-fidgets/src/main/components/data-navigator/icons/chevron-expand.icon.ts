import { html } from "lit";

// Bootstrap Icons (chevron-expand) — stacked up/down chevrons, used as the "this
// column is sortable but not currently sorted" indicator (see data-navigator.ts).
export const chevronExpandIcon = html`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path fill-rule="evenodd" d="M3.646 9.646a.5.5 0 0 1 .708 0L8 13.293l3.646-3.647a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 0-.708m0-3.292a.5.5 0 0 0 .708 0L8 2.707l3.646 3.647a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 0 0 0 .708z"/>
  </svg>
`;
