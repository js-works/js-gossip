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
import "../main/components/ag-grid/ag-grid.js";
import type {
  AgGridAction,
  AgGridColumn,
  AgGridColumnFilter,
  AgGridDataSource,
} from "../main/components/ag-grid/ag-grid.js";
import "../main/components/text-field/text-field.js";
import "../main/components/number-field/number-field.js";
import "../main/components/password-field/password-field.js";
import "../main/components/email-field/email-field.js";
import "../main/components/date-field/date-field.js";
import "../main/components/native-date-field/native-date-field.js";
import "../main/components/upload/upload.js";
import type {
  Upload,
  UploadFileRejectDetail,
  UploadRequestDetail,
} from "../main/components/upload/upload.js";

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

// Every distinct department, computed once from the full in-memory dataset.
// The "select" filter's dropdown needs this list, but employeeGridDataSource
// (below) only ever sees the one page it was asked for — never the full
// dataset — so unlike ui-data-navigator's columns above, this can't be
// derived on the fly from `data` the way AgGridColumn.filter's default
// behavior does; hence `selectOptions` below.
const employeeDepartmentOptions = [
  ...new Set(EMPLOYEES.map((employee) => employee.department)),
].sort();

// Sample columns for the ui-ag-grid demo below — same Employee rows as
// ui-data-navigator's demo above, but flat (ui-ag-grid doesn't support
// grouped column headers yet). "Name"/"Email"/"Role" get the plain text
// floating filter (a ui-text-field); "Department" gets the "select" dropdown
// instead, since it's really a small fixed set of values rather than free
// text.
const employeeGridColumns: AgGridColumn<Employee>[] = [
  { field: "name", header: "Name", filter: true },
  { field: "email", header: "Email", width: 260, filter: true },
  {
    field: "department",
    header: "Department",
    filter: "select",
    selectOptions: employeeDepartmentOptions,
  },
  { field: "role", header: "Role", filter: true },
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

// Same actions as ui-data-navigator's demo above, for ui-ag-grid — reads
// selection off AG Grid's own selection state (see ui-ag-grid's
// `selectionSnapshot`/`selectedRows`) rather than TanStack's.
const employeeGridActions: AgGridAction<Employee>[] = [
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

// Simulates a real server endpoint for ui-ag-grid's own `dataSource` — every
// sort and page change re-invokes this (not just the initial load), each one
// taking a simulated 1000ms round trip, so the grid genuinely waits on a
// "request" for every interaction rather than just the first render.
// Filtering/sorting/pagination all happen here, against the same in-memory
// EMPLOYEES array a real server would instead run against a database — see
// AgGridDataSource's own doc for why this switches ui-ag-grid onto AG Grid's
// Infinite Row Model instead of its Client-Side Row Model.
const employeeGridDataSource: AgGridDataSource<Employee> = ({
  startRow,
  endRow,
  sort,
  filters,
  signal,
}) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      let rows = EMPLOYEES.slice();

      for (const [field, filter] of Object.entries(filters) as [
        keyof Employee & string,
        AgGridColumnFilter,
      ][]) {
        rows =
          "values" in filter
            ? rows.filter((row) => filter.values.includes(String(row[field])))
            : rows.filter((row) =>
                String(row[field])
                  .toLowerCase()
                  .includes(filter.value.toLowerCase()),
              );
      }

      for (const { field, direction } of sort.slice().reverse()) {
        rows.sort((a, b) => {
          const cmp = String(a[field]).localeCompare(String(b[field]));
          return direction === "desc" ? -cmp : cmp;
        });
      }

      resolve({ rows: rows.slice(startRow, endRow), rowCount: rows.length });
    }, 1000);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

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
        <ui-select label="Fruit">
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
        <ui-select size="small" label="Small">
          <ui-option value="a">Option A</ui-option>
          <ui-option value="b">Option B</ui-option>
        </ui-select>
        <ui-select size="medium" label="Medium">
          <ui-option value="a">Option A</ui-option>
          <ui-option value="b">Option B</ui-option>
        </ui-select>
        <ui-select size="large" label="Large">
          <ui-option value="a">Option A</ui-option>
          <ui-option value="b">Option B</ui-option>
        </ui-select>
        <ui-select disabled label="Disabled">
          <ui-option value="a">Option A</ui-option>
        </ui-select>
      </div>
      <div class="row">
        <ui-select
          multiple
          max-options-visible="2"
          label="Fruits"
        >
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
        <ui-select
          multiple
          multiple-value-display="text"
          label="Fruits (text display)"
        >
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

function textFieldTab() {
  return html`
    <section>
      <h2>Text field</h2>
      <div class="row">
        <ui-text-field label="Full name"></ui-text-field>
      </div>
      <div class="row">
        <ui-text-field size="small" label="Small"></ui-text-field>
        <ui-text-field size="medium" label="Medium"></ui-text-field>
        <ui-text-field size="large" label="Large"></ui-text-field>
        <ui-text-field disabled label="Disabled"></ui-text-field>
      </div>
      <div class="row">
        <ui-text-field
          required
          minlength="3"
          maxlength="20"
          label="Username"
          placeholder="3-20 characters"
        ></ui-text-field>
      </div>
    </section>
  `;
}

function numberFieldTab() {
  return html`
    <section>
      <h2>Number field</h2>
      <div class="row">
        <ui-number-field label="Quantity"></ui-number-field>
      </div>
      <div class="row">
        <ui-number-field size="small" label="Small"></ui-number-field>
        <ui-number-field size="medium" label="Medium"></ui-number-field>
        <ui-number-field size="large" label="Large"></ui-number-field>
        <ui-number-field disabled label="Disabled"></ui-number-field>
      </div>
      <div class="row">
        <ui-number-field
          required
          min="0"
          max="10"
          step="1"
          label="Amount"
          placeholder="0 to 10"
        ></ui-number-field>
      </div>
    </section>
  `;
}

function passwordFieldTab() {
  return html`
    <section>
      <h2>Password field</h2>
      <div class="row">
        <ui-password-field label="Password"></ui-password-field>
      </div>
      <div class="row">
        <ui-password-field size="small" label="Small"></ui-password-field>
        <ui-password-field size="medium" label="Medium"></ui-password-field>
        <ui-password-field size="large" label="Large"></ui-password-field>
        <ui-password-field disabled label="Disabled"></ui-password-field>
      </div>
      <div class="row">
        <ui-password-field
          required
          minlength="8"
          label="Password"
          placeholder="At least 8 characters"
        ></ui-password-field>
      </div>
    </section>
  `;
}

function emailFieldTab() {
  return html`
    <section>
      <h2>Email field</h2>
      <div class="row">
        <ui-email-field label="Email address" placeholder="you@example.com"></ui-email-field>
      </div>
      <div class="row">
        <ui-email-field size="small" label="Small"></ui-email-field>
        <ui-email-field size="medium" label="Medium"></ui-email-field>
        <ui-email-field size="large" label="Large"></ui-email-field>
        <ui-email-field disabled label="Disabled"></ui-email-field>
      </div>
      <div class="row">
        <ui-email-field required label="Email address"></ui-email-field>
      </div>
    </section>
  `;
}

function dateFieldTab() {
  return html`
    <section>
      <h2>Date field</h2>
      <p>Custom calendar popup, built on vanillajs-datepicker.</p>
      <div class="row">
        <ui-date-field label="Date"></ui-date-field>
      </div>
      <div class="row">
        <ui-date-field size="small" label="Small"></ui-date-field>
        <ui-date-field size="medium" label="Medium"></ui-date-field>
        <ui-date-field size="large" label="Large"></ui-date-field>
        <ui-date-field disabled label="Disabled"></ui-date-field>
      </div>
      <div class="row">
        <ui-date-field
          required
          min="2026-01-01"
          max="2026-12-31"
          label="Date of birth"
        ></ui-date-field>
      </div>
    </section>
  `;
}

function nativeDateFieldTab() {
  return html`
    <section>
      <h2>Native date field</h2>
      <p>Thin themed wrapper around the browser's own native date picker.</p>
      <div class="row">
        <ui-native-date-field label="Date"></ui-native-date-field>
      </div>
      <div class="row">
        <ui-native-date-field
          type="datetime-local"
          label="Date & time"
        ></ui-native-date-field>
      </div>
      <div class="row">
        <ui-native-date-field size="small" label="Small"></ui-native-date-field>
        <ui-native-date-field size="medium" label="Medium"></ui-native-date-field>
        <ui-native-date-field size="large" label="Large"></ui-native-date-field>
        <ui-native-date-field disabled label="Disabled"></ui-native-date-field>
      </div>
      <div class="row">
        <ui-native-date-field
          required
          min="2026-01-01"
          max="2026-12-31"
          label="Date of birth"
        ></ui-native-date-field>
      </div>
    </section>
  `;
}

// Fakes an upload for the ui-upload demos below: whenever the component fires
// upload-request (immediately per file in auto mode, or on demand — a row's
// own Start/Retry button or "Upload all" — in manual mode), ramps that file's
// progress up over ~1.5s, then marks it done. A real integration would drive
// setFileProgress from an actual fetch/XHR upload-progress handler instead —
// ui-upload itself never touches the network, it only tells the caller when
// to start.
function simulateUpload(event: CustomEvent<UploadRequestDetail>) {
  const upload = event.currentTarget as Upload;
  const { file } = event.detail;

  let progress = 0;
  const timer = setInterval(() => {
    progress = Math.min(100, progress + 20);
    upload.setFileProgress(file, progress);
    if (progress >= 100) {
      clearInterval(timer);
      upload.setFileDone(file);
    }
  }, 300);
}

function uploadTab() {
  return html`
    <section>
      <h2>Upload</h2>
      <p>
        Files ride along in the enclosing form's <code>FormData</code>, same
        as a native <code>&lt;input type="file"&gt;</code> — no network calls
        happen inside the component itself.
        <code>setFileProgress</code>/<code>setFileDone</code>/<code
          >setFileError</code
        >
        let a caller running its own upload drive the progress UI per file,
        started via the <code>upload-request</code> event (simulated below).
      </p>
      <p>
        Auto-start (default): each file fires <code>upload-request</code> as
        soon as it's added.
      </p>
      <div class="row">
        <ui-upload
          name="attachments"
          multiple
          accept="image/*,.pdf"
          max-files="5"
          max-file-size="5242880"
          @upload-request=${simulateUpload}
          @file-reject=${(event: CustomEvent<UploadFileRejectDetail>) =>
            console.log(
              "Rejected:",
              event.detail.file.name,
              event.detail.reason,
            )}
        ></ui-upload>
      </div>
      <p>
        Manual: files wait until Start/Retry (per row) or "Upload all" is
        clicked.
      </p>
      <div class="row">
        <ui-upload
          name="manual-attachments"
          multiple
          manual
          @upload-request=${simulateUpload}
        ></ui-upload>
      </div>
      <div class="row">
        <ui-upload name="single-file"></ui-upload>
      </div>
      <div class="row">
        <ui-upload size="small" name="small"></ui-upload>
        <ui-upload size="medium" name="medium"></ui-upload>
        <ui-upload size="large" name="large"></ui-upload>
        <ui-upload disabled name="disabled"></ui-upload>
      </div>
      <div class="row">
        <ui-upload required name="required"></ui-upload>
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
        <ui-combobox class="combobox-demo" label="Fruit">
          ${fruitOptions()}
        </ui-combobox>
      </div>
      <div class="row">
        <ui-combobox class="combobox-demo" size="small" label="Small">
          ${fruitOptions()}
        </ui-combobox>
        <ui-combobox class="combobox-demo" size="medium" label="Medium">
          ${fruitOptions()}
        </ui-combobox>
        <ui-combobox class="combobox-demo" size="large" label="Large">
          ${fruitOptions()}
        </ui-combobox>
      </div>
      <div class="row">
        <ui-combobox class="combobox-demo" multiple label="Fruits">
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
          label="Fruit"
          placeholder="Search fruits…"
          .dataSource=${localFilter(FRUITS, 1000)}
        ></ui-autocomplete>
      </div>
      <div class="row">
        <ui-autocomplete
          class="combobox-demo"
          size="small"
          label="Small"
          .dataSource=${localFilter(FRUITS, 1000)}
        ></ui-autocomplete>
        <ui-autocomplete
          class="combobox-demo"
          size="medium"
          label="Medium"
          .dataSource=${localFilter(FRUITS, 1000)}
        ></ui-autocomplete>
        <ui-autocomplete
          class="combobox-demo"
          size="large"
          label="Large"
          .dataSource=${localFilter(FRUITS, 1000)}
        ></ui-autocomplete>
      </div>
      <div class="row">
        <ui-autocomplete
          class="combobox-demo"
          multiple
          label="Fruits"
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

function agGridTab() {
  return html`
    <section>
      <h2>AG Grid</h2>
      <ui-ag-grid
        title="Employees"
        subtitle="All employees across every department"
        .columns=${employeeGridColumns}
        .dataSource=${employeeGridDataSource}
        .actions=${employeeGridActions}
        page-size="10"
        selection-mode="multi"
        selection-appearance="neutral"
        @row-selection-change=${(event: CustomEvent<{ selected: Employee[] }>) =>
          console.log(
            "Selected:",
            event.detail.selected.map((employee) => employee.name),
          )}
      ></ui-ag-grid>
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
  { id: "text-field", label: "Text field", content: textFieldTab },
  { id: "number-field", label: "Number field", content: numberFieldTab },
  { id: "password-field", label: "Password field", content: passwordFieldTab },
  { id: "email-field", label: "Email field", content: emailFieldTab },
  { id: "date-field", label: "Date field", content: dateFieldTab },
  {
    id: "native-date-field",
    label: "Native date field",
    content: nativeDateFieldTab,
  },
  { id: "data-navigator", label: "Data navigator", content: dataNavigatorTab },
  { id: "ag-grid", label: "AG Grid", content: agGridTab },
  { id: "upload", label: "Upload", content: uploadTab },
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
