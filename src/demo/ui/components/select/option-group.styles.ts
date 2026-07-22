import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";

export const optionGroupStyles = [
  defaultTheme,
  css`
    :host {
      display: block;
      font-family: var(--ui-font-sans);
    }

    .group-label {
      padding: var(--ui-spacing-sm) var(--ui-spacing-sm) 0;
      font-size: var(--ui-font-size-sm);
      font-weight: 600;
      opacity: 0.6;
    }
  `,
];
