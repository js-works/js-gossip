// Shared by ui-select, ui-combobox, and ui-autocomplete: flips a popup above its
// anchor when there isn't enough room below for it but there is more room above
// than below. Each caller still owns *when* to recompute (typically on open, or
// when the popup's content/size changes) — this is just the placement math.
export function computeFlipPlacement(
  hostRect: DOMRect,
  popupHeight: number,
): "top" | "bottom" {
  const spaceBelow = window.innerHeight - hostRect.bottom;
  const spaceAbove = hostRect.top;

  return popupHeight > spaceBelow && spaceAbove > spaceBelow ? "top" : "bottom";
}
