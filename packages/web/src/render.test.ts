import { describe, expect, it } from 'vitest';
import { uiText } from '@emperor/content';
import { renderPlaceholder } from './render';

describe('web skeleton', () => {
  it('renders the placeholder heading', () => {
    expect(renderPlaceholder(uiText)).toContain(`<h1>${uiText.placeholderHeading}</h1>`);
  });
});
