import { allTexts, bundleTexts } from "js-lingo";
import { dialogTexts, notificationTexts } from "./index.js";

export { germanTexts };

const germanTexts = bundleTexts({
  de: [
    allTexts(dialogTexts, {
      ok: "Ok",
      cancel: "Abbrechen",
      yes: "Ja",
      no: "Nein",
      titleInfo: "Information",
      titleSuccess: "Erfolg",
      titleWarn: "Warnung",
      titleError: "Fehler",
      titleConfirm: "Bestätigung",
      titleConfirmCritical: "Bestätigung",
      titleDecide: "Entscheidung",
      titleDecideCritical: "Entscheidung",
      titleForm: "Eingabe",
      titleFormCritical: "Eingabe",
    }),
    allTexts(notificationTexts, {
      dismiss: "Benachrichtigung ausblenden",
      info: "Information",
      success: "Erfolg",
      warn: "Warnung",
      error: "Fehler",
    }),
  ],
});
