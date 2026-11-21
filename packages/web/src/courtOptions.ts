export interface Span {
  left: number;
  right: number;
}

export interface CourtOptionsPlacement {
  left: number;
  caretX: number;
}

/** All inputs are viewport pixels. `image.right` is unused: the list's right edge is the button's, inside the image. */
export function placeCourtOptions(row: Span, button: Span, image: Span, listWidth: number): CourtOptionsPlacement {
  const outerLeft = Math.max(button.right - listWidth, image.left);
  return { left: outerLeft - row.left, caretX: (button.left + button.right) / 2 - outerLeft };
}
