import { css } from "lit";

import { defaultTheme } from "../../themes/theme.js";

export const editorStyles = [
  defaultTheme,
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

      /* editor.js's own stylesheet (injected into the *document* head, not
         this shadow root — see editor.ts's class doc on why the editor
         itself lives in light DOM) reads these as CSS custom properties on
         its own elements; custom-property inheritance follows the flat
         tree, so setting them here reaches the slotted holder below despite
         the shadow boundary. Only a light touch: editor.js's own popovers/
         inline toolbar (.ce-popover, .ce-inline-toolbar) re-declare several
         of these locally with hard-coded values, shadowing this override —
         reaching those too would mean targeting editor.js's own class names
         with page-global CSS, disproportionate for what's otherwise a
         one-property accent tweak. */
      --color-active-icon: var(--ui-color-primary-500);
      --color-text-icon-active: var(--ui-color-primary-500);
      --grayText: var(--ui-color-neutral-500);
      --bg-light: var(--ui-color-neutral-50);
      --color-gray-border: var(--ui-color-neutral-200);
      /* editor.js's own foreground token, mapped so its toolbar/settings
         glyphs invert along with everything else in dark mode instead of
         staying at its hard-coded near-black. Everything editor.js renders
         as plain block text already inherits \`color\` normally (the holder is
         slotted into .wrapper, and inheritance follows the flat tree), so
         that half needed nothing. */
      --color-dark: var(--ui-text);
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

    /* The projected holder (see editor.ts) — ::slotted only reaches the
       slotted node itself, not its descendants, but that's all the box
       model needs here; everything editor.js renders inside it is styled
       by editor.js's own document-level stylesheet directly, no shadow
       boundary in the way since none of it actually lives in this shadow
       root. That's also why the default centered block column is
       overridden to left-aligned via a real document-level <style> in
       editor.ts (ensureLeftAlignStyles) rather than here — ::slotted can't
       reach a slotted node's own descendants (.ce-block__content), only
       the node itself.

       padding-left reserves a left gutter, on top of .wrapper's own uniform
       padding above — editor.js's own per-block "+"/drag-handle/settings
       controls are absolutely positioned immediately to the left of the
       (now left-aligned, not centered) content column, sized against
       .editor-holder's own content box (its nearest positioned ancestor is
       .codex-editor, which editor.js renders as this holder's direct
       child with no width of its own — so padding here shifts both the
       content *and* where those controls anchor, together). Without room
       reserved, they'd render clipped against — or overlapping — this
       component's own left border. */
    ::slotted(.editor-holder) {
      display: block;
      width: 100%;
      padding-left: 4.5rem;
    }
  `,
];
