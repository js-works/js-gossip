import { css } from "lit";

/* prettier-ignore */
export const defaultTheme = css`
  :host {
    --ui-bg: white;
    --ui-text: black;

    --ui-color-primary-500: #1677FF;
    --ui-color-primary-500: #DD4814;

    --ui-color-primary-50: color-mix(in oklch, white 95%, var(--ui-color-primary-500) 5%);
    --ui-color-primary-100: color-mix(in oklch, white 90%, var(--ui-color-primary-500) 10%);
    --ui-color-primary-200: color-mix(in oklch, white 80%, var(--ui-color-primary-500) 20%);
    --ui-color-primary-300: color-mix(in oklch, white 70%, var(--ui-color-primary-500) 30%);
    --ui-color-primary-400: color-mix(in oklch, white 50%, var(--ui-color-primary-500) 50%);
    --ui-color-primary-600: color-mix(in oklch, black 10%, var(--ui-color-primary-500) 90%);
    --ui-color-primary-700: color-mix(in oklch, black 20%, var(--ui-color-primary-500) 80%);
    --ui-color-primary-800: color-mix(in oklch, black 40%, var(--ui-color-primary-500) 60%);
    --ui-color-primary-900: color-mix(in oklch, black 60%, var(--ui-color-primary-500) 40%);
    --ui-color-primary-950: color-mix(in oklch, black 80%, var(--ui-color-primary-500) 20%);

    --ui-color-danger-500: #e53e3e;

    --ui-color-danger-50: color-mix(in oklch, white 95%, var(--ui-color-danger-500) 5%);
    --ui-color-danger-100: color-mix(in oklch, white 90%, var(--ui-color-danger-500) 10%);
    --ui-color-danger-200: color-mix(in oklch, white 80%, var(--ui-color-danger-500) 20%);
    --ui-color-danger-300: color-mix(in oklch, white 70%, var(--ui-color-danger-500) 30%);
    --ui-color-danger-400: color-mix(in oklch, white 60%, var(--ui-color-danger-500) 40%);
    --ui-color-danger-600: color-mix(in oklch, black 10%, var(--ui-color-danger-500) 90%);
    --ui-color-danger-700: color-mix(in oklch, black 20%, var(--ui-color-danger-500) 80%);
    --ui-color-danger-800: color-mix(in oklch, black 30%, var(--ui-color-danger-500) 70%);
    --ui-color-danger-900: color-mix(in oklch, black 40%, var(--ui-color-danger-500) 60%);
    --ui-color-danger-950: color-mix(in oklch, black 50%, var(--ui-color-danger-500) 50%);

    --ui-color-gray-50: #f9f9f9;
    --ui-color-gray-100: #f2f2f2;
    --ui-color-gray-200: #e6e6e6;
    --ui-color-gray-300: #d9d9d9;
    --ui-color-gray-400: #cccccc;
    --ui-color-gray-500: #bfbfbf;
    --ui-color-gray-600: #a6a6a6;
    --ui-color-gray-700: #8c8c8c;
    --ui-color-gray-800: #737373;
    --ui-color-gray-900: #595959;
    --ui-color-gray-950: #404040;

    --ui-font-sans: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    --ui-font-size-sm: 0.875rem;
    --ui-font-size-md: 1rem;
    --ui-font-size-lg: 1.125rem;
    --ui-font-size-xl: 1.5rem;

    --ui-radius-xs: 2px;
    --ui-radius-sm: 4px;
    --ui-radius-md: 6px;
    --ui-radius-lg: 12px;

    --ui-spacing-sm: 4px;
    --ui-spacing-md: 16px;
    --ui-spacing-lg: 24px;
  }
`;
