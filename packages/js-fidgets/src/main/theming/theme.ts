import { css } from "lit";

/* prettier-ignore */
// `:root` alongside `:host` is inert wherever this only lives inside a shadow
// root (no shadow root has a root element), but lets a consumer also adopt
// this stylesheet at the top-level document to make these tokens available to
// plain light-DOM markup — see src/demo/demo.ts, which does exactly that so
// the demo page's own chrome tracks the same theme as the components it hosts.
export const defaultTheme = css`
  :host, :root {
    --ui-bg: white;
    --ui-text: black;

    /* Color ramps below are the standard Tailwind CSS palette, used verbatim
       (no color-mix generation) — primary=blue, danger=red, warn=amber,
       success=emerald, neutral=neutral. */

    --ui-color-primary-50: #eff6ff;
    --ui-color-primary-100: #dbeafe;
    --ui-color-primary-200: #bfdbfe;
    --ui-color-primary-300: #93c5fd;
    --ui-color-primary-400: #60a5fa;
    --ui-color-primary-500: #3b82f6;
    --ui-color-primary-600: #2563eb;
    --ui-color-primary-700: #1d4ed8;
    --ui-color-primary-800: #1e40af;
    --ui-color-primary-900: #1e3a8a;
    --ui-color-primary-950: #172554;

    --ui-color-danger-50: #fef2f2;
    --ui-color-danger-100: #fee2e2;
    --ui-color-danger-200: #fecaca;
    --ui-color-danger-300: #fca5a5;
    --ui-color-danger-400: #f87171;
    --ui-color-danger-500: #ef4444;
    --ui-color-danger-600: #dc2626;
    --ui-color-danger-700: #b91c1c;
    --ui-color-danger-800: #991b1b;
    --ui-color-danger-900: #7f1d1d;
    --ui-color-danger-950: #450a0a;

    --ui-color-warn-50: #fffbeb;
    --ui-color-warn-100: #fef3c7;
    --ui-color-warn-200: #fde68a;
    --ui-color-warn-300: #fcd34d;
    --ui-color-warn-400: #fbbf24;
    --ui-color-warn-500: #f59e0b;
    --ui-color-warn-600: #d97706;
    --ui-color-warn-700: #b45309;
    --ui-color-warn-800: #92400e;
    --ui-color-warn-900: #78350f;
    --ui-color-warn-950: #451a03;

    --ui-color-success-50: #ecfdf5;
    --ui-color-success-100: #d1fae5;
    --ui-color-success-200: #a7f3d0;
    --ui-color-success-300: #6ee7b7;
    --ui-color-success-400: #34d399;
    --ui-color-success-500: #10b981;
    --ui-color-success-600: #059669;
    --ui-color-success-700: #047857;
    --ui-color-success-800: #065f46;
    --ui-color-success-900: #064e3b;
    --ui-color-success-950: #022c22;

    --ui-color-neutral-50: #fafafa;
    --ui-color-neutral-100: #f5f5f5;
    --ui-color-neutral-200: #e5e5e5;
    --ui-color-neutral-300: #d4d4d4;
    --ui-color-neutral-400: #a3a3a3;
    --ui-color-neutral-500: #737373;
    --ui-color-neutral-600: #525252;
    --ui-color-neutral-700: #404040;
    --ui-color-neutral-800: #262626;
    --ui-color-neutral-900: #171717;
    --ui-color-neutral-950: #0a0a0a;

    --ui-font-sans: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    /* rem, not px — these still track the document root's own font-size (a
       user's browser/OS text-size preference) in addition to --ui-scale,
       which is the one place that's actually wanted (see --ui-scale's own
       comment above). */
    --ui-font-size-sm: calc(0.875rem * var(--ui-scale));
    --ui-font-size-md: calc(1rem * var(--ui-scale));
    --ui-font-size-lg: calc(1.125rem * var(--ui-scale));
    --ui-font-size-xl: calc(1.5rem * var(--ui-scale));

    --ui-font-weight-light: 300;
    --ui-font-weight-normal: 400;
    --ui-font-weight-semibold: 600;
    --ui-font-weight-bold: 700;

    /* px, not rem — border/radius/spacing are visual-design decisions the
       library's own --ui-scale should control on its own, independent of a
       user's separate text-size preference (see --ui-scale's own comment
       above; the type scale above is the one place rem is right). */
    --ui-radius-xs: calc(2px * var(--ui-scale));
    --ui-radius-sm: calc(4px * var(--ui-scale));
    --ui-radius-md: calc(6px * var(--ui-scale));
    --ui-radius-lg: calc(12px * var(--ui-scale));

    --ui-button-radius: var(--ui-radius-sm);
    /* Same per-component-family indirection as --ui-button-radius, for
       every input-like field (text/number/password/email/date fields,
       select, combobox, autocomplete) — lets a consumer round (or square
       off) every field control's corners at once without touching
       --ui-radius-sm itself, which other, unrelated things also read. */
    --ui-field-radius: var(--ui-radius-xs);

    /* The border color shared by every input-like field (text/number/
       password/email/date fields, select, combobox, autocomplete — and,
       matching it, their chevron icon where they have one). Deliberately its
       own token rather than a --ui-color-neutral-* ramp step — history:
       #545454 → lightened to #6b6b6b → lightened too far to #999999 →
       darkened back to #808080 → lightened again, in two steps, to this. */
    --ui-field-border-color: #949494;

    /* The two border weights used throughout: -thin for hairline dividers
       and field/popup outlines, -thick for the reserved-space active/focus
       outline border (ui-select's [active] option, ui-menu-button's
       .menu-item.active — see option.styles.ts/menu-popup.styles.ts). Not a
       larger sm/md/lg scale — audited every border-width literal in
       src/main and only these two values are actually in use as a line
       weight (a few one-off spinner/hit-target borders elsewhere scale
       directly off --ui-scale without going through a shared token, since
       they aren't this kind of border). */
    --ui-border-thin: calc(1px * var(--ui-scale));
    --ui-border-thick: calc(2px * var(--ui-scale));

    /* Shared by every floating popup (ui-select/ui-combobox/ui-autocomplete's
       dropdown, ui-menu-button/ui-split-button's menu, ui-date-field's
       calendar) — these were identical copy-pasted literals across all of
       them before being pulled out here, so a future restyle only needs to
       change it in one place. */
    --ui-popup-border-color: var(--ui-color-neutral-300);
    /* Three layers, each a bit larger/fainter than the last (rather than the
       previous two-layer version's tight negative spreads, which read as a
       harder-edged cutoff) — a softer, more gradual falloff. */
    --ui-popup-shadow:
      0 2px 4px rgba(0, 0, 0, 0.06),
      0 8px 16px rgba(0, 0, 0, 0.08),
      0 20px 32px rgba(0, 0, 0, 0.1);

    --ui-focus-ring-width: var(--ui-border-thick);
    --ui-focus-ring-offset: var(--ui-border-thin);

    --ui-spacing-sm: calc(4px * var(--ui-scale));
    --ui-spacing-md: calc(16px * var(--ui-scale));
    --ui-spacing-lg: calc(24px * var(--ui-scale));
  }

  /* --ui-scale (the density dial every calc() above multiplies by) lives in
     its own :root-only rule, deliberately *not* inside the shared :host,
     :root block above — every other token there is redeclared on each
     component's own :host, which (a direct declaration always beats
     inheriting from an ancestor, regardless of specificity) would silently
     pin --ui-scale back to its own default on every single component,
     making it impossible for a consumer to actually override. Left
     undeclared on :host, it's never redeclared inside any component's own
     shadow tree, so it genuinely inherits through the shadow boundary from
     wherever a consumer sets it on the real document (:root here only
     matches the top-level <html> — see this file's own :host, :root doc
     comment above for why the demo adopts this stylesheet there too). */
  :root {
    --ui-scale: 1;
  }
`;
