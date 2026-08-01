import { html } from "lit";

// A plain calendar glyph, in the same single-path/currentColor style as the other
// field icons in this demo (see email-field/icons/email.icon.ts).
// overflow="visible": this glyph draws to the very edge of its 16×16 viewBox (the
// ring touches y=0 and x=0/16), and the default UA style clips a root <svg> to its
// viewBox at small rendered sizes — baked into the markup rather than left to CSS,
// same reasoning as js-gossip's own internal icons (see internal/icons.ts).
export const calendarIcon = html`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" overflow="visible">
    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M2 2a1 1 0 0 0-1 1v1h14V3a1 1 0 0 0-1-1zm13 3H1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z"/>
  </svg>
`;
