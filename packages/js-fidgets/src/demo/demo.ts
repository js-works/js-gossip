import { html, render } from "lit";

import { defaultTheme } from "../main/theming/theme.js";
import "../main/components/checkbox/checkbox.js";
import "../main/components/checkbox/checkbox-group.js";
import "../main/components/radio/radio-button.js";
import "../main/components/radio/radio-group.js";
import "../main/components/button/button.js";
import type { Button } from "../main/components/button/button.js";
import "../main/components/select/select.js";
import "../main/components/combobox/combobox.js";
import "../main/components/autocomplete/autocomplete.js";
import { localFilter } from "../main/components/autocomplete/autocomplete.js";
import type { AutocompleteItemGroup } from "../main/components/autocomplete/autocomplete.js";
import "../main/components/data-navigator/data-navigator.js";
import type {
  DataNavigatorAction,
  DataNavigatorColumn,
} from "../main/components/data-navigator/data-navigator.js";

// Adopts the library's own theme tokens (--ui-bg, --ui-text, --ui-color-*, ...)
// at the document level (see theme.ts's `:root` selector) so the demo page's own
// chrome — not just the components it hosts — tracks whichever theme is active.
document.adoptedStyleSheets = [
  ...document.adoptedStyleSheets,
  defaultTheme.styleSheet!,
];

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

// Sample data for the ui-combobox/ui-autocomplete demos below — grouped to show
// the labeled separators a group produces in the dropdown.
const FRUITS: AutocompleteItemGroup[] = [
  { label: "Citrus", items: ["Grapefruit", "Lemon", "Lime", "Orange"] },
  {
    label: "Berries",
    items: ["Blackberry", "Blueberry", "Raspberry", "Strawberry"],
  },
  {
    label: "Stone fruits",
    items: ["Apricot", "Cherry", "Nectarine", "Peach", "Plum"],
  },
  { label: "Melons", items: ["Melon", "Watermelon"] },
  {
    label: "Tropical",
    items: [
      "Avocado",
      "Banana",
      "Kiwi",
      "Mango",
      "Papaya",
      "Pineapple",
      "Pomegranate",
    ],
  },
  { label: "Other", items: ["Apple", "Grape", "Pear"] },
];

// Sample data for the ui-data-navigator demo below.
interface Employee {
  name: string;
  email: string;
  department: string;
  role: string;
}

const FIRST_NAMES = [
  "Jane",
  "John",
  "Alice",
  "Bob",
  "Carol",
  "David",
  "Eve",
  "Frank",
  "Grace",
  "Hank",
  "Ivy",
  "Jack",
  "Karen",
  "Liam",
  "Mia",
  "Noah",
  "Olivia",
  "Paul",
  "Quinn",
  "Rachel",
  "Sam",
  "Tina",
  "Uma",
  "Victor",
  "Wendy",
  "Xander",
  "Yara",
  "Zack",
];
const LAST_NAMES = [
  "Doe",
  "Smith",
  "Johnson",
  "Williams",
  "Martinez",
  "Brown",
  "Davis",
  "Miller",
  "Wilson",
  "Moore",
  "Taylor",
  "Anderson",
  "Thomas",
  "Jackson",
  "White",
  "Harris",
  "Martin",
  "Thompson",
  "Clark",
  "Lewis",
  "Walker",
  "Hall",
  "Allen",
  "Young",
  "King",
  "Wright",
  "Scott",
  "Green",
];
const DEPARTMENT_ROLES: Record<string, string[]> = {
  Engineering: [
    "Engineer",
    "Senior Engineer",
    "Junior Engineer",
    "Engineering Manager",
  ],
  Sales: ["Account Executive", "Sales Manager"],
  Support: ["Support Agent", "Support Lead"],
  Marketing: ["Marketing Lead", "Content Strategist", "Designer"],
};
const DEPARTMENTS = Object.keys(DEPARTMENT_ROLES);

// 123 rows — enough to exercise sorting/filtering/pagination realistically.
// Deterministic (no Math.random()) so the demo looks the same on every reload.
const EMPLOYEES: Employee[] = Array.from({ length: 123 }, (_, i) => {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const last =
    LAST_NAMES[(i + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length];
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
  <svg
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      d="M8 2a.75.75 0 0 1 .75.75V7.25h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2"
    />
  </svg>
`;

const pencilIcon = html`
  <svg
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zM12.793 5.5 10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"
    />
  </svg>
`;

const trashIcon = html`
  <svg
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"
    />
    <path
      fill-rule="evenodd"
      d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"
    />
  </svg>
`;

// Action callbacks just console.log — this demo has no shared result log anymore.
const employeeActions: DataNavigatorAction<Employee>[] = [
  {
    type: "general",
    label: "Add employee",
    icon: plusIcon,
    onClick: () => console.log("Add employee"),
  },
  {
    type: "single",
    label: "Edit",
    icon: pencilIcon,
    onClick: (selected) => console.log("Edit", selected[0].name),
  },
  {
    type: "multi",
    label: "Delete selected",
    icon: trashIcon,
    onClick: (selected) =>
      console.log(
        "Delete selected",
        selected.map((employee) => employee.name),
      ),
  },
];

function buttonsTab() {
  return html`
    <section class="button-showcase">
      <h2>Buttons</h2>
      <div class="button-grid">
        ${BUTTON_APPEARANCES.map(
          (appearance) => html`
            <span class="page-label">${appearance}</span>
            ${BUTTON_VARIANTS.map(
              (variant) => html`
                <ui-button appearance=${appearance} variant=${variant}>
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
            const btn = event.currentTarget as Button;
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
        <ui-button full-width appearance="success">Full-width button</ui-button>
      </div>
    </section>
  `;
}

function selectTab() {
  return html`
    <section>
      <h2>Select</h2>
      <div class="row">
        <ui-select placeholder="Choose a fruit…">
          <ui-option value="apple">Apple</ui-option>
          <ui-option value="banana">Banana</ui-option>
          <ui-option-group label="Citrus">
            <ui-option value="orange">Orange</ui-option>
            <ui-option value="lemon">Lemon</ui-option>
            <ui-option value="lime">Lime</ui-option>
          </ui-option-group>
          <ui-option value="grape" disabled>Grape (out of stock)</ui-option>
        </ui-select>
      </div>
      <div class="row">
        <ui-select size="small" placeholder="Small">
          <ui-option value="a">Option A</ui-option>
          <ui-option value="b">Option B</ui-option>
        </ui-select>
        <ui-select size="medium" placeholder="Medium">
          <ui-option value="a">Option A></button >
          </ui-option>
          <ui-option value="b">Option B</ui-option>
        </ui-select>
        <ui-select size="large" placeholder="Large">
          <ui-option value="a">Option A</ui-option>
          <ui-option value="b">Option B</ui-option>
        </ui-select>
        <ui-select disabled placeholder="Disabled">
          <ui-option value="a">Option A</ui-option>
        </ui-select>
      </div>
    </section>
  `;
}

function radioTab() {
  return html`
    <section>
      <h2>Radio group</h2>
      <div class="row">
        <ui-radio-group name="shipping" value="standard">
          <ui-radio-button value="standard"
            >Standard (5-7 days)</ui-radio-button
          >
          <ui-radio-button value="express">Express (2 days)</ui-radio-button>
          <ui-radio-button value="overnight">Overnight</ui-radio-button>
          <ui-radio-button value="pickup" disabled
            >Store pickup (unavailable)</ui-radio-button
          >
        </ui-radio-group>
      </div>
      <div class="row">
        <ui-radio-group orientation="horizontal" name="size" value="m">
          <ui-radio-button value="s">S</ui-radio-button>
          <ui-radio-button value="m">M</ui-radio-button>
          <ui-radio-button value="l">L</ui-radio-button>
          <ui-radio-button value="xl">XL</ui-radio-button>
        </ui-radio-group>
      </div>
      <div class="row">
        <ui-radio-group disabled name="disabled-example" value="one">
          <ui-radio-button value="one">One</ui-radio-button>
          <ui-radio-button value="two">Two</ui-radio-button>
        </ui-radio-group>
      </div>
    </section>
  `;
}

function checkboxTab() {
  return html`
    <section>
      <h2>Checkbox group</h2>
      <div class="row">
        <ui-checkbox-group name="toppings" required>
          <ui-checkbox value="cheese">Cheese</ui-checkbox>
          <ui-checkbox value="pepperoni">Pepperoni</ui-checkbox>
          <ui-checkbox value="mushrooms">Mushrooms</ui-checkbox>
          <ui-checkbox value="olives" disabled>Olives (sold out)</ui-checkbox>
        </ui-checkbox-group>
      </div>
      <div class="row">
        <ui-checkbox-group orientation="horizontal" .values=${["a", "c"]}>
          <ui-checkbox value="a">A</ui-checkbox>
          <ui-checkbox value="b">B</ui-checkbox>
          <ui-checkbox value="c">C</ui-checkbox>
        </ui-checkbox-group>
      </div>
      <div class="row">
        <ui-checkbox-group disabled>
          <ui-checkbox value="x">X</ui-checkbox>
          <ui-checkbox value="y">Y</ui-checkbox>
        </ui-checkbox-group>
      </div>
    </section>
  `;
}

// Renders FRUITS as real <ui-option>/<ui-option-group> children — each call
// produces a fresh set of elements, so it's safe to use once per <ui-combobox>
// below rather than sharing a single set of slotted nodes across two hosts.
const fruitOptions = () =>
  FRUITS.map(
    (group) => html`
      <ui-option-group label=${group.label ?? ""}>
        ${group.items.map(
          (item) =>
            html`<ui-option value=${item.toLowerCase()}>${item}</ui-option>`,
        )}
      </ui-option-group>
    `,
  );

function comboboxTab() {
  return html`
    <section>
      <h2>Combobox</h2>
      <div class="row">
        <ui-combobox class="combobox-demo" placeholder="Search fruits…">
          ${fruitOptions()}
        </ui-combobox>
      </div>
      <div class="row">
        <ui-combobox
          class="combobox-demo"
          multiple
          placeholder="Search fruits…"
        >
          ${fruitOptions()}
        </ui-combobox>
      </div>
    </section>
  `;
}

function autocompleteTab() {
  return html`
    <section>
      <h2>Autocomplete</h2>
      <div class="row">
        <ui-autocomplete
          class="combobox-demo"
          placeholder="Search fruits…"
          .dataSource=${localFilter(FRUITS, 1000)}
        ></ui-autocomplete>
      </div>
    </section>
  `;
}

function dataNavigatorTab() {
  return html`
    <section>
      <h2>Data navigator</h2>
      <ui-data-navigator
        title="Employees"
        subtitle="All employees across every department"
        selection-mode="multi"
        selection-appearance="primary"
        .columns=${employeeColumns}
        .data=${EMPLOYEES}
        .actions=${employeeActions}
      ></ui-data-navigator>
    </section>
  `;
}

// -------------------------------------------------------------------
// Tabs — each subdemo lives on its own page, switched via the vertical tab
// list rendered alongside the content (see renderApp() below).
// -------------------------------------------------------------------

interface Tab {
  id: string;
  label: string;
  content: () => unknown;
}

const tabs: Tab[] = [
  { id: "buttons", label: "Buttons", content: buttonsTab },
  { id: "select", label: "Select", content: selectTab },
  { id: "combobox", label: "Combobox", content: comboboxTab },
  { id: "autocomplete", label: "Autocomplete", content: autocompleteTab },
  { id: "radio", label: "Radio group", content: radioTab },
  { id: "checkbox", label: "Checkbox group", content: checkboxTab },
  { id: "data-navigator", label: "Data navigator", content: dataNavigatorTab },
];

// The active tab is driven by the URL hash (e.g. #combobox) rather than local
// state, so a reload — or a shared/bookmarked link — lands back on the same
// tab instead of always resetting to the first one.
function readTabFromHash(): string {
  const id = location.hash.slice(1);
  return tabs.some((tab) => tab.id === id) ? id : tabs[0].id;
}

let activeTabId: string = readTabFromHash();

function activateTab(id: string): void {
  location.hash = id;
}

window.addEventListener("hashchange", () => {
  activeTabId = readTabFromHash();
  renderApp();
});

function renderApp(): void {
  const activeTab = tabs.find((tab) => tab.id === activeTabId)!;
  render(
    html`
      <main class="page">
        <nav class="tab-nav" aria-orientation="vertical" role="tablist">
          ${tabs.map(
            (tab) => html`
              <button
                class="tab-btn"
                role="tab"
                aria-selected=${tab.id === activeTab.id ? "true" : "false"}
                @click=${() => activateTab(tab.id)}
              >
                ${tab.label}
              </button>
            `,
          )}
        </nav>
        <div class="tab-content" role="tabpanel">${activeTab.content()}</div>
      </main>
    `,
    document.getElementById("app")!,
  );
}

renderApp();
