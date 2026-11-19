import { describe, expect, it } from 'vitest';
import { uiText } from '@emperor/content';
import { renderGameScreen, renderPlaceholder, renderTitleScreen } from './render';

describe('web skeleton', () => {
  it('renders the placeholder heading', () => {
    expect(renderPlaceholder(uiText)).toContain(`<h1>${uiText.placeholderHeading}</h1>`);
  });
});

const images = { palace: '/img/palace.webp', scroll: '/img/scroll.webp' };

describe('title screen', () => {
  it('UC-WEB-001 renders the palace image with the title on a decorative scroll', () => {
    const html = renderTitleScreen(uiText, images);
    expect(html).toContain(`<img id="title-palace" src="/img/palace.webp" alt="${uiText.titleImageAlt}">`);
    expect(html).toContain(`<div id="title-scroll"><img src="/img/scroll.webp" alt=""><h1>${uiText.gameTitle}</h1></div>`);
    expect(html.startsWith('<div id="title-stage">')).toBe(true);
    expect(html.endsWith('</div>')).toBe(true);
  });
});

describe('start flow', () => {
  it('UC-WEB-002 title screen has the start button inside the image stage', () => {
    const html = renderTitleScreen(uiText, images);
    expect(html).toContain(`<button type="button" id="start">${uiText.startButton}</button></div>`);
  });

  it('UC-WEB-002 game screen shows the placeholder heading and body', () => {
    const html = renderGameScreen(uiText);
    expect(html).toContain(`<h1>${uiText.placeholderHeading}</h1>`);
    expect(html).toContain(`<p>${uiText.placeholderBody}</p>`);
  });
});
