// Same reasoning as editorjs-header.d.ts: @editorjs/quote's real .d.ts is
// fine on its own, but internally imports "@editorjs/editorjs" — redirected
// (see editorjs.d.ts) to avoid the enum-incompatible module graph behind it.
declare module "@editorjs/quote" {
  export default class Quote {
    constructor(options: {
      data: { text?: string; caption?: string; alignment?: string };
      api: unknown;
      config?: {
        quotePlaceholder?: string;
        captionPlaceholder?: string;
        defaultAlignment?: string;
      };
      readOnly: boolean;
    });
    render(): HTMLElement;
    save(block: HTMLElement): { text: string; caption: string; alignment: string };
  }
}
