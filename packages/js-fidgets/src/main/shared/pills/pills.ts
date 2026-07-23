// Shared multi-select "pill" behavior and markup — the removable tag row
// used by ui-combobox's and ui-select's `multiple` mode (and, eventually,
// ui-autocomplete's). Still Lit-coupled for now (renderPills returns a Lit
// template) rather than the framework-agnostic vanilla-core shape
// shared/popup-layout/popup-layout.ts ended up with — that's a deliberate
// next step, not this one.

import { html, nothing, css, type TemplateResult } from "lit";

export { renderPills, togglePillValue, removePillValue, buildMultiFormData, pillsStyles };

// Renders one pill per entry, each with its own remove button. Callers
// decide whether to call this at all (typically gated on their own
// `multiple`) — an empty `pills` array renders nothing on its own, same as
// omitting the call.
function renderPills(
  pills: readonly { value: string; label: string }[],
  onRemove: (value: string, event: Event) => void,
): TemplateResult | typeof nothing {
  if (pills.length === 0) return nothing;
  return html`${pills.map(
    (pill) => html`<span class="pill">
      <span class="pill-label">${pill.label}</span>
      <button
        type="button"
        class="pill-remove"
        aria-label="Remove ${pill.label}"
        @pointerdown=${(event: Event) => onRemove(pill.value, event)}
      >
        ×
      </button>
    </span>`,
  )}`;
}

// Add-or-remove membership — used when picking from the list (toggling a
// pick on/off), as opposed to removePillValue's unconditional removal (used
// by the pill's own remove button).
function togglePillValue(
  values: readonly string[],
  value: string,
): string[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

function removePillValue(values: readonly string[], value: string): string[] {
  return values.filter((v) => v !== value);
}

// One FormData entry per selected value, all under the same field `name` —
// the browser folds repeated entries into the parent form's submission the
// same way a native `<select multiple>` would.
function buildMultiFormData(name: string, values: readonly string[]): FormData {
  const formData = new FormData();
  for (const value of values) formData.append(name, value);
  return formData;
}

// The pill's own look — identical regardless of which element hosts it
// (ui-combobox's .wrapper, ui-select's .trigger). Whether that host needs
// extra start-padding once pills are present (:has(.pill)) is left to each
// component's own styles, since which element that is differs between them.
const pillsStyles = css`
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    background: var(--ui-color-neutral-200);
    color: var(--ui-color-neutral-800);
    border: 1px solid var(--ui-color-neutral-300);
    border-radius: 3px;
    padding-block: 2px;
    padding-inline-start: 6px;
    padding-inline-end: var(--ui-spacing-sm);
    font-size: var(--ui-font-size-sm);
    line-height: 1;
  }

  .pill-remove {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 1.6em;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    opacity: 0.7;
  }

  .pill-remove:hover {
    opacity: 1;
  }
`;
