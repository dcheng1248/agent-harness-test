import type { UiText } from '@emperor/content';

export function renderPlaceholder(text: UiText): string {
  return `<h1>${text.placeholderHeading}</h1><p>${text.placeholderBody}</p>`;
}
