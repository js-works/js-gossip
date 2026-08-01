import { css } from "lit";

import { defaultTheme } from "../../theming/theme.js";

export const buttonStyles = [
  defaultTheme,
  css`
    /* Generic --btn-* tokens carry each tone's color scale; every variant
       rule below reads only these, so adding a variant never means touching the
       per-tone color mapping (and vice versa). tone="neutral" (the
       default) is set directly here rather than behind an attribute selector —
       "define the default, override the rest". */
    :host {
      font-weight: var(--ui-font-weight-normal);
      /* inline-flex, not inline-block: an inline-block's single inline-level
         child (.button, display: inline-flex below) would otherwise sit in
         an anonymous line box of its own, baseline-aligned against a strut
         based on this host's inherited font metrics — leaving an invisible
         gap under the button that throws off vertical centering next to
         sibling elements of a similar height (e.g. the datagrid pagination
         bar's nav buttons next to its page-size/page-input fields). Making
         the host itself a flex container sizes it to exactly wrap .button
         instead, the same way ui-select's :host avoids the same trap. */
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      font-family: var(--ui-font-sans);

      --btn-50: var(--ui-color-neutral-50);
      --btn-100: var(--ui-color-neutral-100);
      --btn-200: var(--ui-color-neutral-200);
      --btn-500: var(--ui-color-neutral-600);
      --btn-600: var(--ui-color-neutral-700);
      --btn-700: var(--ui-color-neutral-800);
      --btn-solid-text: white;

      /* size="medium" (the default) — 1em font-size + 0.5em padding on each
         block side adds up to a round 2em button height (line-height: 1 on
         .button below, so the content box is exactly 1em tall). */
      --btn-font-size: var(--ui-font-size-md);
      --btn-padding-block: 0.5em;
      --btn-padding-inline: 0.9em;
      --btn-gap: var(--ui-spacing-sm);
    }

    :host([tone="primary"]) {
      --btn-50: var(--ui-color-primary-50);
      --btn-100: var(--ui-color-primary-100);
      --btn-200: var(--ui-color-primary-200);
      --btn-500: var(--ui-color-primary-500);
      --btn-600: var(--ui-color-primary-600);
      --btn-700: var(--ui-color-primary-700);
      --btn-solid-text: white;
    }

    :host([tone="danger"]) {
      --btn-50: var(--ui-color-danger-50);
      --btn-100: var(--ui-color-danger-100);
      --btn-200: var(--ui-color-danger-200);
      --btn-500: var(--ui-color-danger-500);
      --btn-600: var(--ui-color-danger-600);
      --btn-700: var(--ui-color-danger-700);
      --btn-solid-text: white;
    }

    :host([tone="warning"]) {
      --btn-50: var(--ui-color-warn-50);
      --btn-100: var(--ui-color-warn-100);
      --btn-200: var(--ui-color-warn-200);
      --btn-500: var(--ui-color-warn-500);
      --btn-600: var(--ui-color-warn-600);
      --btn-700: var(--ui-color-warn-700);
      --btn-solid-text: white;
    }

    :host([tone="success"]) {
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
      border: var(--ui-border-thin) solid transparent;
      border-radius: var(--ui-button-radius);
      cursor: pointer;
      user-select: none;
      /* Suppresses the browser's own default (grayish) tap-highlight overlay on
         touch, which otherwise shows through a variant with a transparent base
         background (outlined, subtle, link) and reads as "always just gray"
         regardless of tone — our own :active rules below replace it. */
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

    /* A neutral gray, not a tone-tinted --btn-50 — an outlined button's
       hover is meant to read as "this is now interactive", the same
       feedback regardless of tone, matching the plain neutral hover used
       elsewhere (e.g. ui-tab, ui-select's option rows). */
    :host([variant="outlined"]) .button:hover {
      background: var(--ui-color-neutral-100);
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

    /* Faux-bold via stacked zero-offset text-shadow rather than a further
       font-weight bump: a heavier weight than the base 600 would widen the
       glyphs and reflow surrounding inline text the instant this is
       hovered. A blurred shadow thickens the strokes without touching
       layout metrics — same trick as ui-tab's [selected] state
       (tab.styles.ts) and ui-link's own :hover (link.styles.ts). */
    :host([variant="link"]) .button:hover {
      color: var(--btn-700);
      text-shadow:
        0 0 0.5px currentColor,
        0 0 0.5px currentColor;
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

    /* currentColor tracks whatever text color the active variant/tone
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
      border: var(--ui-border-thick) solid color-mix(in srgb, currentColor 25%, transparent);
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
