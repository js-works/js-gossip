import { allTexts, bundleTexts } from "js-lingo";
import { dialogTexts, notificationTexts } from "./index.js";
import { defaultDialogTexts, defaultNotificationTexts } from "../../index.js";

export { englishTexts };

const englishTexts = bundleTexts({
  en: [
    allTexts(dialogTexts, defaultDialogTexts),
    allTexts(notificationTexts, defaultNotificationTexts),
  ],
});
