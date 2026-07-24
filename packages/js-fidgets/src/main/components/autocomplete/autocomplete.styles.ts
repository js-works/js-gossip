import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";
import { pillsStyles } from "../../shared/pills/pills.js";
import { fieldLabelStyles } from "../../shared/field-label/field-label.js";

// shared/popup-layout/popup-layout.ts's trackPopupLayout (used by
// autocomplete-core.ts) sets the popup's positioning (position/inset/
// max-height/etc.) directly as inline styles on the element itself — nothing
// to compose in here; this file only owns the popup's visual theming (see
// the .popup rule below).
export const autocompleteStyles = [
  defaultTheme,
  pillsStyles,
  fieldLabelStyles,
  css`
    :host {
      font-weight: var(--ui-font-weight-normal);
      /* inline-flex, not inline-block — still an inline-level box, but a flex
         container too, so the optional .field-label stacks above .wrapper
         (flex-direction: column) instead of sitting beside it. With no
         label, a single flex-column child behaves identically to before. */
      display: inline-flex;
      flex-direction: column;

      /* size="medium" (the default). Padding-block values across all three
         sizes (also small/large below, and ui-select/ui-combobox's own
         copies, kept in sync by hand) are picked to land this control's
         overall height on ui-text-field/ui-number-field/etc.'s own natural
         height at the same size — not a round token, since matching an
         unrelated component's height is the actual goal here, not the
         spacing scale. */
      font-size: var(--ui-font-size-md);
      /* Was 0px (same as small below) at one point — collapsed medium and
         small to the same overall height, which read as broken rather than
         "compact". 2px keeps a real, visible step between the three sizes. */
      --autocomplete-padding-block: 2px;
      /* Was a flat var(--ui-spacing-md) (16px) on the <input> directly,
         regardless of size — same ui-select's own padding-inline had before
         it got a small→large progression; matched to that same progression
         here instead. */
      --autocomplete-padding-inline: 8px;
    }

    :host([size="small"]) {
      font-size: var(--ui-font-size-sm);
      --autocomplete-padding-block: 0px;
      --autocomplete-padding-inline: 4px;
    }

    :host([size="large"]) {
      font-size: var(--ui-font-size-lg);
      --autocomplete-padding-block: 5px;
      --autocomplete-padding-inline: 12px;
    }

    /* Two columns: .content (pills/input, flex-grow, wraps its own lines
       independently) and .chevron (fixed, pinned to the end) — kept as
       separate flex items of a non-wrapping row so the chevron always stays
       put as its own column, vertically centered, instead of flowing into
       .content's own wrap (which would otherwise drag it down onto a
       trailing line alongside whichever pill last wrapped). */
    .wrapper {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
      padding-block: var(--autocomplete-padding-block);
      box-sizing: border-box;
      border: 1px solid var(--ui-field-border-color);
      border-radius: var(--ui-radius-sm);
      background: var(--ui-bg);
      color: var(--ui-text);
    }

    .content {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ui-spacing-sm);
      flex: 1;
      min-width: 0;
      /* Without this, .wrapper's height comes from whichever is taller: the
         plain input, or (once multiple mode has picks) a row of pills — so
         adding the first pill visibly grows the box. Floored to a pill's own
         height instead (shared/pills/pills.ts's .pill: 1px padding-block × 2
         + 1px border × 2, and .pill-remove's 1.4em/line-height:1 as the
         tallest child — same formula as ui-select's own .content, kept in
         sync by hand) so the empty and "has pills" states render the same
         height. */
      min-height: calc(1.4 * var(--ui-font-size-sm) + 4px);
      /* Breathing room around the pills themselves — .wrapper's own
         padding-block (above) is intentionally near-zero to keep the plain
         (no pills) state compact, so this is the pills' own vertical margin
         from the border, not the whole control's. */
      padding-block: 2px;
    }

    .wrapper:has(.pill) {
      padding-inline-start: var(--ui-spacing-sm);
    }

    :host([invalid]) .wrapper {
      border-color: var(--ui-color-danger-500);
    }

    input {
      flex: 1;
      min-width: 0;
      box-sizing: border-box;
      padding-block: 0;
      padding-inline: var(--autocomplete-padding-inline);
      font-family: var(--ui-font-sans);
      font-size: inherit;
      border: none;
      background: transparent;
      color: inherit;
    }

    input::placeholder {
      color: var(--ui-color-neutral-400);
      font-weight: 400;
      font-size: inherit;
    }

    input:focus {
      outline: none;
    }

    .spinner {
      flex: none;
      width: 1em;
      height: 1em;
      box-sizing: border-box;
      border: 2px solid color-mix(in srgb, currentColor 20%, transparent);
      border-top: 2px solid var(--ui-color-neutral-500);
      border-radius: 50%;
      animation: autocomplete-spin 0.75s linear infinite;
    }

    /* Same toggle-affordance chevron (and open-state rotation) as ui-select's
       trigger. */
    .chevron {
      flex: none;
      display: flex;
      align-items: center;
      margin-inline-end: var(--ui-spacing-md);
      color: var(--ui-text);
      cursor: pointer;
      transition: transform 250ms ease;
    }

    .chevron-open {
      transform: rotate(180deg);
    }

    @keyframes autocomplete-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    /* The floating popup card — holds the header, the scrollable listbox, the
       loading/no-matches status message, and the footer, in whatever
       combination applies. Header/footer/status live outside .listbox on
       purpose so they never scroll with the rows.

       Positioning mechanics (position/inset/z-index/max-height/the
       flex-column+overflow that lets max-height clip cleanly/top vs bottom
       for placement) are all set as inline styles directly on this element
       by shared/popup-layout/popup-layout.ts's trackPopupLayout (see this
       file's top-of-file comment and that module's header comment for why:
       an earlier pure-CSS anchor-positioning attempt could flip once there
       was literally no room left, but position-try-order: most-height
       (needed to prefer whichever side has more room, not just whichever
       still technically fits) proved unreliable in real-world testing) —
       this rule only adds the visual theming. */
    .popup {
      background: var(--ui-bg);
      color: var(--ui-text);
      border: 1px solid var(--ui-color-neutral-300);
      border-radius: var(--ui-radius-sm);
      box-shadow:
        0 10px 25px -5px rgba(0, 0, 0, 0.2),
        0 4px 8px -4px rgba(0, 0, 0, 0.15);
    }

    .listbox {
      flex: 1;
      min-height: 0;
      margin: 0;
      padding-block: var(--ui-spacing-sm);
      padding-inline: var(--ui-spacing-sm);
      list-style: none;
      overflow-y: auto;
      box-sizing: border-box;
    }

    .listbox[hidden] {
      display: none;
    }

    li[role="option"] {
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
      box-sizing: border-box;
      padding-block: 3px;
      padding-inline: var(--ui-spacing-sm);
      /* Transparent by default (rather than only added on .active) so the border
         doesn't change the row's size and shift layout when it becomes active. */
      border: 2px solid transparent;
      border-radius: var(--ui-radius-sm);
      cursor: pointer;
    }

    li[role="option"][aria-selected="true"] {
      font-weight: 600;
    }

    li[role="option"]:hover {
      background: var(--ui-color-neutral-100);
    }

    li[role="option"].active {
      border-color: var(--ui-color-primary-500);
      background: var(--ui-color-primary-500);
      color: white;
    }

    li[role="option"].active .check {
      color: inherit;
    }

    /* Fixed-width slot, always reserved (even when empty) so option labels line up
       whether or not that row is the selected one. */
    .check {
      flex: none;
      width: 1em;
      display: flex;
      color: var(--ui-color-primary-500);
    }

    .separator {
      padding: var(--ui-spacing-sm) var(--ui-spacing-sm) 0;
      font-size: var(--ui-font-size-sm);
      opacity: 0.6;
    }

    .header,
    .footer {
      padding-block: var(--ui-spacing-sm);
      padding-inline: var(--ui-spacing-md);
      font-size: var(--ui-font-size-sm);
      opacity: 0.7;
    }

    .header {
      border-bottom: 1px solid var(--ui-color-neutral-200);
    }

    .footer {
      border-top: 1px solid var(--ui-color-neutral-200);
    }

    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-block: var(--ui-spacing-sm);
      padding-inline: var(--ui-spacing-md);
      font-size: 1em;
    }
  `,
];
