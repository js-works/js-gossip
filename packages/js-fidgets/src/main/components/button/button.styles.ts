import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";

export const buttonStyles = [
  defaultTheme,
  css`
    /* Generic --btn-* tokens carry each appearance's color scale; every variant
       rule below reads only these, so adding a variant never means touching the
       per-appearance color mapping (and vice versa). appearance="neutral" (the
       default) is set directly here rather than behind an attribute selector —
       same "define the default, override the rest" pattern as elsewhere in this
       codebase (see data-navigator.styles.ts's --selection-bg). */
    :host {
      display: inline-block;
      vertical-align: middle;
      font-family: var(--ui-font-sans);

      --btn-50: var(--ui-color-neutral-50);
      --btn-100: var(--ui-color-neutral-100);
      --btn-200: var(--ui-color-neutral-200);
      --btn-500: var(--ui-color-neutral-600);
      --btn-600: var(--ui-color-neutral-700);
      --btn-700: var(--ui-color-neutral-800);
      --btn-solid-text: white;

      /* size="medium" (the default) */
      --btn-font-size: var(--ui-font-size-md);
      --btn-padding-block: 0.55em;
      --btn-padding-inline: 1em;
      --btn-gap: var(--ui-spacing-sm);
    }

    :host([appearance="primary"]) {
      --btn-50: var(--ui-color-primary-50);
      --btn-100: var(--ui-color-primary-100);
      --btn-200: var(--ui-color-primary-200);
      --btn-500: var(--ui-color-primary-500);
      --btn-600: var(--ui-color-primary-600);
      --btn-700: var(--ui-color-primary-700);
      --btn-solid-text: white;
    }

    :host([appearance="danger"]) {
      --btn-50: var(--ui-color-danger-50);
      --btn-100: var(--ui-color-danger-100);
      --btn-200: var(--ui-color-danger-200);
      --btn-500: var(--ui-color-danger-500);
      --btn-600: var(--ui-color-danger-600);
      --btn-700: var(--ui-color-danger-700);
      --btn-solid-text: white;
    }

    :host([appearance="warning"]) {
      --btn-50: var(--ui-color-warn-50);
      --btn-100: var(--ui-color-warn-100);
      --btn-200: var(--ui-color-warn-200);
      --btn-500: var(--ui-color-warn-500);
      --btn-600: var(--ui-color-warn-600);
      --btn-700: var(--ui-color-warn-700);
      --btn-solid-text: white;
    }

    :host([appearance="success"]) {
      --btn-50: var(--ui-color-success-50);
      --btn-100: var(--ui-color-success-100);
      --btn-200: var(--ui-color-success-200);
      --btn-500: var(--ui-color-success-500);
      --btn-600: var(--ui-color-success-600);
      --btn-700: var(--ui-color-success-700);
      --btn-solid-text: white;
    }

    :host([size="small"]) {
      --btn-font-size: var(--ui-font-size-sm);
      --btn-padding-block: 0.3em;
      --btn-padding-inline: 0.75em;
      --btn-gap: 0.3em;
    }

    :host([size="large"]) {
      --btn-font-size: var(--ui-font-size-lg);
      --btn-padding-block: 0.65em;
      --btn-padding-inline: 1.25em;
    }

    :host([full-width]) {
      display: block;
    }

    :host([full-width]) .button {
      width: 100%;
    }

    /* all: unset strips the native <button> chrome (UA background/border/font)
       down to a blank slate shared by every variant below. */
    .button {
      all: unset;
      box-sizing: border-box;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--btn-gap);
      font-family: inherit;
      font-size: var(--btn-font-size);
      font-weight: 600;
      line-height: 1;
      padding-block: var(--btn-padding-block);
      padding-inline: var(--btn-padding-inline);
      border: 1px solid transparent;
      border-radius: var(--ui-button-radius);
      cursor: pointer;
      user-select: none;
      /* Suppresses the browser's own default (grayish) tap-highlight overlay on
         touch, which otherwise shows through a variant with a transparent base
         background (outlined, subtle, link) and reads as "always just gray"
         regardless of appearance — our own :active rules below replace it. */
      -webkit-tap-highlight-color: transparent;
      transition:
        background-color 120ms ease,
        border-color 120ms ease,
        color 120ms ease;

      /* variant="solid" (the default) */
      background: var(--btn-500);
      color: var(--btn-solid-text);
    }

    .button:hover {
      background: var(--btn-600);
    }

    .button:active:not(:disabled) {
      filter: brightness(0.92);
    }

    .button:focus-visible {
      outline: var(--ui-focus-ring-width) solid var(--btn-500);
      outline-offset: var(--ui-focus-ring-offset);
    }

    /* loading sets the native disabled attribute too (see button.ts), but stays
       full-strength — only a genuinely disabled, non-loading button fades. */
    .button:disabled {
      cursor: not-allowed;
    }

    .button:disabled:not(.is-loading) {
      opacity: 0.55;
    }

    :host([variant="outlined"]) .button {
      background: transparent;
      border-color: color-mix(in srgb, var(--btn-500) 60%, transparent);
      color: var(--btn-600);
    }

    :host([variant="outlined"]) .button:hover {
      background: var(--btn-50);
    }

    /* An explicit tinted press state — relying only on the generic brightness
       filter (further below) would darken "transparent" itself, which has no
       visible effect, leaving whatever gray default the browser/OS supplies
       (e.g. a touch tap-highlight) as the only feedback. */
    :host([variant="outlined"]) .button:active:not(:disabled) {
      background: var(--btn-100);
    }

    :host([variant="filled"]) .button {
      background: var(--btn-200);
      color: var(--btn-700);
    }

    :host([variant="filled"]) .button:hover {
      background: color-mix(in srgb, var(--btn-500) 25%, var(--btn-200) 75%);
    }

    /* A "ghost" button: colored text, no fill/border until hovered. */
    :host([variant="subtle"]) .button {
      background: transparent;
      color: var(--btn-600);
    }

    :host([variant="subtle"]) .button:hover {
      background: var(--btn-100);
    }

    /* Reads as inline text (no padding/background) rather than a
       button-shaped control. */
    :host([variant="link"]) .button {
      background: transparent;
      padding: 0;
      border-radius: 0;
      color: var(--btn-600);
    }

    :host([variant="link"]) .button:hover {
      color: var(--btn-700);
    }

    :host([variant="link"]) .button:focus-visible {
      outline-offset: 4px;
    }

    /* visibility (not display: none, and not removing the slots) keeps the
       prefix/label/suffix content's layout box reserved so a loading button
       stays exactly the size of its non-loading self — the spinner below is
       then absolutely centered over that reserved space. */
    .button.is-loading > slot {
      visibility: hidden;
    }

    /* Explicit align-self rather than relying only on the container's
       align-items: center — the prefix/suffix slot has display: contents by
       default (its slotted child becomes the real flex item), and a slotted
       icon sitting next to a bare text node (a differently-sized anonymous
       flex item) is worth pinning down directly rather than trusting it falls
       out of the general rule. */
    ::slotted([slot="prefix"]),
    ::slotted([slot="suffix"]) {
      align-self: center;
    }

    /* currentColor tracks whatever text color the active variant/appearance
       resolved to, so the spinner never needs its own color token. Centered via
       inset + margin: auto rather than a translate transform — the spin
       animation below already owns the transform property (for its rotate
       keyframes), and an animated transform fully replaces a static one on the
       same property rather than combining with it. */
    .spinner {
      position: absolute;
      inset: 0;
      margin: auto;
      width: 1.2em;
      height: 1.2em;
      box-sizing: border-box;
      border: 2px solid color-mix(in srgb, currentColor 25%, transparent);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: ui-button-spin 0.75s linear infinite;
    }

    @keyframes ui-button-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `,
];
