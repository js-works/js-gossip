import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";

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
      border-bottom: 2px solid transparent;
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
      border-inline-end: 2px solid transparent;
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
      font-weight: var(--ui-font-weight-semibold);
    }

    :host([orientation="vertical"][selected]) {
      border-inline-end-color: var(--ui-color-primary-500);
      background: var(--ui-color-neutral-100);
      /* Cancels the :host([selected]) font-weight bump above — vertical
         tabs share one stretched width across the whole tablist (see
         tabs.styles.ts), so a selected tab getting wider text would grow
         every tab's shared width along with it. The accent border and
         background already carry the selected state here without it. */
      font-weight: var(--ui-font-weight-normal);
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
