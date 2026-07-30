// @editorjs/header's real .d.ts (dist/index.d.ts) is fine on its own, but it
// imports from "@editorjs/editorjs" internally — see editorjs.d.ts's own
// comment for why that specifier is redirected here instead of resolving
// for real. Declares only the surface editor.ts actually uses (assigning
// the default export into EDITOR_TOOLS, itself passed through as
// `Record<string, unknown>` — see EditorConfig.tools in editorjs.d.ts).
declare module "@editorjs/header" {
  export default class Header {
    constructor(options: {
      data: { text?: string; level?: number };
      api: unknown;
      config?: { placeholder?: string; levels?: number[]; defaultLevel?: number };
      readOnly: boolean;
    });
    render(): HTMLElement;
    save(block: HTMLElement): { text: string; level: number };
  }
}
