import { describe, expect, it } from 'vitest';
import { uiText } from './index';

describe('content skeleton', () => {
  it('provides Chinese placeholder text', () => {
    expect(uiText.placeholderHeading).toMatch(/\p{Script=Han}/u);
    expect(uiText.placeholderBody).toMatch(/\p{Script=Han}/u);
  });

  it('provides title screen text', () => {
    expect(uiText.gameTitle).toBe('九重天子');
    expect(uiText.titleImageAlt).toBe('暮色中的紫禁城大殿');
  });
});
