// Same reasoning as editorjs-header.d.ts: @editorjs/image's real .d.ts is
// fine on its own, but internally imports "@editorjs/editorjs" — redirected
// (see editorjs.d.ts) to avoid the enum-incompatible module graph behind it.
// Unlike header/list/quote/marker, this one's config (the `uploader` seam
// editor.ts wires `imageUploader` through) is precisely typed rather than
// left as `unknown` — it's the one piece of this stub editor.ts actually
// constructs rather than just passing straight through to EDITOR_TOOLS.
declare module "@editorjs/image" {
  export interface ImageToolData {
    caption: string;
    withBorder: boolean;
    withBackground: boolean;
    stretched: boolean;
    file: { url: string };
  }

  export interface ImageUploadResponse {
    success: 0 | 1;
    file: { url: string };
  }

  export interface ImageConfig {
    uploader?: {
      uploadByFile?: (file: Blob) => Promise<ImageUploadResponse>;
      uploadByUrl?: (url: string) => Promise<ImageUploadResponse>;
    };
    captionPlaceholder?: string;
    buttonContent?: string;
  }

  export default class ImageTool {
    constructor(options: {
      data: Partial<ImageToolData>;
      config?: ImageConfig;
      api: unknown;
      readOnly: boolean;
      block: unknown;
    });
    render(): HTMLElement;
    save(): ImageToolData;
  }
}
