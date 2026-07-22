// Vanilla-JS, framework-agnostic tracker for a popup anchored to a host
// element: decides which side (top/bottom) it renders on and how tall it can
// be, and keeps both live as the viewport changes — not just once when the
// popup opens, but continuously while it stays open (window resize, page
// scroll on any scrollable ancestor). Originally split out of
// ui-autocomplete's core; see its header comment for why this is
// measured-rects JS rather than CSS anchor positioning (position-try-order:
// most-height proved unreliable in real-world testing).

export { computeFlipPlacement, trackPopupLayout };

// Flips a popup above its anchor when there isn't enough room below for it
// but there is more room above than below. Exported standalone too — used
// directly (without the rest of trackPopupLayout below) by ui-select and
// ui-combobox, whose simpler fixed-max-height popups only need the one-shot
// placement decision, not continuous shrinking.
function computeFlipPlacement(
  hostRect: DOMRect,
  popupHeight: number,
): "top" | "bottom" {
  const spaceBelow = window.innerHeight - hostRect.bottom;
  const spaceAbove = hostRect.top;

  return popupHeight > spaceBelow && spaceAbove > spaceBelow ? "top" : "bottom";
}

interface TrackPopupLayoutConfig {
  // The element the popup is positioned relative to.
  getHostElement: () => HTMLElement | null;
  // The popup element itself. Its `style` attribute is fully owned by this
  // tracker while it's being managed (see MANAGED_PROPERTIES below) — the
  // caller must not bind its own `style="..."` string onto the same element
  // (a Lit `styleMap` binding for unrelated properties is fine, since that
  // patches individual properties rather than replacing the whole attribute).
  getPopupElement: () => HTMLElement | null;
  // General cap on the popup's height, in pixels, before shrinking for
  // available space. Defaults to 288 (18em at the default 16px root
  // font-size).
  maxHeightPx?: number;
  // Gap kept between the popup and the host, and reused as a small buffer
  // between the popup and the viewport edge on its far side. Defaults to 2.
  gapPx?: number;
}

interface PopupLayoutHandle {
  // Recomputes immediately — call this whenever the caller has a reason to
  // believe layout may be stale (typically: the popup just opened, or its
  // content changed enough that its natural size might have too).
  update(): void;
  // Restores the popup element's `style` attribute to whatever it was before
  // this tracker ever touched it (see MANAGED_PROPERTIES/claim() below).
  destroy(): void;
}

// Every inline style property this tracker owns while it's managing an
// element — kept as one list so claim()/release() (the snapshot/restore
// pair) can't drift out of sync with what update() actually writes.
const MANAGED_PROPERTIES = [
  "position",
  "inset-inline",
  "z-index",
  "display",
  "flex-direction",
  "overflow",
  "box-sizing",
  "max-height",
  "top",
  "bottom",
];

function trackPopupLayout(config: TrackPopupLayoutConfig): PopupLayoutHandle {
  const maxHeightCap = config.maxHeightPx ?? 288;
  const gapPx = config.gapPx ?? 2;

  let placement: "top" | "bottom" = "bottom";
  let maxHeightPx = maxHeightCap;
  // Whether the popup currently has this tracker's full layout (including
  // `display`) applied. Cleared whenever the popup goes `hidden` (see
  // update() below) so re-showing it always reapplies from scratch — not
  // just when placement/maxHeightPx happen to differ from last time, which
  // wouldn't otherwise be true right after a hidden->visible flip.
  let domVisible = false;
  // The popup's pre-existing inline style values for MANAGED_PROPERTIES,
  // captured the first time this tracker actually writes to it — so
  // destroy() can hand the element back in whatever state the caller left
  // it, rather than permanently claiming those properties. `undefined` means
  // "not claimed yet" (as opposed to an empty Map, which would mean "claimed
  // an element with none of these properties set").
  let claimedFrom: HTMLElement | undefined;
  let snapshot: Map<string, string> | undefined;

  function claim(popup: HTMLElement): void {
    if (claimedFrom === popup) return;
    snapshot = new Map(
      MANAGED_PROPERTIES.map((name) => [
        name,
        popup.style.getPropertyValue(name),
      ]),
    );
    claimedFrom = popup;
  }

  function release(): void {
    if (!claimedFrom || !snapshot) return;
    for (const [name, value] of snapshot) {
      if (value) {
        claimedFrom.style.setProperty(name, value);
      } else {
        claimedFrom.style.removeProperty(name);
      }
    }
    claimedFrom = undefined;
    snapshot = undefined;
  }

  function apply(popup: HTMLElement): void {
    popup.style.setProperty("position", "absolute");
    popup.style.setProperty("inset-inline", "0");
    popup.style.setProperty("z-index", "1");
    popup.style.setProperty("display", "flex");
    popup.style.setProperty("flex-direction", "column");
    popup.style.setProperty("overflow", "hidden");
    popup.style.setProperty("box-sizing", "border-box");
    popup.style.setProperty("max-height", `${maxHeightPx}px`);
    if (placement === "bottom") {
      popup.style.setProperty("top", `calc(100% + ${gapPx}px)`);
      popup.style.removeProperty("bottom");
    } else {
      popup.style.setProperty("bottom", `calc(100% + ${gapPx}px)`);
      popup.style.removeProperty("top");
    }
  }

  function update(): void {
    const host = config.getHostElement();
    const popup = config.getPopupElement();
    if (!host || !popup) return;
    // A caller's own hidden-while-loading state (e.g. `hidden` bound to
    // something narrower than "the popup is conceptually open") takes
    // priority over this tracker's own `display: flex`. An inline `display`
    // always beats the `[hidden]` UA rule's `display: none` (inline style
    // wins over any stylesheet rule of any specificity, no matter when it was
    // set) — so once applied, it has to be actively released here whenever
    // the popup goes hidden, or every future hide would be silently defeated
    // by the leftover inline value. `hidden` is used as the sole
    // visible/not-visible signal (rather than a separate open flag from the
    // caller) since it's the one ground truth guaranteed to be current at the
    // moment this runs.
    if (popup.hidden) {
      if (domVisible) {
        popup.style.removeProperty("display");
        domVisible = false;
      }
      return;
    }

    const hostRect = host.getBoundingClientRect();
    const spaceBelow = window.innerHeight - hostRect.bottom - gapPx;
    const spaceAbove = hostRect.top - gapPx;
    // Compared against the general cap, not the popup's own current
    // offsetHeight — that's already clamped to whatever maxHeightPx a
    // *previous* call here landed on, which would make this comparison
    // self-referential (e.g. once shrunk to fit below, it'd measure as
    // "fitting" below forever after, never reconsidering whether above has
    // more room now). The question this needs to answer is always "would a
    // full-size popup fit here", not "does the already-compromised one".
    const nextPlacement = computeFlipPlacement(hostRect, maxHeightCap);
    const available = nextPlacement === "top" ? spaceAbove : spaceBelow;
    const nextMaxHeightPx = Math.max(0, Math.min(maxHeightCap, available));

    if (
      !domVisible ||
      nextPlacement !== placement ||
      nextMaxHeightPx !== maxHeightPx
    ) {
      placement = nextPlacement;
      maxHeightPx = nextMaxHeightPx;
      domVisible = true;
      claim(popup);
      apply(popup);
    }
  }

  // Whatever triggers `update()` on open (the caller, typically right after
  // a render where its own open state just changed) only covers that one
  // moment — a window resize or the page scrolling while the popup stays
  // open changes neither, so without these it would stay stuck at whatever
  // placement/height it last computed instead of continuing to track the
  // host live.
  const onWindowResize = (): void => update();
  const onWindowScroll = (): void => update();
  window.addEventListener("resize", onWindowResize);
  // capture: true so this also fires for scroll on any scrollable ancestor,
  // not just the window itself.
  window.addEventListener("scroll", onWindowScroll, {
    capture: true,
    passive: true,
  });

  return {
    update,
    destroy() {
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("scroll", onWindowScroll, { capture: true });
      release();
    },
  };
}
