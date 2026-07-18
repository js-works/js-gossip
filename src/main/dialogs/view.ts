// -------------------------------------------------------------------
// Internal bridge types between the scope/controller and the dialog element.
// The controller produces a DialogView; the element consumes it and hands back a
// DialogHandle. Neither is part of the public API.
// -------------------------------------------------------------------

import type { Severity } from "../internal/severity.js";
import type { ContentAdapter, Renderable } from "./content.js";
import type {
  ActionButtonType,
  DialogNotice,
  DialogRenderOverrides,
  DialogType,
} from "./types.js";

export interface DialogButtonView {
  type: ActionButtonType;
  text: string;
  onClick: () => void;
}

export interface ResolvedNotice {
  type: Severity;
  message: Renderable<any>;
}

export function isDialogNotice(
  value: DialogNotice<any> | Renderable<any>,
): value is DialogNotice<any> {
  return (
    value != null &&
    typeof value === "object" &&
    !(value instanceof Node) &&
    "message" in value
  );
}

export function resolveNotice(
  notice: DialogNotice<any> | Renderable<any>,
): ResolvedNotice {
  if (isDialogNotice(notice)) {
    return { type: notice.type ?? "info", message: notice.message };
  }
  return { type: "info", message: notice };
}

export interface DialogView {
  id: string;
  dialogType: DialogType;
  /** Caller theme as resolved `--dialog-*` custom properties, applied to the host. */
  themeVars: Record<string, string>;
  styles: string | null;
  icon: Renderable<any>;
  title: Renderable<any>;
  subtitle: Renderable<any>;
  intro: Renderable<any>;
  content: Renderable<any>;
  outro: Renderable<any>;
  notice: ResolvedNotice | null;
  hasForm: boolean;
  buttons: DialogButtonView[];
  /** Index of the button triggered by Enter, or null (e.g. critical dialogs). */
  defaultButtonIndex: number | null;
  render: DialogRenderOverrides<any> | undefined;
  adapter: ContentAdapter<any> | undefined;
  onClose: () => void;
  onCancel: () => void;
}

export interface DialogHandle {
  update(view: DialogView): void;
  close(): Promise<void>;
  /** Toggle the inline spinner on the given action button. */
  setButtonLoading(index: number, loading: boolean): void;
  /** Raise the transient (reject) notice, shown below the config notice. */
  raiseNotice(notice: ResolvedNotice): void;
  /** The form element rendered inside the dialog, if any. */
  getForm(): HTMLFormElement | null;
}
