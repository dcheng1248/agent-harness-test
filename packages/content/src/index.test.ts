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

  it('UC-WEB-004 UC-WEB-006 palace text, background alt text, map alt and button lines', () => {
    expect(gameText.palaces.chongwen).toEqual({ name: '崇文館', description: '藏經史典籍之所，學士在此侍講，亦可揮毫撫琴。', imageAlt: '崇文館內燈籠高懸，書畫長卷與案几羅列' });
    expect(gameText.palaces.yuhuayuan).toEqual({ name: '御花園', description: '奇石古木、花徑曲池，四時景致各異。', imageAlt: '御花園中曲池映橋，石燈佇立，桃花盛開' });
    expect(gameText.palaces.yanwu.imageAlt).toBe('演武場上廊柱環立，武人持槍演練');
    expect(gameText.palaces.yangxin).toEqual({ name: '養心殿', description: '天子起居理政之所，可閉目調息，養護龍體。', imageAlt: '養心殿內帷幔低垂，床榻靜置，燈火柔和' });
    expect(uiText.backToMap).toBe('返回宮城');
    expect(uiText.closeAtlas).toBe('返回崇文館');
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
      expect(gameText.palaces[id].imageAlt).toMatch(han);
    }
    for (const id of ACTION_IDS) expect(gameText.actions[id].name).toMatch(han);
  });
});
