import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";
import { pillsStyles } from "../../shared/pills/pills.js";
import { fieldLabelStyles } from "../../shared/field-label/field-label.js";

export const comboboxStyles = [
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
      position: relative;

      /* size="medium" (the default). Padding-block values across all three
         sizes (also small/large below, and ui-select/ui-autocomplete's own
         copies, kept in sync by hand) are picked to land this control's
         overall height on ui-text-field/ui-number-field/etc.'s own natural
         height at the same size — not a round token, since matching an
         unrelated component's height is the actual goal here, not the
         spacing scale. */
      font-size: var(--ui-font-size-md);
      /* Was 0px (same as small below) at one point — collapsed medium and
         small to the same overall height, which read as broken rather than
         "compact". 2px keeps a real, visible step between the three sizes. */
      --combobox-padding-block: 2px;
      /* Was a flat var(--ui-spacing-md) (16px) on the <input> directly,
         regardless of size — same ui-select's own padding-inline had before
         it got a small→large progression; matched to that same progression
         here instead. */
      --combobox-padding-inline: 8px;
      /* Overridable by a consumer that needs a narrower field. */
      --combobox-min-width: 12em;
    }

    :host([size="small"]) {
      font-size: var(--ui-font-size-sm);
      --combobox-padding-block: 0px;
      --combobox-padding-inline: 4px;
    }

    :host([size="large"]) {
      font-size: var(--ui-font-size-lg);
      --combobox-padding-block: 5px;
      --combobox-padding-inline: 12px;
    }

    :host([disabled]) {
      cursor: not-allowed;
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
      min-width: var(--combobox-min-width);
      padding-block: var(--combobox-padding-block);
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
         height instead (pills.ts's .pill: 1px padding-block × 2 + 1px border
         × 2, and .pill-remove's 1.4em/line-height:1 as the tallest child —
         same formula as ui-select's own .content, kept in sync by hand) so
         the empty and "has pills" states render the same height. */
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

    :host([disabled]) .wrapper {
      opacity: 0.55;
      cursor: not-allowed;
    }

    :host([invalid]) .wrapper {
      border-color: var(--ui-color-danger-500);
    }

    input {
      flex: 1;
      min-width: 0;
      box-sizing: border-box;
      padding-block: 0;
      padding-inline: var(--combobox-padding-inline);
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

    input:disabled {
      cursor: not-allowed;
    }

    /* Padding is deliberately symmetric — asymmetric padding here would put
       the icon visibly off-center within its own box, not just relative to
       .wrapper as a whole. .chevron-icon is a second, tight inner wrapper
       (sized to exactly the icon) carrying the open/close rotation, so it
       always spins around the icon's own true center regardless of
       whatever padding/stretch this outer box has. */
    .chevron {
      flex: none;
      align-self: stretch;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-inline: 0.5em;
      color: var(--ui-text);
      cursor: pointer;
    }

    .chevron-icon {
      display: flex;
      transition: transform 250ms ease;
    }

    .chevron-icon.chevron-open {
      transform: rotate(180deg);
    }

    /* The floating popup card — holds either the real listbox or the
       no-matches status message. Positioning (position/inset/z-index/
       max-height/display/flex-direction/overflow/top or bottom) is set
       directly as inline styles on this element by
       shared/popup-layout/popup-layout.ts's trackPopupLayout (see
       combobox.ts's firstUpdated()) — this rule only adds the visual
       theming. */
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
      overflow-y: auto;
      box-sizing: border-box;
    }

    .status {
      padding-block: var(--ui-spacing-sm);
      padding-inline: var(--ui-spacing-md);
      font-size: 1em;
    }
  `,
];
