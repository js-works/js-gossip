import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PropertyValues } from "lit";
import EditorJS from "@editorjs/editorjs";
import type { OutputBlockData, OutputData } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import EditorjsList from "@editorjs/list";
import Quote from "@editorjs/quote";
import Marker from "@editorjs/marker";
import TableBlock from "@editorjs/table";
import ImageTool from "@editorjs/image";
import type { ImageUploadResponse } from "@editorjs/image";

import { editorStyles } from "./editor.styles.js";
import { renderGroupLabel } from "../../shared/field-label/field-label.js";

// Registered once per module load (a plain object literal, not per-instance)
// — Header/List/Quote/Marker/Table on top of the Paragraph tool editor.js
// always bundles, giving headings, (un)ordered lists, blockquotes, tables
// and a highlight mark alongside the bold/italic/link inline toolbar core
// already ships. `inlineToolbar: true` (in #createEditor below) is what
// actually surfaces Marker in the selection popup — per-tool
// `inlineToolbar` config isn't needed with it on. Image isn't in this
// static map — its config depends on `this.imageUploader` (see
// #createEditor), so it's built per-instance instead.
const STATIC_EDITOR_TOOLS = {
  header: Header,
  list: EditorjsList,
  quote: Quote,
  marker: Marker,
  table: TableBlock,
};

// Reads the file locally (no network call, same as every other field in
// this library — see ui-upload's own class doc) so the image tool works
// out of the box with zero configuration. A real app almost always wants
// its own backend instead: override `imageUploader` to upload the file and
// resolve with the resulting URL.
function defaultImageUploader(file: File): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: reader.result as string });
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// editor.js's own stylesheet centers every block's content column
// (`.ce-block__content { margin: 0 auto }`) — this library's fields default
// to left-aligned content instead, so it's overridden the same way editor.js
// injects its own base styles: one <style> in the document head, scoped by
// `.editor-holder` (shared by every ui-editor instance) rather than by
// class scoping that could reach it from inside this element's own shadow
// root — see the class doc above on why the holder lives in light DOM.
// `.ce-toolbar__content` gets the same override — it's what the per-block
// "+"/drag-handle/settings controls are positioned against (immediately to
// its left, via `right: 100%`), so left-aligning only the block content and
// not this would leave those controls floating over the old centered
// position instead of next to the actual (now left-aligned) text — see
// editor.styles.ts's `::slotted(.editor-holder)` padding-left for the
// matching left gutter reserved so those controls have room to render.
// Injected once per module load, not per instance.
let leftAlignStylesInjected = false;

function ensureLeftAlignStyles() {
  if (leftAlignStylesInjected) return;
  leftAlignStylesInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    .editor-holder .ce-block__content,
    .editor-holder .ce-toolbar__content {
      margin-left: 0;
      margin-right: 0;
    }
  `;
  document.head.appendChild(style);
}

function parseOutputData(value: string): OutputData | undefined {
  if (!value) return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray((parsed as OutputData).blocks)
      ? (parsed as OutputData)
      : undefined;
  } catch {
    return undefined;
  }
}

// Only the tools bundled above ever produce these shapes, so this is enough
// to tell an untouched block from one the user has actually cleared —
// editor.js itself doesn't collapse a fully-emptied block away on its own.
function blockHasContent(block: OutputBlockData): boolean {
  const data = block.data as { text?: unknown; items?: unknown[] };
  if (typeof data.text === "string") return data.text.trim() !== "";
  if (Array.isArray(data.items)) return data.items.length > 0;
  return true;
}

/**
 * A rich text editor wrapping editor.js — form-associated like the rest of
 * this library's fields, with `value` a JSON-serialized `OutputData` (the
 * same block-list shape `EditorJS#save()` resolves).
 *
 * editor.js is not shadow-DOM aware: it injects its own stylesheet into the
 * *document* `<head>` once per module load and appends some overlays
 * (confirmation popups) straight to `document.body`, neither of which would
 * reach content sitting inside this element's shadow root. Rather than
 * opting this whole component out of shadow DOM (losing the usual
 * `static styles`/`defaultTheme` wiring every other field here gets), only
 * the editor's own mount point is a plain light-DOM child of the host
 * (`#holder`, appended in `connectedCallback`) — projected into the shadow
 * template's position via the default `<slot>`. The slotted node stays
 * genuinely in the document for CSS purposes (editor.js's own stylesheet
 * applies normally), while everything around it (label, border, focus ring)
 * is themed the same way as every other component here.
 *
 * `editor.save()` is async (it has to ask every block's tool for its
 * current data), so unlike a native input there's no synchronous "current
 * value" to read on every keystroke — `value` only updates once editor.js's
 * own (already-debounced) `onChange` fires and the save resolves. `#lastValue`
 * distinguishes that internal round-trip from a consumer setting `.value`
 * directly (e.g. loading different content): only the latter should push
 * data back into the editor via `render()`.
 */
@customElement("ui-editor")
export class Editor extends LitElement {
  static formAssociated = true;

  #internals: ElementInternals;
  #holder?: HTMLDivElement;
  #editor?: EditorJS;
  #lastValue = "";
  #lastData: OutputData = { blocks: [] };

  @property()
  accessor name = "";

  // Renders as a plain (non-`for`) caption above the editor — there's no
  // single labelable element to point a real `<label for>` at, same
  // reasoning as ui-checkbox-group's own renderGroupLabel use.
  @property()
  accessor label = "";

  // A JSON-serialized editor.js `OutputData` — this field's form value, and
  // (when set from outside) the content to load. See the class doc above
  // for how a self-originated change is told apart from an external one.
  @property()
  accessor value = "";

  @property()
  accessor placeholder = "";

  @property({ type: Boolean, reflect: true })
  accessor disabled = false;

  @property({ type: Boolean })
  accessor required = false;

  @property({ type: Boolean })
  accessor readonly = false;

  // editor.js's own default (300) applies when left unset. Read once at
  // creation — editor.js has no API to change it afterwards, the same
  // "@initial option" situation ui-ag-grid documents for a couple of its
  // own AG Grid options.
  @property({ type: Number, attribute: "min-height" })
  accessor minHeight: number | undefined = undefined;

  // Resolves with the URL the image tool should embed once a file is
  // picked/dropped/pasted — see defaultImageUploader's own doc above.
  // Function-valued, so (like ui-datagrid's dataSource) it's a plain
  // property, never an attribute. Also `@initial`: the image tool reads it
  // once at construction, same limitation as placeholder/minHeight above.
  @property({ attribute: false })
  accessor imageUploader: (file: File) => Promise<{ url: string }> =
    defaultImageUploader;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  static styles = editorStyles;

  connectedCallback() {
    super.connectedCallback();

    ensureLeftAlignStyles();

    if (!this.#holder) {
      this.#holder = document.createElement("div");
      this.#holder.className = "editor-holder";
      this.appendChild(this.#holder);
    }

    if (!this.#editor) {
      this.#createEditor();
    }

    this.addEventListener("focusout", this.#onFocusOut);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.removeEventListener("focusout", this.#onFocusOut);
    this.#editor?.destroy();
    this.#editor = undefined;
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("value") && this.value !== this.#lastValue) {
      this.#loadValue(this.value);
    }

    if (changed.has("disabled")) {
      this.#syncFormValue();
    }

    if (changed.has("disabled") || changed.has("readonly")) {
      const readOnly = this.disabled || this.readonly;
      this.#editor?.isReady.then(() => this.#editor?.readOnly.toggle(readOnly));
    }
  }

  #createEditor() {
    const initialData = parseOutputData(this.value) ?? { blocks: [] };
    this.#lastValue = this.value;
    this.#lastData = initialData;

    this.#editor = new EditorJS({
      holder: this.#holder,
      data: initialData,
      placeholder: this.placeholder,
      readOnly: this.disabled || this.readonly,
      minHeight: this.minHeight,
      tools: {
        ...STATIC_EDITOR_TOOLS,
        image: {
          class: ImageTool,
          config: {
            uploader: {
              uploadByFile: (file: Blob) =>
                this.imageUploader(file as File).then(
                  (result): ImageUploadResponse => ({
                    success: 1,
                    file: { url: result.url },
                  }),
                ),
            },
          },
        },
      },
      inlineToolbar: true,
      onChange: () => this.#onEditorChange(),
    });

    this.#editor.isReady.then(() => {
      this.#syncFormValue();
      this.#syncValidity(initialData);
    });
  }

  #loadValue(value: string) {
    const data = parseOutputData(value) ?? { blocks: [] };
    this.#lastValue = value;
    this.#lastData = data;

    this.#syncFormValue();
    this.#syncValidity(data);

    this.#editor?.isReady.then(() => this.#editor?.render(data));
  }

  async #onEditorChange() {
    if (!this.#editor) return;

    const data = await this.#editor.save();
    const next = JSON.stringify(data);
    this.#lastValue = next;
    this.#lastData = data;
    this.value = next;

    this.#syncFormValue();
    this.#syncValidity(data);

    this.dispatchEvent(
      new InputEvent("input", { bubbles: true, composed: true }),
    );
  }

  // Fires "change" once focus actually leaves the whole widget, the closest
  // analogue to a native input's blur-triggered change when the real
  // interaction surface is many separate contenteditable blocks rather than
  // one focusable element — a single listener on the host catches blur from
  // any of them, since focusout bubbles.
  #onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && this.contains(next)) return;

    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  };

  #syncFormValue() {
    this.#internals.setFormValue(this.disabled ? null : this.value);
  }

  #syncValidity(data: OutputData) {
    const flags: ValidityStateFlags = {};
    let message = "";

    if (this.required && !data.blocks.some(blockHasContent)) {
      flags.valueMissing = true;
      message = "This field is required.";
    }

    this.#internals.setValidity(flags, message, this.#holder);
    this.toggleAttribute("invalid", !this.#internals.validity.valid);
  }

  formResetCallback() {
    this.value = "";
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === "string") {
      this.value = state;
    }
  }

  checkValidity() {
    return this.#internals.checkValidity();
  }

  reportValidity() {
    return this.#internals.reportValidity();
  }

  setCustomValidity(message: string) {
    if (message) {
      this.#internals.setValidity(
        { customError: true },
        message,
        this.#holder,
      );
    } else {
      this.#syncValidity(this.#lastData);
    }
  }

  // FocusOptions isn't forwarded — editor.js's own focus() takes no such
  // thing — kept only so this matches every other field's focus() signature.
  focus(_options?: FocusOptions) {
    this.#editor?.focus();
  }

  render() {
    return html`
      ${renderGroupLabel(this.label, "editor-label")}
      <div
        class="wrapper"
        aria-labelledby=${this.label ? "editor-label" : nothing}
      >
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-editor": Editor;
  }
}
