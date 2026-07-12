import { defaultDialogTexts, defaultNotificationTexts } from "../../index.js";
import type { DialogTexts, NotificationTexts } from "../../index.js";
import { createNamespace } from "js-lingo";

export { dialogTexts, notificationTexts };

const dialogTexts = createNamespace<DialogTexts>({
  key: "js-gossip.dialogs",
  defaults: defaultDialogTexts,
});

const notificationTexts = createNamespace<NotificationTexts>({
  key: "js-gossip.notifications",
  defaults: defaultNotificationTexts,
});
