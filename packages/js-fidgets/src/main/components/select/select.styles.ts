import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";
import { pillsStyles } from "../../shared/pills/pills.js";

export const selectStyles = [
  defaultTheme,
  pillsStyles,
  css`
    :host {
      display: inline-block;
      vertical-align: middle;
      font-family: var(--ui-font-sans);

      /* size="medium" (the default) */
      font-size: var(--ui-font-size-md);
      --select-padding-block: var(--ui-spacing-sm);
      --select-padding-inline: var(--ui-spacing-md);
      /* Overridable by a consumer that needs a narrower trigger (e.g.
         data-navigator's page-size picker). */
      --select-min-width: 12em;
    }

    :host([size="small"]) {
      font-size: var(--ui-font-size-sm);
      --select-padding-block: 2px;
      --select-padding-inline: var(--ui-spacing-sm);
    }

    :host([size="large"]) {
      font-size: var(--ui-font-size-lg);
      --select-padding-block: var(--ui-spacing-md);
      --select-padding-inline: var(--ui-spacing-md);
    }

    :host([disabled]) {
      cursor: not-allowed;
    }

    /* Establishes the containing block for #popup's position: absolute,
       sized to the trigger's own content — not :host itself, which a
       consumer's layout can stretch taller than the trigger (e.g. a flex
       row's default align-items: stretch, sizing every item to the tallest
       sibling). Positioning #popup against a stretched :host would still be
       technically "position: relative done right", but "100%" would then
       resolve against that inflated height rather than the trigger's real
       one, leaving a visible gap between the trigger and the popup. */
    .wrapper {
      position: relative;
      display: inline-block;
    }

    /* :host used to be a <button>; it's a plain <div role="combobox"> now
       (see select.ts's render()) — a native <button> can't contain another
       interactive <button>, which multiple mode's removable pills need.

       Two columns: .content (pills/value, flex-grow, wraps its own lines
       independently) and .chevron (fixed, pinned to the end) — kept as
       separate flex items of a non-wrapping row so the chevron always stays
       put as its own column, vertically centered, instead of flowing into
       .content's own wrap (which would otherwise drag it down onto a
       trailing line alongside whichever pill last wrapped). */
    .trigger {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
      min-width: var(--select-min-width);
      padding-block: var(--select-padding-block);
      padding-inline-start: var(--select-padding-inline);
      border: 1px solid var(--ui-color-neutral-600);
      border-radius: var(--ui-radius-sm);
      background: var(--ui-bg);
      color: var(--ui-text);
      font: inherit;
      cursor: pointer;
    }

    .content {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ui-spacing-sm);
      flex: 1;
      min-width: 0;
    }

    .trigger:has(.pill) {
      padding-inline-start: var(--ui-spacing-sm);
    }

    .trigger:focus-visible {
      outline: var(--ui-focus-ring-width) solid var(--ui-color-primary-500);
      outline-offset: var(--ui-focus-ring-offset);
    }

    :host([disabled]) .trigger {
      opacity: 0.55;
      cursor: not-allowed;
    }

    :host([invalid]) .trigger {
      border-color: var(--ui-color-danger-500);
    }

    .value {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: start;
    }

    .value.placeholder {
      opacity: 0.6;
    }

    /* Its own padding (rather than .trigger's own padding-inline, which only
       covers the start side now — see .trigger above) so this whole
       stretched box, not just the icon's own tight bounding box, forms a
       comfortably sized visual area — stretch fills the trigger's full
       height, and align-items/justify-content then center the icon inside
       that taller box. Deliberately symmetric on both sides (not matched to
       --select-padding-inline, which differs from this) — an asymmetric
       padding here would put the icon visibly off-center within its own
       box, not just relative to .trigger as a whole. .chevron-icon below is
       a second, tight wrapper sized to exactly the icon and nothing else,
       so rotating it always spins around the icon's own true center
       regardless of whatever padding/stretch this outer box ends up with. */
    .chevron {
      flex: none;
      align-self: stretch;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-inline: 0.5em;
      opacity: 0.6;
    }

    .chevron-icon {
      display: flex;
      transition: transform 120ms ease;
    }

    .chevron-open {
      transform: rotate(180deg);
    }

    /* Positioning (position/inset/z-index/max-height/display/flex-direction/
       overflow/top or bottom) is set directly as inline styles on this
       element by shared/popup-layout/popup-layout.ts's trackPopupLayout (see
       select.ts's firstUpdated()) — this rule only adds the visual theming. */
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
  `,
];
