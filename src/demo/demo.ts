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
import "./ui/components/email-field/email-field.js";
import "./ui/components/password-field/password-field.js";
import "./ui/components/date-field/date-field.js";
import "./ui/components/checkbox/checkbox.js";
import "./ui/components/button/button.js";
import type { UiButton } from "./ui/components/button/button.js";
import { localFilter } from "./ui/components/combobox/combobox.js";
import type { UiCombobox } from "./ui/components/combobox/combobox.js";
import "./ui/components/data-navigator/data-navigator.js";
import type {
  DataNavigatorAction,
  DataNavigatorColumn,
} from "./ui/components/data-navigator/data-navigator.js";

// Web Awesome — a real third-party form-control library (form-associated custom
// elements with their own native constraint validation), used by the WebAwesome form
// demo below to show the library working with an off-the-shelf component set.
import "@awesome.me/webawesome/dist/styles/layers.css";
import "@awesome.me/webawesome/dist/styles/themes/default.css";
import "@awesome.me/webawesome/dist/components/input/input.js";
import "@awesome.me/webawesome/dist/components/textarea/textarea.js";
import "@awesome.me/webawesome/dist/components/select/select.js";
import "@awesome.me/webawesome/dist/components/option/option.js";
import "@awesome.me/webawesome/dist/components/tab-group/tab-group.js";
import "@awesome.me/webawesome/dist/components/tab/tab.js";
import "@awesome.me/webawesome/dist/components/tab-panel/tab-panel.js";

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

// Sample data for the ui-button demo below.
const BUTTON_APPEARANCES = [
  "neutral",
  "primary",
  "danger",
  "warning",
  "success",
] as const;
const BUTTON_VARIANTS = [
  "solid",
  "outlined",
  "filled",
  "subtle",
  "link",
] as const;

// Sample data for the ui-combobox demo below.
const FRUITS = [
  "Apple",
  "Apricot",
  "Avocado",
  "Banana",
  "Blackberry",
  "Blueberry",
  "Cherry",
  "Grape",
  "Grapefruit",
  "Kiwi",
  "Lemon",
  "Lime",
  "Mango",
  "Melon",
  "Nectarine",
  "Orange",
  "Papaya",
  "Peach",
  "Pear",
  "Pineapple",
  "Plum",
  "Pomegranate",
  "Raspberry",
  "Strawberry",
  "Watermelon",
];

// Sample data for the ui-data-navigator demo below.
interface Employee {
  name: string;
  email: string;
  department: string;
  role: string;
}

const FIRST_NAMES = [
  "Jane", "John", "Alice", "Bob", "Carol", "David", "Eve", "Frank", "Grace", "Hank",
  "Ivy", "Jack", "Karen", "Liam", "Mia", "Noah", "Olivia", "Paul", "Quinn", "Rachel",
  "Sam", "Tina", "Uma", "Victor", "Wendy", "Xander", "Yara", "Zack",
];
const LAST_NAMES = [
  "Doe", "Smith", "Johnson", "Williams", "Martinez", "Brown", "Davis", "Miller",
  "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris",
  "Martin", "Thompson", "Clark", "Lewis", "Walker", "Hall", "Allen", "Young",
  "King", "Wright", "Scott", "Green",
];
const DEPARTMENT_ROLES: Record<string, string[]> = {
  Engineering: ["Engineer", "Senior Engineer", "Junior Engineer", "Engineering Manager"],
  Sales: ["Account Executive", "Sales Manager"],
  Support: ["Support Agent", "Support Lead"],
  Marketing: ["Marketing Lead", "Content Strategist", "Designer"],
};
const DEPARTMENTS = Object.keys(DEPARTMENT_ROLES);

// 123 rows — enough to exercise sorting/filtering/pagination realistically.
// Deterministic (no Math.random()) so the demo looks the same on every reload.
const EMPLOYEES: Employee[] = Array.from({ length: 123 }, (_, i) => {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const last = LAST_NAMES[(i + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length];
  const department = DEPARTMENTS[i % DEPARTMENTS.length];
  const roles = DEPARTMENT_ROLES[department];
  const role = roles[Math.floor(i / DEPARTMENTS.length) % roles.length];
  return {
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
    department,
    role,
  };
});

// Demonstrates grouped column headers: "Name" and "Role" stand alone, while
// "Email"/"Department" share a group header spanning both — 4 leaf columns,
// 5 header cells total (3 in the top row: Name, the group, Role; 2 in the row
// beneath the group: Email, Department).
const employeeColumns: DataNavigatorColumn<Employee>[] = [
  { accessorKey: "name", header: "Name" },
  {
    header: "Contact & Org",
    columns: [
      { accessorKey: "email", header: "Email" },
      { accessorKey: "department", header: "Department" },
    ],
  },
  { accessorKey: "role", header: "Role" },
];

const plusIcon = html`
  <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true">
    <path d="M8 2a.75.75 0 0 1 .75.75V7.25h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2" />
  </svg>
`;

const pencilIcon = html`
  <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zM12.793 5.5 10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325" />
  </svg>
`;

const trashIcon = html`
  <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
  </svg>
`;

const employeeActions: DataNavigatorAction<Employee>[] = [
  {
    type: "general",
    label: "Add employee",
    icon: plusIcon,
    onClick: () => log("Action: Add employee"),
  },
  {
    type: "single",
    label: "Edit",
    icon: pencilIcon,
    onClick: (selected) => log("Action: Edit", selected[0].name),
  },
  {
    type: "multi",
    label: "Delete selected",
    icon: trashIcon,
    onClick: (selected) =>
      log(
        "Action: Delete selected",
        selected.map((employee) => employee.name),
      ),
  },
];

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

// Example form content, using the demo's own custom form-associated fields (see
// src/demo/ui/components). `name` is required so you can see validation block the
// confirm button.
const formContent = () => html`
  <label class="field">
    Name
    <ui-input-field name="name" placeholder="Jane Doe" required autofocus>
    </ui-input-field>
  </label>
  <label class="field">
    Email
    <ui-email-field
      name="email"
      placeholder="jane@example.com"
    ></ui-email-field>
  </label>
  <label class="field">
    Date of birth
    <ui-date-field name="dateOfBirth" required></ui-date-field>
  </label>
  <ui-checkbox name="subscribe" value="yes">Subscribe to updates</ui-checkbox>
`;

// The dialog wraps slotted content in a `.content` element; this just lays the fields
// out in a column. The custom field components bring their own styling.
const formStyles = `
  .content { display: flex; flex-direction: column; gap: 1rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; }
  /* Target the panel's inner "base" part, not the host element itself — the host's own
     display (none/block) is how wa-tab-group hides inactive panels, and overriding it
     directly here would defeat that and show every panel at once. */
  wa-tab-panel::part(base) { display: flex; flex-direction: column; gap: 1rem; }
`;

// Same fields as before, using real WebAwesome <wa-input> components instead of the
// demo's own custom fields — wa-input brings its own label/hint, so no wrapping <label>
// is needed. Split across two tabs: the 3 required fields (each blocking the confirm
// button via native reportValidity(), per WebAwesome's constraint-validation
// integration) and one optional field.
const webAwesomeFormContent = () => html`
  <wa-tab-group>
    <wa-tab panel="mandatory">Mandatory info</wa-tab>
    <wa-tab panel="optional">Optional</wa-tab>

    <wa-tab-panel name="mandatory" active>
      <wa-input
        name="fullName"
        label="Full name"
        required
        autofocus
        autocomplete="off"
        spellcheck="false"
      ></wa-input>
      <wa-input
        name="email"
        type="email"
        label="Email"
        required
        autocomplete="off"
        spellcheck="false"
      ></wa-input>
      <wa-select name="department" label="Department" required with-clear>
        <wa-option value="engineering">Engineering</wa-option>
        <wa-option value="sales">Sales</wa-option>
        <wa-option value="support">Support</wa-option>
        <wa-option value="other">Other</wa-option>
      </wa-select>
    </wa-tab-panel>

    <wa-tab-panel name="optional">
      <wa-textarea
        name="notes"
        label="Notes"
        autocomplete="off"
        spellcheck="false"
      ></wa-textarea>
    </wa-tab-panel>
  </wa-tab-group>
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
// reject() keeps the *same* dialog open (entered values preserved) and shows a reject
// message.
// Awaiting the interaction after the loop yields the final result (accepted or canceled).
async function runLogin(): Promise<void> {
  const session = dialogs.open();
  try {
    const login = session.formAttempts({
      title: "Sign in",
      content: html`
        <label class="field">
          Email
          <ui-email-field
            name="email"
            required
            value="jane.doe@gmail.com"
            autofocus
          ></ui-email-field>
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

// A plain (awaited) form built from real WebAwesome components rather than the demo's
// own custom fields — see the imports and webAwesomeFormContent() above.
async function runWebAwesomeForm(): Promise<void> {
  const result = await dialogs.form({
    title: "WebAwesome form",
    content: webAwesomeFormContent(),
    styles: formStyles,
  });
  logFormResult("WebAwesome form result", result);
}

// -------------------------------------------------------------------
// Page template — the whole demo UI lives here; index.html only hosts #app.
// -------------------------------------------------------------------

const page = html`
  <ui-combobox
    id="suggestion-combobox"
    placeholder="Search fruits…"
    .dataSource=${localFilter(FRUITS, 0)}
    @change=${(e: Event) =>
      log("Combobox picked", (e.target as UiCombobox).value)}
  ></ui-combobox>
  <main class="page">
    <div>
      <section class="button-showcase">
        <h2>Buttons</h2>
        <div class="button-grid">
          ${BUTTON_APPEARANCES.map(
            (appearance) => html`
              <span class="page-label">${appearance}</span>
              ${BUTTON_VARIANTS.map(
                (variant) => html`
                  <ui-button
                    appearance=${appearance}
                    variant=${variant}
                    @click=${() =>
                      log("Button clicked", { appearance, variant })}
                  >
                    ${variant}
                  </ui-button>
                `,
              )}
            `,
          )}
        </div>
        <div class="row">
          <ui-button size="small">Small</ui-button>
          <ui-button size="medium">Medium</ui-button>
          <ui-button size="large">Large</ui-button>
          <ui-button disabled>Disabled</ui-button>
          <ui-button
            appearance="primary"
            @click=${(event: Event) => {
              const btn = event.currentTarget as UiButton;
              setTimeout(() => {
                btn.loading = true;
                setTimeout(() => {
                  btn.loading = false;
                }, 1500);
              }, 200);
            }}
          >
            Click to load
          </ui-button>
          <ui-button appearance="primary" variant="outlined" type="submit">
            <svg
              slot="prefix"
              viewBox="0 0 16 16"
              width="1em"
              height="1em"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"
              />
            </svg>
            With icon
          </ui-button>
        </div>
        <div class="row">
          <ui-button full-width appearance="success"
            >Full-width button</ui-button
          >
        </div>
      </section>

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
        <div class="row">
          ${trigger("form")} ${trigger("formCritical")}
          <button class="demo-btn" @click=${() => void runWebAwesomeForm()}>
            WebAwesome Form
          </button>
        </div>
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
        <h2>Form retry with reject message</h2>
        <div class="row">
          <button class="demo-btn" @click=${() => void runLogin()}>
            Login (retry until password is "secret")
          </button>
        </div>
      </section>
    </div>
    <section class="results">
      <h2>Result log</h2>
      <pre id="log" aria-live="polite"></pre>
    </section>
  </main>

  <section class="data-navigator-section">
    <h2>Data navigator</h2>
    <ui-data-navigator
      title="Employees"
      subtitle="All employees across every department"
      selection-mode="multi"
      selection-appearance="primary"
      .columns=${employeeColumns}
      .data=${EMPLOYEES}
      .actions=${employeeActions}
      @row-selection-change=${(e: CustomEvent<{ selected: Employee[] }>) =>
        log(
          "Data navigator selection",
          e.detail.selected.map((employee) => employee.name),
        )}
    ></ui-data-navigator>
  </section>
`;

render(page, document.getElementById("app")!);
logEl = document.getElementById("log") as HTMLPreElement;
