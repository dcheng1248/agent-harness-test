import type { UiText } from '@emperor/content';

export function renderPlaceholder(text: UiText): string {
  return `<h1>${text.placeholderHeading}</h1><p>${text.placeholderBody}</p>`;
}

export function renderTitleScreen(text: UiText, imageUrl: string): string {
  return `<h1>${text.gameTitle}</h1><img src="${imageUrl}" alt="${text.titleImageAlt}">`;
}
