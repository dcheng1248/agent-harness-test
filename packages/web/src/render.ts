import type { UiText } from '@emperor/content';
import type { Screen } from './screen';

export function renderPlaceholder(text: UiText): string {
  return `<h1>${text.placeholderHeading}</h1><p>${text.placeholderBody}</p>`;
}

export function renderTitleScreen(text: UiText, imageUrl: string): string {
  return `<h1>${text.gameTitle}</h1><img src="${imageUrl}" alt="${text.titleImageAlt}"><button type="button" id="start">${text.startButton}</button>`;
}

export function renderGameScreen(text: UiText): string {
  return renderPlaceholder(text);
}

export function renderScreen(screen: Screen, text: UiText, imageUrl: string): string {
  return screen.screen === 'title' ? renderTitleScreen(text, imageUrl) : renderGameScreen(text);
}
