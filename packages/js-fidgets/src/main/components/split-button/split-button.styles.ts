import { css } from "lit";

import { buttonStyles } from "../button/button.styles.js";
import { menuPopupStyles } from "../../shared/menu/menu-popup.styles.js";

export const splitButtonStyles = [
  ...buttonStyles,
  ...menuPopupStyles,
  css`
    /* Same containing-block trap/fix as ui-menu-button's own .wrapper (see
       menu-button.styles.ts) — plus the two segments sitting side by side,
       which :host's own display: inline-flex (from buttonStyles) doesn't
       give a dedicated element to anchor the popup against. */
    .wrapper {
      position: relative;
      display: inline-flex;
    }

    /* Sharing one seam: only the two adjoining corners are squared off, so
       the pair still reads as a single pill-shaped control from the
       outside. */
    .segment-primary {
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }

    .segment-chevron {
      border-start-start-radius: 0;
      border-end-start-radius: 0;
      padding-inline: 0.6em;
      /* currentColor, not a fixed token — .button's own color already
         resolves to whichever the active variant/appearance needs (white
         for solid, --btn-600 for outlined/subtle/link, --btn-700 for
         filled), so this divider reads correctly against all of them
         without a per-variant override. */
      border-inline-start: 1px solid color-mix(in srgb, currentColor 30%, transparent);
    }
  `,
];
