import { describe, expect, it } from 'vitest';
import {
  formatAge,
  formatAmount,
  formatChanges,
  formatChineseNumber,
  formatDate,
  formatEconomy,
  formatLifespan,
  formatPostName,
  formatReign,
  formatTaels,
  formatWages,
  formatArtisans,
} from './format';
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
  it('UC-WEB-006 formats amounts with thousands separators and U+2212', () => {
    expect([0, 999, 1000, 3000000, -20000].map(formatAmount)).toEqual(['0', '999', '1,000', '3,000,000', '−20,000']);
    expect(formatChanges([{ stat: 'morale', amount: -3 }, { stat: 'population', amount: 60000 }])).toBe('民心 −3，人口 +60,000');
  });
  it('UC-WEB-006 formats taels', () => {
    expect(formatTaels(500000)).toBe('500,000 兩');
    expect(formatTaels(-20000)).toBe('−20,000 兩');
  });
  it('UC-WEB-006 formats the economy report, hiding zero tax income', () => {
    expect(formatEconomy({ taxIncome: 547437, upkeep: 120000, wages: 0, regionChanges: [] })).toBe('稅入 +547,437 兩，宮廷用度 −120,000 兩');
    expect(formatEconomy({ taxIncome: 0, upkeep: 120000, wages: 0, regionChanges: [] })).toBe('宮廷用度 −120,000 兩');
  });
  it('UC-WEB-004 formatEconomy ignores wages', () => {
    expect(formatEconomy({ taxIncome: 0, upkeep: 120000, wages: 50000, regionChanges: [] })).toBe('宮廷用度 −120,000 兩');
  });
  it('UC-WEB-004 formats wages and artisans', () => {
    expect(formatWages(50000)).toBe('工匠工錢 −50,000 兩');
    expect(formatArtisans(310000)).toBe('310,000 人');
  });
  it('UC-CONTENT-002 formatPostName', () => {
    expect(formatPostName({ id: 'chancellor', group: 'central', office: 'chancellor' })).toBe('丞相');
    expect(formatPostName({ id: 'grand-general', group: 'central', office: 'grand-general' })).toBe('大將軍');
    expect(formatPostName({ id: 'personnel-minister', group: 'ministry', department: 'personnel', rank: 'minister' })).toBe('吏部尚書');
    expect(formatPostName({ id: 'works-vice-minister', group: 'ministry', department: 'works', rank: 'vice-minister' })).toBe('工部侍郎');
    expect(formatPostName({ id: 'guanzhong-governor', group: 'region', region: 'guanzhong', office: 'governor' })).toBe('關中知州');
    expect(formatPostName({ id: 'guanzhong-commander', group: 'region', region: 'guanzhong', office: 'commander' })).toBe('關中總兵');
  });
});
