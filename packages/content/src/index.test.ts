import { describe, expect, it } from 'vitest';
import { uiText } from './index';

describe('content skeleton', () => {
  it('provides Chinese placeholder text', () => {
    expect(uiText.placeholderHeading).toMatch(/\p{Script=Han}/u);
    expect(uiText.placeholderBody).toMatch(/\p{Script=Han}/u);
  });
});
