import { css } from "lit";

import { defaultTheme } from "../../themes/theme.js";

export const tabStyles = [
  defaultTheme,
  css`
    /* The host itself is the tab — role="tab"/tabindex/aria-selected are set
       directly on it (see tab.ts), so it's the actual interactive/focusable
       node rather than something inside a shadow-DOM wrapper. That keeps
       aria-controls/aria-labelledby (set by the owning ui-tabs, pairing
       this with its ui-tab-panel) plain same-light-tree id references,
       rather than needing to cross a shadow boundary. */
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--ui-spacing-sm);
      font-weight: var(--ui-font-weight-normal);
      font-family: var(--ui-font-sans);
      font-size: inherit;
      color: var(--ui-color-neutral-600);
      padding-block: var(--ui-spacing-sm);
      padding-inline: var(--ui-spacing-md);
      /* Reserved transparent (not omitted) so becoming [selected] is a pure
         color change, never a layout shift from the border's own space. */
      border-bottom: var(--ui-border-thick) solid transparent;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      transition:
        color 120ms ease,
        background-color 120ms ease,
        border-color 120ms ease;
    }

    :host([orientation="vertical"]) {
      border-bottom: none;
      /* inline-end, not -start: matches the tablist's own border-inline-end
         (tabs.styles.ts) that separates it from the panel content — the
         accent sits on the same side as that divider, same as the
         horizontal case where both the tablist's and the tab's own accent
         border are border-bottom. */
      border-inline-end: var(--ui-border-thick) solid transparent;
    }

    /* tab-align only affects vertical tabs — see ui-tabs's own "tabAlign"
       doc comment for why it's a no-op in horizontal (no shared width to
       shift a label within). */
    :host([orientation="vertical"][tab-align="start"]) {
      justify-content: flex-start;
    }

    :host([orientation="vertical"][tab-align="end"]) {
      justify-content: flex-end;
    }

    :host(:hover:not([disabled])) {
      color: var(--ui-text);
      background: var(--ui-color-neutral-100);
    }

    :host([selected]) {
      color: var(--ui-color-primary-600);
      border-bottom-color: var(--ui-color-primary-500);
      /* Faux-semibold via stacked zero-offset text-shadow rather than an
         actual font-weight bump: real bold glyphs are wider than regular
         ones, so a font-weight increase here would resize the tab (and, in
         vertical mode, every tab sharing the tablist's stretched width —
         see tabs.styles.ts) and shift surrounding content the moment a tab
         is selected. A blurred shadow thickens the glyph strokes without
         touching layout metrics, so it's safe to gate on [selected]. */
      text-shadow:
        0 0 0.5px currentColor,
        0 0 0.5px currentColor;
    }

    :host([orientation="vertical"][selected]) {
      border-inline-end-color: var(--ui-color-primary-500);
      background: var(--ui-color-neutral-100);
    }

    :host([disabled]) {
      color: var(--ui-color-neutral-400);
      cursor: not-allowed;
    }

    :host(:focus-visible) {
      outline: var(--ui-focus-ring-width) solid var(--ui-color-primary-500);
      outline-offset: calc(-1 * var(--ui-focus-ring-offset));
    }
  `,
];
