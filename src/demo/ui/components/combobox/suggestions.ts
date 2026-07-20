// Headless suggestions core — framework-agnostic implementation.
// See suggestions-core.d.ts for the annotated contract.

export interface InputElementLike {
  value: string;
  addEventListener(type: string, listener: (e: Event) => void): void;
  removeEventListener(type: string, listener: (e: Event) => void): void;
}

export interface SuggestionResult<T> {
  groups: { label?: string; items: T[] }[];
  limitedTo?: number;
}

export type Row<T> =
  | { kind: 'separator'; label?: string }
  | { kind: 'item'; item: T; selectableIndex: number };

export type SelectionMode = 'none' | 'single' | 'multi';

export interface SuggestionState<T> {
  query: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  rows: Row<T>[];
  limitedTo?: number;
  activeIndex: number;
  open: boolean;
  selected: T[];
}

export interface SuggestionsHandle<T> {
  select(index: number): void;
  // Removes a specific item from `selected` regardless of whether it's currently
  // among the filtered/visible rows — e.g. a caller-rendered "remove" affordance for
  // an already-picked item (a multi-select pill) that isn't in the current results.
  deselect(item: T): void;
  moveActive(delta: number): void;
  open(): void;
  close(): void;
  destroy(): void;
}

export interface CreateSuggestionsParams<T> {
  input: InputElementLike;
  dataSource: (query: string, opts: { signal: AbortSignal }) => Promise<SuggestionResult<T>>;
  getKey?: (item: T) => string;
  selectionMode?: SelectionMode;
  onPick?: (item: T) => void;
  onSelectionChange?: (selected: T[]) => void;
  onSuggestionsChange: (state: SuggestionState<T>) => void;
  debounceMs?: number;
  minLength?: number;
}

export function createSuggestions<T>(params: CreateSuggestionsParams<T>): SuggestionsHandle<T> {
  const {
    input,
    dataSource,
    getKey,
    selectionMode = 'none',
    onPick,
    onSelectionChange,
    onSuggestionsChange,
    debounceMs = 200,
    minLength = 0,
  } = params;

  if (selectionMode !== 'none' && !getKey) {
    throw new Error(`createSuggestions: getKey is required when selectionMode is "${selectionMode}".`);
  }
  const keyOf = getKey ?? (() => '');

  // --- mutable state -----------------------------------------------------
  let query = '';
  let status: SuggestionState<T>['status'] = 'idle';
  let rows: Row<T>[] = [];
  let items: T[] = []; // selectable items, parallel to selectableIndex
  let limitedTo: number | undefined;
  let activeIndex = -1;
  let open = false;
  let selected: T[] = [];

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let seq = 0;

  // --- emit --------------------------------------------------------------
  function emit(): void {
    onSuggestionsChange({
      query,
      status,
      rows,
      limitedTo,
      activeIndex,
      open,
      selected: selected.slice(),
    });
  }

  // --- flatten groups into rows + selectable items -----------------------
  function flatten(result: SuggestionResult<T>): void {
    const groups = result.groups.filter((g) => g.items.length > 0);
    const nextRows: Row<T>[] = [];
    const nextItems: T[] = [];
    const showSeparators = groups.length > 1 || (groups.length === 1 && !!groups[0].label);

    let idx = 0;
    for (const g of groups) {
      if (showSeparators) nextRows.push({ kind: 'separator', label: g.label });
      for (const item of g.items) {
        nextRows.push({ kind: 'item', item, selectableIndex: idx });
        nextItems.push(item);
        idx++;
      }
    }
    rows = nextRows;
    items = nextItems;
    limitedTo = result.limitedTo;
  }

  // --- querying (debounced + abortable) ----------------------------------
  function runQuery(text: string): void {
    controller?.abort();
    const mySeq = ++seq;
    controller = new AbortController();
    status = 'loading';
    activeIndex = -1;
    open = true;
    emit();

    dataSource(text, { signal: controller.signal })
      .then((result) => {
        if (mySeq !== seq) return; // stale
        flatten(result);
        status = 'ready';
        emit();
      })
      .catch((err) => {
        if (mySeq !== seq) return;
        if (err?.name === 'AbortError') return;
        rows = [];
        items = [];
        limitedTo = undefined;
        status = 'error';
        emit();
      });
  }

  function onQueryText(text: string): void {
    query = text;
    if (debounceTimer) clearTimeout(debounceTimer);

    if (text.length < minLength) {
      controller?.abort();
      seq++; // invalidate any in-flight
      rows = [];
      items = [];
      limitedTo = undefined;
      status = 'idle';
      activeIndex = -1;
      open = false;
      emit();
      return;
    }
    debounceTimer = setTimeout(() => runQuery(text), debounceMs);
  }

  // --- selection ---------------------------------------------------------
  function isSelected(item: T): boolean {
    const k = keyOf(item);
    return selected.some((s) => keyOf(s) === k);
  }

  function doSelect(index: number): void {
    const item = items[index];
    if (item === undefined) return;

    onPick?.(item);

    if (selectionMode === 'none') return;

    if (selectionMode === 'single') {
      selected = [item];
      onSelectionChange?.(selected.slice());
      open = false;
      emit();
      return;
    }

    // multi: toggle, keep open
    const k = keyOf(item);
    selected = isSelected(item) ? selected.filter((s) => keyOf(s) !== k) : [...selected, item];
    onSelectionChange?.(selected.slice());
    emit();
  }

  function doDeselect(item: T): void {
    if (!isSelected(item)) return;
    const k = keyOf(item);
    selected = selected.filter((s) => keyOf(s) !== k);
    onSelectionChange?.(selected.slice());
    emit();
  }

  // --- active navigation -------------------------------------------------
  const PAGE_SIZE = 10;

  function move(delta: number): void {
    const count = items.length;
    if (count === 0) return;
    if (!open) {
      open = true;
      // Reopening after a pick (e.g. single-select closes on select but leaves
      // activeIndex pointing at what was just picked): keep that position instead
      // of jumping back to the first/last item, as long as it's still a valid
      // index into the current (unchanged since the pick) items array.
      if (activeIndex < 0 || activeIndex >= count) {
        activeIndex = delta > 0 ? 0 : count - 1;
      }
      emit();
      return;
    }
    let next = activeIndex + delta;
    if (next < 0) next = 0;
    if (next > count - 1) next = count - 1;
    activeIndex = next;
    emit();
  }

  function setActiveEnd(which: 'home' | 'end'): void {
    const count = items.length;
    if (count === 0) return;
    open = true;
    activeIndex = which === 'home' ? 0 : count - 1;
    emit();
  }

  function openList(): void {
    if (open) return;
    open = true;
    emit();
  }
  function closeList(): void {
    if (!open) return;
    open = false;
    activeIndex = -1;
    emit();
  }

  // --- DOM event listeners ----------------------------------------------
  const onInputEvent = (): void => onQueryText(input.value);

  // Reopens an already-loaded list on refocus without re-querying. But if
  // nothing has ever been queried yet (status is still the initial 'idle'),
  // there's no cached list to reopen — so a combobox used purely as a
  // dropdown-list (click it, see every option, no typing required) would never
  // show anything on that very first focus. Running an empty query right away
  // covers that — deliberately '' rather than the input's current text, since
  // a dropdown-style combobox's input is often pre-filled with the already
  // -selected value (e.g. a page-size picker showing "10"), and that value
  // would otherwise act as an unwanted filter, hiding every other option on
  // first open. minLength (still checked by onQueryText) keeps this from
  // eagerly firing for a data source that genuinely needs typed input first
  // (e.g. a server-backed search that can't return "everything").
  const onFocus = (): void => {
    if (items.length > 0) {
      openList();
    } else if (status === 'idle') {
      onQueryText('');
    }
  };

  const onBlur = (): void => closeList();

  const onKeydown = (e: Event): void => {
    const ev = e as KeyboardEvent;
    switch (ev.key) {
      case 'ArrowDown':
        ev.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        ev.preventDefault();
        move(-1);
        break;
      case 'PageDown':
        ev.preventDefault();
        move(PAGE_SIZE);
        break;
      case 'PageUp':
        ev.preventDefault();
        move(-PAGE_SIZE);
        break;
      case 'Home':
        if (open) {
          ev.preventDefault();
          setActiveEnd('home');
        }
        break;
      case 'End':
        if (open) {
          ev.preventDefault();
          setActiveEnd('end');
        }
        break;
      case 'Enter':
        if (open && activeIndex >= 0) {
          ev.preventDefault();
          doSelect(activeIndex);
        }
        break;
      case 'Escape':
        if (open) {
          ev.preventDefault();
          closeList();
        }
        break;
      case 'Tab':
        closeList();
        break;
      default:
        break;
    }
  };

  input.addEventListener('input', onInputEvent);
  input.addEventListener('focus', onFocus);
  input.addEventListener('blur', onBlur);
  input.addEventListener('keydown', onKeydown);

  emit(); // initial idle state

  return {
    select: doSelect,
    deselect: doDeselect,
    moveActive: move,
    open: openList,
    close: closeList,
    destroy(): void {
      if (debounceTimer) clearTimeout(debounceTimer);
      controller?.abort();
      input.removeEventListener('input', onInputEvent);
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('keydown', onKeydown);
    },
  };
}