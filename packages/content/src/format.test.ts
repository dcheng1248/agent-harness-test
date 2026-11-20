import { describe, expect, it } from 'vitest';
import { formatAge, formatChanges, formatChineseNumber, formatDate, formatLifespan, formatReign } from './format';
import { uiText } from './index';

describe('format', () => {
  it('formats Chinese numbers', () => {
    expect([1, 10, 16, 20, 68, 100, 105, 110, 116].map(formatChineseNumber)).toEqual([
      '一', '十', '十六', '二十', '六十八', '一百', '一百零五', '一百一十', '一百一十六',
    ]);
  });
  it('UC-WEB-004 formats the date with 元年', () => {
    expect(formatDate('承平', 1, 'spring-early')).toBe('承平元年 春上');
    expect(formatDate('承平', 2, 'summer-late')).toBe('承平二年 夏下');
  });
  it('UC-WEB-004 formats changes with labels, signs and U+2212', () => {
    expect(formatChanges([{ stat: 'learning', amount: 3 }, { stat: 'health', amount: -1 }])).toBe('學識 +3，健康 −1');
    expect(formatChanges([])).toBe(uiText.noChange);
  });
  it('UC-WEB-005 formats age, reign and lifespan', () => {
    expect(formatAge(16)).toBe('十六歲');
    expect(formatReign(12)).toBe('在位十二年');
    expect(formatLifespan(58)).toBe('享年五十八歲');
  });
});
