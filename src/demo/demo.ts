import { html, render } from "lit";

import {
  createDialogsController,
  createToastController,
  litToastAdapter,
  litDialogAdapter,
} from "../main/index.js";

import type {
  DialogType,
  FormDialogResult,
  ToastType,
} from "../main/index.js";

// Custom form-associated fields — used only in the login demo below, to show the
// library working with a third-party (Lit-based) custom element's inputs.
import "./ui/components/text-field/text-field.js";
import "./ui/components/password-field/password-field.js";

// Assigned after the page template is rendered into #app (bottom of this file).
let logEl: HTMLPreElement;

function log(label: string, value?: unknown): void {
  const time = new Date().toLocaleTimeString();
  const body = value === undefined ? "" : " " + JSON.stringify(value, null, 2);
  logEl.textContent = `[${time}] ${label}${body}\n\n` + logEl.textContent;
}

// `data` only exists on the non-canceled member of the result union, so narrow
// before reading it.
function logFormResult(label: string, result: FormDialogResult): void {
  if (result.canceled) {
    log(`${label} (canceled)`, result);
  } else {
    log(label, {
      canceled: false,
      action: result.action,
      data: result.data.toRecord(),
    });
  }
}

const toasts = createToastController({
  adapter: litToastAdapter,
  maxVisible: 4,
  autoTitles: false,
  autoIcons: true,
  appearance: "light",
  placement: "top-end",
  overflow: "evict",
});

// A single controller for the whole page. getText / getDialogIcon are optional;
// omitting them uses the library's built-in English texts and default icons, and the
// library's own (native) action buttons.
const dialogs = createDialogsController({
  adapter: litDialogAdapter,
  autoIcons: true,
});

// Example form content, plain native form controls. Native inputs are natively
// form-associated, so the dialog's `new FormData(form)` reads them normally. `name`
// is required so you can see validation block the confirm button.
const formContent = () => html`
  <label class="field">
    Name
    <input
      name="name"
      placeholder="Jane Doe"
      required
      autocomplete="off"
      spellcheck="false"
      autofocus
    />
  </label>
  <label class="field">
    Email
    <input
      name="email"
      type="email"
      placeholder="jane@example.com"
      autocomplete="off"
      spellcheck="false"
    />
  </label>
  <label class="field field-checkbox">
    <input type="checkbox" name="subscribe" value="yes" />
    Subscribe to updates
  </label>
`;

// The dialog wraps slotted content in a `.content` element; this lays the fields out
// in a column and gives the native inputs the same look as the rest of the demo.
const formStyles = `
  .content { display: flex; flex-direction: column; gap: 1rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; }
  .field input:not([type="checkbox"]) {
    font: inherit;
    padding: 0.45em 0.7em;
    border: 1px solid light-dark(#c3c7cf, #3a3f47);
    border-radius: 4px;
    background: light-dark(#ffffff, #1e2126);
    color: inherit;
  }
  .field input:focus-visible {
    outline: 2px solid var(--ui-color-primary-500);
    outline-offset: 1px;
  }
  .field-checkbox { flex-direction: row; align-items: center; gap: 0.5rem; }
`;

async function openByType(type: DialogType): Promise<void> {
  switch (type) {
    case "info":
      log(
        "Info result",
        await dialogs.info({
          content: `
            The XML document has been validated.
            Everything is fine.
          `,
        }),
      );
      break;
    case "success":
      log(
        "Success result",
        await dialogs.success({
          content: html`
            The temporary data files in directory <i>"tmp/data"</i><br />
            have been deleted successfully.
          `,
        }),
      );
      break;
    case "warn":
      log(
        "Warn result",
        await dialogs.warn({ content: "This action needs your attention." }),
      );
      break;
    case "error":
      log(
        "Error result",
        await dialogs.error({
          content:
            "Unexpected error: Invalid operation.\nTask could not be performed",
        }),
      );
      break;
    case "confirm":
      log(
        "Confirm result",
        await dialogs.confirm({
          content: "Are you sure you want to continue?",
        }),
      );
      break;
    case "confirmCritical":
      log(
        "Confirm critical result",
        await dialogs.confirmCritical({
          title: "Delete user",
          subtitle: "User: superuser",
          content:
            "Are you really sure that you want to delete the superuser?\n" +
            "You cannot undo this later.",
          buttons: { confirm: "Delete" },
        }),
      );
      break;
    case "decide":
      log(
        "Decide result",
        await dialogs.decide({ content: "Do you want to save your changes?" }),
      );
      break;
    case "decideCritical":
      log(
        "Decide critical result",
        await dialogs.decideCritical({
          content: "Discard unsaved changes before leaving?",
        }),
      );
      break;
    case "form": {
      const result = await dialogs.form({
        intro: "Please fill out the form.",
        content: formContent(),
        styles: formStyles,
      });
      logFormResult("Form result", result);
      break;
    }
    case "formCritical": {
      const result = await dialogs.formCritical({
        intro: "Confirm the destructive form.",
        content: formContent(),
        styles: formStyles,
        buttons: { confirm: "Apply" },
      });
      logFormResult("Form critical result", result);
      break;
    }
  }
}

// "confirmCritical" -> "Confirm critical" for the demo button labels.
function humanize(type: string): string {
  const spaced = type.replace(/([A-Z])/g, " $1").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// A demo trigger button; uniform grayish look, clicks wired in the template below.
const notifier = (type: Exclude<ToastType, "loading">) => html`
  <button
    class="demo-btn"
    @click=${() =>
      void toasts[type]({
        message: "Toast sent at " + new Date().toLocaleTimeString(),
        actions: [
          {
            label: "Click me",
            onClick: () => alert("Woohoo"),
          },
        ],
      })}
  >
    ${humanize(type)}
  </button>
`;

// A demo trigger button; native <button> with the outline look from demo.css.
const trigger = (type: DialogType) => html`
  <button class="demo-btn" @click=${() => void openByType(type)}>
    ${humanize(type)}
  </button>
`;

// Scope demo: two dialogs sharing one surface, torn down at the end.
async function runWizard(): Promise<void> {
  const scope = dialogs.open();
  try {
    const step1 = await scope.confirm({
      title: "Step 1 of 2",
      content: "Proceed to the form?",
    });
    if (step1.canceled) {
      log("wizard canceled at step 1", step1);
      return;
    }

    // Simulate async work between steps. The step-1 dialog stays open the whole
    // time (the scope always shows a dialog), so the pressed button shows its
    // 150ms-delayed spinner for these 2 seconds.
    await new Promise((r) => setTimeout(r, 2000));

    const step2 = await scope.form({
      title: "Step 2 of 2",
      intro: "Enter your details.",
      content: formContent(),
      styles: formStyles,
    });

    logFormResult("Wizard finished", step2);
  } finally {
    scope.close();
  }
}

// "Slow open": open a scope but delay the first dialog past the placeholder delay
// (~300ms) so the round spinner dialog appears and then morphs into the real one.
async function runSlow(): Promise<void> {
  const scope = dialogs.open();
  try {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await scope.confirmCritical({
      title: "Delete directory",
      content:
        'Do you really want to the delete the directory "/var/app/data"?\nIt contains 125 files which will also be deleted.',
      buttons: {
        confirm: "Delete",
      },
    });

    if (result.canceled) {
      return;
    }

    await new Promise((r) => setTimeout(r, 1500));

    await scope.success({
      content: "The directory has been deleted successfully.",
    });
    log("slow open result", result);
  } finally {
    scope.close();
  }
}

// Login with retry: the form is an async-iterable "interaction". Each iteration is
// a submit attempt; the caller does async work and then accept()s or reject()s it.
// reject() keeps the *same* dialog open (entered values preserved) and shows a notice.
// Awaiting the interaction after the loop yields the final result (accepted or canceled).
async function runLogin(): Promise<void> {
  const session = dialogs.open();
  try {
    const login = session.formAttempts({
      title: "Sign in",
      content: html`
        <label class="field">
          Email
          <ui-input-field
            name="email"
            type="email"
            required
            value="jane.doe@gmail.com"
            autofocus
          ></ui-input-field>
        </label>
        <label class="field">
          Password
          <ui-password-field
            name="password"
            required
            value="xyz"
          ></ui-password-field>
        </label>
      `,
      styles: formStyles,
      buttons: { confirm: "Sign in" },
      // Config notice, shown while the dialog is open (like a field's help text). It's
      // overridden by the reject notice below and reappears once the user edits.
      notice: {
        message: 'Demo hint: The password is "secret".',
      },
    });

    for await (const attempt of login) {
      const password = attempt.data.string("password", "");

      // Fake server round-trip — the Sign in button shows its spinner meanwhile.
      await new Promise((r) => setTimeout(r, 1500));

      if (password === "secret") {
        attempt.accept(); // resolves the interaction and ends the loop
      } else {
        attempt.reject(
          "Wrong email or password. Please try again.",
          "Login failed",
        );
      }
    }

    if (!login.result?.canceled) {
      await session.success({
        content: "Congratulations! You are logged in.",
      });
    }

    // After the loop, `result` says whether the form was confirmed or canceled.
    const result = login.result;
    if (!result || result.canceled) {
      log("login canceled", result);
    } else {
      log("Login result", {
        ...result,
        data: result.data.toRecord(),
      });
    }
  } finally {
    session.close();
  }
}

// A plain (awaited) form that simply opens with a notice already showing.
async function runNoticeForm(): Promise<void> {
  const result = await dialogs.form({
    intro: "Please review the highlighted note.",
    content: formContent(),
    styles: formStyles,
    notice: {
      message: "Some fields could not be verified.",
    },
  });
  logFormResult("Notice form result", result);
}

// -------------------------------------------------------------------
// Page template — the whole demo UI lives here; index.html only hosts #app.
// -------------------------------------------------------------------

const page = html`
  <main class="page">
    <div>
      <section>
        <h2>Toasts</h2>
        <div class="row">
          ${notifier("info")} ${notifier("success")} ${notifier("warn")}
          ${notifier("error")}
        </div>
      </section>

      <section>
        <h2>Message dialogs</h2>
        <div class="row">
          ${trigger("info")} ${trigger("success")} ${trigger("warn")}
          ${trigger("error")}
        </div>
      </section>

      <section>
        <h2>Confirm &amp; decide</h2>
        <div class="row">
          ${trigger("confirm")} ${trigger("confirmCritical")}
          ${trigger("decide")} ${trigger("decideCritical")}
        </div>
      </section>

      <section>
        <h2>Forms</h2>
        <div class="row">${trigger("form")} ${trigger("formCritical")}</div>
      </section>

      <section>
        <h2>Scope (sequential dialogs sharing one surface)</h2>
        <div class="row">
          <button class="demo-btn" @click=${() => void runWizard()}>
            Run 2-step wizard
          </button>
          <button class="demo-btn" @click=${() => void runSlow()}>
            Slow open (shows spinner placeholder)
          </button>
        </div>
      </section>

      <section>
        <h2>Form retry with notice</h2>
        <div class="row">
          <button class="demo-btn" @click=${() => void runLogin()}>
            Login (retry until password is "secret")
          </button>
          <button class="demo-btn" @click=${() => void runNoticeForm()}>
            Form with initial notice
          </button>
        </div>
      </section>
    </div>
    <section class="results">
      <h2>Result log</h2>
      <pre id="log" aria-live="polite"></pre>
    </section>
  </main>
`;

render(page, document.getElementById("app")!);
logEl = document.getElementById("log") as HTMLPreElement;
