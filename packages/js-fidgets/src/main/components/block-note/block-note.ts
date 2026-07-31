import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PropertyValues } from "lit";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { BlockNoteEditor } from "@blocknote/core";
import type { BlockNoteEditorOptions, PartialBlock } from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";

import { blockNoteStyles } from "./block-note.styles.js";
import { renderGroupLabel } from "../../shared/field-label/field-label.js";

// Reads the file locally (no network call) so the block-based file/image
// blocks work out of the box with zero configuration — same reasoning, and
// same shape (a data URL), as ui-editor's own defaultImageUploader. A real
// app almost always wants its own backend instead: override `uploadFile` to
// upload the file and resolve with the resulting URL.
function defaultUploadFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function parseDocument(value: string): PartialBlock<any, any, any>[] | undefined {
  if (!value) return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? (parsed as PartialBlock<any, any, any>[])
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A rich text editor wrapping BlockNote's React component
 * (`@blocknote/react` + the `@blocknote/mantine` UI kit) — form-associated
 * like the rest of this library's fields, with `value` a JSON-serialized
 * array of BlockNote `Block`s (the same shape `editor.document` exposes).
 *
 * BlockNote/Mantine's own stylesheets assume a normal light-DOM document
 * (global CSS cascade, and floating menus/toolbars that portal relative to
 * `.bn-container`), so — exactly like ui-editor wrapping editor.js — only
 * the editor's own mount point is a plain light-DOM child of the host
 * (`#holder`, appended in `connectedCallback`), projected into the shadow
 * template's position via the default `<slot>`. Everything around it
 * (label, border, focus ring) is themed the same way as every other
 * component here. Consumers must import BlockNote's own stylesheets once,
 * the same as any other BlockNote/Mantine integration:
 * `@blocknote/core/fonts/inter.css` and `@blocknote/mantine/style.css`
 * (see src/demo/demo.ts).
 *
 * A `BlockNoteEditor` is created once (`BlockNoteEditor.create`, not the
 * `useCreateBlockNote` hook — there's no enclosing React render cycle to
 * hook into here) and its React view is mounted once via `react-dom/client`.
 * Property changes afterwards go straight to the editor instance instead of
 * re-rendering the React tree: `disabled`/`readonly` toggle
 * `editor.isEditable`, an external `value` change replaces every block via
 * `editor.replaceBlocks`. `placeholder`/`uploadFile` are read once at
 * creation only, same "@initial" limitation as ui-editor's own
 * placeholder/imageUploader.
 *
 * Like ui-editor's `editor.save()`, BlockNote's own change notifications
 * are the only source of truth for "current value" — `#lastValue`
 * distinguishes that internal round-trip from a consumer setting `.value`
 * directly (e.g. loading different content): only the latter should push
 * data back into the editor via `replaceBlocks`.
 */
@customElement("ui-block-note")
export class BlockNote extends LitElement {
  static formAssociated = true;

  #internals: ElementInternals;
  #holder?: HTMLDivElement;
  #root?: Root;
  #editor?: BlockNoteEditor<any, any, any>;
  #lastValue = "";

  @property()
  accessor name = "";

  // Renders as a plain (non-`for`) caption above the editor — there's no
  // single labelable element to point a real `<label for>` at, same
  // reasoning as ui-editor's own label.
  @property()
  accessor label = "";

  // A JSON-serialized array of BlockNote `Block`s — this field's form
  // value, and (when set from outside) the content to load.
  @property()
  accessor value = "";

  // @initial — read once when the editor is created, see the class doc.
  @property()
  accessor placeholder = "";

  @property({ type: Boolean, reflect: true })
  accessor disabled = false;

  @property({ type: Boolean })
  accessor required = false;

  @property({ type: Boolean })
  accessor readonly = false;

  // Resolves with the URL (or a BlockNote file-block props object) a file
  // block should embed once a file is picked/dropped/pasted — see
  // defaultUploadFile's own doc above. Function-valued, so (like
  // ui-editor's imageUploader) it's a plain property, never an attribute.
  // Also @initial: BlockNote reads it once at creation.
  @property({ attribute: false })
  accessor uploadFile: (file: File) => Promise<string> = defaultUploadFile;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  static styles = blockNoteStyles;

  connectedCallback() {
    super.connectedCallback();

    if (!this.#holder) {
      this.#holder = document.createElement("div");
      this.#holder.className = "block-note-holder";
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
    this.#root?.unmount();
    this.#root = undefined;
    this.#editor = undefined;
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("value") && this.value !== this.#lastValue) {
      this.#loadValue(this.value);
    }

    if (changed.has("disabled")) {
      this.#syncFormValue();
    }

    if ((changed.has("disabled") || changed.has("readonly")) && this.#editor) {
      this.#editor.isEditable = !(this.disabled || this.readonly);
    }
  }

  #createEditor() {
    const initialContent = parseDocument(this.value);
    this.#lastValue = this.value;

    // `any` schema generics throughout this class — this component never
    // takes a custom `schema` prop, and letting `create`'s own conditional
    // return type (`Options extends { schema: … } ? … : …`) infer the
    // default schema from a fresh object literal here sends BlockNote's
    // deeply generic block/content types into structural mismatches against
    // themselves (a known sharp edge of its typing, unrelated to any actual
    // type error). `any` short-circuits that inference instead.
    const options: Partial<BlockNoteEditorOptions<any, any, any>> = {
      initialContent,
      uploadFile: (file) => this.uploadFile(file),
      dictionary: {
        ...en,
        placeholders: {
          ...en.placeholders,
          default: this.placeholder || en.placeholders.default,
        },
      },
    };

    this.#editor = BlockNoteEditor.create(options);

    this.#root = createRoot(this.#holder!);
    this.#root.render(
      createElement(BlockNoteView, {
        editor: this.#editor,
        editable: !(this.disabled || this.readonly),
        onChange: () => this.#onEditorChange(),
      }),
    );

    this.#syncFormValue();
    this.#syncValidity();
  }

  #loadValue(value: string) {
    if (!this.#editor) return;

    const blocks = parseDocument(value) ?? [];
    this.#lastValue = value;

    const currentIds: string[] = [];
    this.#editor.forEachBlock((block) => {
      currentIds.push(block.id);
      return true;
    });
    this.#editor.replaceBlocks(currentIds, blocks);

    this.#syncFormValue();
    this.#syncValidity();
  }

  #onEditorChange() {
    if (!this.#editor) return;

    const next = JSON.stringify(this.#editor.document);
    this.#lastValue = next;
    this.value = next;

    this.#syncFormValue();
    this.#syncValidity();

    this.dispatchEvent(
      new InputEvent("input", { bubbles: true, composed: true }),
    );
  }

  // Fires "change" once focus actually leaves the whole widget — see
  // ui-editor's own identical listener for why this beats a native blur.
  #onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && this.contains(next)) return;

    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  };

  #syncFormValue() {
    this.#internals.setFormValue(this.disabled ? null : this.value);
  }

  #syncValidity() {
    if (!this.#editor) return;

    const flags: ValidityStateFlags = {};
    let message = "";

    if (this.required && !this.#editor.blocksToMarkdownLossy().trim()) {
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
      this.#syncValidity();
    }
  }

  // FocusOptions isn't forwarded — BlockNote's own focus() takes no such
  // thing — kept only so this matches every other field's focus() signature.
  focus(_options?: FocusOptions) {
    this.#editor?.focus();
  }

  render() {
    return html`
      ${renderGroupLabel(this.label, "block-note-label")}
      <div
        class="wrapper"
        aria-labelledby=${this.label ? "block-note-label" : nothing}
      >
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-block-note": BlockNote;
  }
}
