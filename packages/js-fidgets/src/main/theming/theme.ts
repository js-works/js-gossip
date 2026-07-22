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
    --ui-font-size-sm: 0.875rem;
    --ui-font-size-md: 1rem;
    --ui-font-size-lg: 1.125rem;
    --ui-font-size-xl: 1.5rem;

    --ui-radius-xs: 2px;
    --ui-radius-sm: 4px;
    --ui-radius-md: 6px;
    --ui-radius-lg: 12px;

    --ui-button-radius: var(--ui-radius-sm);

    --ui-focus-ring-width: 2px;
    --ui-focus-ring-offset: 1px;

    --ui-spacing-sm: 4px;
    --ui-spacing-md: 16px;
    --ui-spacing-lg: 24px;
  }
`;
