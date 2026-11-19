import { describe, expect, it } from 'vitest';
import { uiText } from '@emperor/content';
import { renderPlaceholder, renderTitleScreen } from './render';

describe('web skeleton', () => {
  it('renders the placeholder heading', () => {
    expect(renderPlaceholder(uiText)).toContain(`<h1>${uiText.placeholderHeading}</h1>`);
  });
});

describe('title screen', () => {
  it('UC-WEB-001 renders the title heading and image', () => {
    const html = renderTitleScreen(uiText, '/img/test.webp');
    expect(html).toContain(`<h1>${uiText.gameTitle}</h1>`);
    expect(html).toContain(`<img src="/img/test.webp" alt="${uiText.titleImageAlt}"`);
  });
});
