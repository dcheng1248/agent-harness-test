import { describe, expect, it } from 'vitest';
import { ACTION_IDS, ACTION_POINTS, HALF_SEASONS, PALACE_IDS, STAT_IDS, isValidEraName } from '@emperor/core';
import { gameText, uiText } from './index';

const han = /\p{Script=Han}/u;

describe('content', () => {
  it('provides title screen text', () => {
    expect(uiText.gameTitle).toBe('九重天子');
    expect(uiText.titleImageAlt).toBe('暮色中的紫禁城大殿');
  });

  it('provides start button text', () => {
    expect(uiText.startButton).toBe('登基');
  });

  it('UC-CORE-011 offers 20 distinct valid 年號', () => {
    expect(gameText.eraNamePool).toHaveLength(20);
    expect(new Set(gameText.eraNamePool).size).toBe(20);
    for (const name of gameText.eraNamePool) expect(isValidEraName(name)).toBe(true);
  });

  it('UC-WEB-004 palace text for 崇文館 and 御花園, map alt and empty-palace line', () => {
    expect(gameText.palaces.chongwen).toEqual({ name: '崇文館', description: '藏經史典籍之所，學士在此侍講，亦可揮毫撫琴。' });
    expect(gameText.palaces.yuhuayuan).toEqual({ name: '御花園', description: '奇石古木、花徑曲池，四時景致各異。' });
    expect(Object.keys(gameText.palaces)).toEqual([...PALACE_IDS]);
    expect(uiText.mapImageAlt).toBe('宮城俯瞰全圖');
    expect(uiText.noActions).toBe('此處暫無可行之事。');
  });

  it('labels every stat, palace and action in Chinese', () => {
    for (const id of STAT_IDS) expect(gameText.statLabels[id]).toMatch(han);
    for (const id of ACTION_POINTS) expect(gameText.actionPointLabels[id]).toMatch(han);
    for (const id of HALF_SEASONS) expect(gameText.halfSeasonLabels[id]).toMatch(han);
    for (const id of PALACE_IDS) {
      expect(gameText.palaces[id].name).toMatch(han);
      expect(gameText.palaces[id].description).toMatch(han);
    }
    for (const id of ACTION_IDS) expect(gameText.actions[id].name).toMatch(han);
  });
});
