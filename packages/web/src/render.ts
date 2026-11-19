import type { UiText } from '@emperor/content';
import type { Screen } from './screen';

export function renderPlaceholder(text: UiText): string {
  return `<h1>${text.placeholderHeading}</h1><p>${text.placeholderBody}</p>`;
}

export type TitleImages = { palace: string; scroll: string };

export function renderTitleScreen(text: UiText, images: TitleImages): string {
  return `<div id="title-stage"><img id="title-palace" src="${images.palace}" alt="${text.titleImageAlt}"><div id="title-scroll"><img src="${images.scroll}" alt=""><h1>${text.gameTitle}</h1></div><button type="button" id="start">${text.startButton}</button></div>`;
}

export function renderGameScreen(text: UiText): string {
  return renderPlaceholder(text);
}

export function renderScreen(screen: Screen, text: UiText, images: TitleImages): string {
  return screen.screen === 'title' ? renderTitleScreen(text, images) : renderGameScreen(text);
}
