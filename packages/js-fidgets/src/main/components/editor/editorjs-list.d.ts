// Same reasoning as editorjs-header.d.ts: @editorjs/list's real .d.ts is
// fine on its own, but internally imports "@editorjs/editorjs" — redirected
// (see editorjs.d.ts) to avoid the enum-incompatible module graph behind it.
declare module "@editorjs/list" {
  export default class EditorjsList {
    constructor(options: {
      data: { style?: "ordered" | "unordered"; items?: unknown[] };
      api: unknown;
      config?: Record<string, unknown>;
      readOnly: boolean;
    });
    render(): HTMLElement;
    save(block: HTMLElement): { style: "ordered" | "unordered"; items: unknown[] };
  }
}
