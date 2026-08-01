// vanillajs-datepicker ships no types of its own. This declares only the surface
// ui-date-field.ts actually uses — not the library's full option/API set.
declare module "vanillajs-datepicker/Datepicker" {
  export interface DatepickerLocale {
    days: string[];
    daysShort: string[];
    daysMin: string[];
    months: string[];
    monthsShort: string[];
    today: string;
    clear: string;
    titleFormat: string;
    format?: string;
    weekStart?: number;
  }

  export interface DatepickerOptions {
    language?: string;
    format?: string;
    weekStart?: number;
    minDate?: string | number | Date | null;
    maxDate?: string | number | Date | null;
    autohide?: boolean;
    todayButton?: boolean;
    todayButtonMode?: 0 | 1;
    clearButton?: boolean;
    orientation?: string;
    container?: Element | string | null;
    [key: string]: unknown;
  }

  export default class Datepicker {
    constructor(
      element: HTMLInputElement,
      options?: DatepickerOptions,
      rangepicker?: unknown,
    );
    readonly element: HTMLInputElement;
    readonly inputField?: HTMLInputElement;
    readonly pickerElement: HTMLElement | undefined;
    readonly active: boolean;
    dates: number[];
    static readonly locales: Record<string, DatepickerLocale>;
    static formatDate(date: Date | number, format: string, lang?: string): string;
    static parseDate(
      dateStr: string | Date | number,
      format: string,
      lang?: string,
    ): number | undefined;
    show(): void;
    hide(): void;
    toggle(): void;
    destroy(): this;
    getDate(format?: string): Date | string | Date[] | string[] | undefined;
    setDate(...args: unknown[]): void;
    setOptions(options: DatepickerOptions): void;
    update(options?: {
      autohide?: boolean;
      revert?: boolean;
      forceRefresh?: boolean;
    }): void;
    refresh(mode?: "input" | "picker", quickRender?: boolean): void;
  }
}
