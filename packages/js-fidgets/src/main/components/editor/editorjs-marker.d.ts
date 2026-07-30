// @editorjs/marker ships no types of its own at all (unlike header/list/
// quote, which do — see editorjs-header.d.ts and friends for why those need
// a stub too, despite having real types). Declares only the surface
// editor.ts actually uses: a default-exported inline tool, assigned into
// EDITOR_TOOLS the same way header/list/quote are.
declare module "@editorjs/marker" {
  export default class Marker {
    constructor(options: { api: unknown });
    static get isInline(): true;
    render(): HTMLElement;
  }
}
