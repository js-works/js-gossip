// @editorjs/editorjs's own "types" entry (types/index.d.ts) is real and
// otherwise usable, but its module graph pulls in a handful of the
// package's own *.ts sources (not *.d.ts) that use real `enum` declarations
// — incompatible with this project's `erasableSyntaxOnly` gate.
// `skipLibCheck` doesn't help here: it only skips checking of `.d.ts`
// files, and these are plain `.ts`. tsconfig.json's `paths` entry for this
// specifier redirects every import of it (including the ones inside
// @editorjs/header's own — otherwise unavoidable — .d.ts, hence the sibling
// editorjs-header.d.ts/editorjs-list.d.ts/editorjs-quote.d.ts stubs too) to
// this file instead, so the real (broken) module graph is never opened at
// all. Declares only the surface editor.ts actually uses.
declare module "@editorjs/editorjs" {
  export interface OutputBlockData {
    id?: string;
    type: string;
    data: Record<string, unknown>;
  }

  export interface OutputData {
    version?: string;
    time?: number;
    blocks: OutputBlockData[];
  }

  export interface EditorConfig {
    holder?: string | HTMLElement;
    placeholder?: string | false;
    readOnly?: boolean;
    minHeight?: number;
    data?: OutputData;
    // Loosely typed rather than replicating editor.js's own
    // BlockToolConstructable/InlineToolConstructable union — this file
    // exists to route around the enum issue above, not to be a faithful
    // standalone type definition. Each tool's own stub (editorjs-header.d.ts
    // etc.) still types its own class as precisely as editor.ts needs.
    tools?: Record<string, unknown>;
    inlineToolbar?: boolean | string[];
    onChange?(api: unknown, event: unknown): void;
    onReady?(): void;
  }

  export default class EditorJS {
    constructor(config?: EditorConfig);
    readonly isReady: Promise<void>;
    readonly readOnly: {
      toggle(state?: boolean): Promise<boolean>;
      readonly isEnabled: boolean;
    };
    save(): Promise<OutputData>;
    render(data: OutputData): Promise<void>;
    focus(atEnd?: boolean): boolean;
    destroy(): void;
  }
}
