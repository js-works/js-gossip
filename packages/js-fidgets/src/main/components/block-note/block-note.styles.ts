import { css } from "lit";

import { defaultTheme } from "../../themes/theme.js";
import { fieldLabelStyles } from "../../shared/field-label/field-label.js";

export const blockNoteStyles = [
  defaultTheme,
  fieldLabelStyles,
  css`
    :host {
      font-weight: var(--ui-font-weight-normal);
      font-family: var(--ui-font-sans);
      display: block;
    }

    :host([disabled]) {
      cursor: not-allowed;
    }

    .wrapper {
      box-sizing: border-box;
      border: var(--ui-border-thin) solid var(--ui-field-border-color);
      border-radius: var(--ui-field-radius);
      background: var(--ui-bg);
      padding: var(--ui-spacing-md);
    }

    .wrapper:focus-within {
      outline: var(--ui-focus-ring-width) solid var(--ui-color-primary-500);
      outline-offset: var(--ui-focus-ring-offset);
    }

    :host([invalid]) .wrapper {
      border-color: var(--ui-color-danger-500);
    }

    :host([disabled]) .wrapper {
      opacity: 0.55;
    }

    /* The projected holder (see block-note.ts) — BlockNote/Mantine's own
       stylesheets style whatever they render assuming a normal light-DOM
       document, so (like ui-editor's own .editor-holder) this stays a plain
       slotted child rather than something rendered inside this shadow root. */
    ::slotted(.block-note-holder) {
      display: block;
      width: 100%;
    }
  `,
];
