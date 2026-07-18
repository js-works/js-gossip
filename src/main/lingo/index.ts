import { defaultDialogTexts, defaultToastTexts } from "../index.js";
import type { DialogTexts, ToastTexts } from "../index.js";
import { createNamespace } from "js-lingo";

export { dialogTexts, toastTexts };

const dialogTexts = createNamespace<DialogTexts>({
  key: "js-gossip.dialogs",
  defaults: defaultDialogTexts,
});

const toastTexts = createNamespace<ToastTexts>({
  key: "js-gossip.toasts",
  defaults: defaultToastTexts,
});
