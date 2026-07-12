// Ensure Symbol.dispose exists before any scope is created (needed for `using`
// and for the scope's [Symbol.dispose] method). Harmless if already present.
(Symbol as { dispose?: symbol }).dispose ??= Symbol.for("Symbol.dispose");

import { html, render } from "lit";

import {
  createDialogsController,
  createNotificationsController,
  litNotificationAdapter,
  litDialogAdapter,
} from "../main/index.js";

import type {
  DialogType,
  FormDialogResult,
  NotificationType,
} from "../main/index.js";

// Web Awesome (installed via npm). The theme stylesheet defines the --wa-* design
// tokens the demo's CSS points the dialog's --ui-* variables at; the component
// imports register the custom elements this demo uses.
import "@awesome.me/webawesome/dist/styles/webawesome.css";
import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/input/input.js";
import "@awesome.me/webawesome/dist/components/checkbox/checkbox.js";

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

// Map the library's semantic button variants onto Web Awesome's.
const waButtonVariant = {
  primary: "brand",
  secondary: "neutral",
  danger: "danger",
  success: "success",
} as const;

const notifications = createNotificationsController({
  adapter: litNotificationAdapter,
  maxVisible: 4,
  autoTitles: false,
  autoIcons: true,
});

// A single controller for the whole page. getText / getDialogIcon are optional;
// omitting them uses the library's built-in English texts and default icons. The
// render override swaps the built-in action buttons for original <wa-button>s
// (with WA's own loading spinner); the close button stays the library default.
const dialogs = createDialogsController({
  adapter: litDialogAdapter,
  autoIcons: false,
  render: {
    actionButton: ({ text, variant, loading, onClick }) => html`
      <wa-button
        appearance=${variant === "secondary" ? "filled" : "accent"}
        variant=${waButtonVariant[variant]}
        ?loading=${loading}
        @click=${onClick}
      >
        ${text}
      </wa-button>
    `,
  },
});

// Example form content, now using Web Awesome form controls. They're form-associated
// (ElementInternals), so the dialog's `new FormData(form)` reads them normally. `name`
// is required so you can see validation block the confirm button.
const formContent = () => html`
  <wa-input
    name="name"
    label="Name"
    placeholder="Jane Doe"
    required
    autocomplete="off"
    spellcheck="false"
    autofocus
  ></wa-input>
  <wa-input
    name="email"
    type="email"
    label="Email"
    placeholder="jane@example.com"
    autocomplete="off"
    spellcheck="false"
  ></wa-input>
  <wa-checkbox name="subscribe" value="yes">Subscribe to updates</wa-checkbox>
`;

// The dialog wraps slotted content in a `.content` element; this just lays the fields
// out in a column. Web Awesome controls bring their own field styling, so there are no
// input-level rules here anymore.
const formStyles = `
  .content { display: flex; flex-direction: column; gap: 1rem; }
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
          content:
            "Are you really sure?\nThis will permanently delete the item.",
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
const notifier = (type: NotificationType) => html`
  <wa-button
    appearance="filled"
    variant="neutral"
    @click=${() =>
      void notifications[type]({
        message: "Notification sent at " + new Date().toLocaleTimeString(),
      })}
  >
    ${humanize(type)}
  </wa-button>
`;

// A demo trigger button; uniform grayish look, clicks wired in the template below.
const trigger = (type: DialogType) => html`
  <wa-button
    appearance="filled"
    variant="neutral"
    @click=${() => void openByType(type)}
  >
    ${humanize(type)}
  </wa-button>
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
    scope[Symbol.dispose]();
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
    scope[Symbol.dispose]();
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
        <wa-input
          name="email"
          type="email"
          label="Email"
          placeholder="jane@example.com"
          required
          autocomplete="off"
          spellcheck="false"
          value="jane.doe@gmail.com"
          autofocus
        ></wa-input>
        <wa-input
          name="password"
          type="password"
          label="Password"
          required
          autocomplete="off"
          spellcheck="false"
          value="xyz"
        ></wa-input>
      `,
      styles: formStyles,
      buttons: { confirm: "Sign in" },
      // Config notice, shown while the dialog is open (like a field's help text). It's
      // overridden by the reject notice below and reappears once the user edits.
      notice: {
        message: 'Demo hint: the password is "secret".',
      },
    });

    for await (const attempt of login) {
      const password = attempt.data.string("password", "");

      // Fake server round-trip — the Sign in button shows its spinner meanwhile.
      await new Promise((r) => setTimeout(r, 1500));

      if (password === "secret") {
        attempt.accept(); // resolves the interaction and ends the loop
      } else {
        attempt.reject("Wrong email or password. Please try again.");
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
    session[Symbol.dispose]();
  }
}

// A plain (awaited) form that simply opens with a notice already showing.
async function runNoticeForm(): Promise<void> {
  const result = await dialogs.form({
    intro: "Please review the highlighted note.",
    content: formContent(),
    styles: formStyles,
    notice: {
      type: "warn",
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
        <h2>Notifications</h2>
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
          <wa-button
            appearance="filled"
            variant="neutral"
            @click=${() => void runWizard()}
          >
            Run 2-step wizard
          </wa-button>
          <wa-button
            appearance="filled"
            variant="neutral"
            @click=${() => void runSlow()}
          >
            Slow open (shows spinner placeholder)
          </wa-button>
        </div>
      </section>

      <section>
        <h2>Form retry with notice</h2>
        <div class="row">
          <wa-button
            appearance="filled"
            variant="neutral"
            @click=${() => void runLogin()}
          >
            Login (retry until password is "secret")
          </wa-button>
          <wa-button
            appearance="filled"
            variant="neutral"
            @click=${() => void runNoticeForm()}
          >
            Form with initial notice
          </wa-button>
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
