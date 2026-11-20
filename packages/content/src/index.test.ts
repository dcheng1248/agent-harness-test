import { describe, expect, it } from 'vitest';
import { ACTION_IDS, ACTION_POINTS, COURT_OPTION_IDS, DEPARTMENT_IDS, HALF_SEASONS, PALACE_IDS, STAT_IDS, isValidEraName } from '@emperor/core';
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
      if (id === 'xuanzheng') expect(gameText.palaces[id].description).toBeUndefined(); else expect(gameText.palaces[id].description).toMatch(han);
      expect(gameText.palaces[id].imageAlt).toMatch(han);
    }
    for (const id of ACTION_IDS) expect(gameText.actions[id].name).toMatch(han);
    for (const id of DEPARTMENT_IDS) {
      expect(gameText.departments[id].label).toMatch(han);
      expect(gameText.departments[id].name).toMatch(han);
    }
    for (const id of COURT_OPTION_IDS) expect(gameText.courtOptions[id].name).toMatch(han);
  });

  it('UC-WEB-007 宣政殿, department and option text', () => {
    expect(gameText.palaces.xuanzheng).toEqual({ name: '宣政殿', imageAlt: '宣政殿內蟠龍金柱林立，百官分列兩側，朝向御座' });
    expect(gameText.departments).toEqual({
      cabinet: { label: '內閣', name: '內閣' },
      personnel: { label: '吏', name: '吏部' },
      revenue: { label: '戶', name: '戶部' },
      rites: { label: '禮', name: '禮部' },
      war: { label: '兵', name: '兵部' },
      justice: { label: '刑', name: '刑部' },
      works: { label: '工', name: '工部' },
    });
    expect(gameText.courtOptions).toEqual({
      'name-heir': { name: '冊立太子' }, 'change-era': { name: '改元' },
      'recommend-officials': { name: '舉薦人選' }, 'appoint-officials': { name: '官員任命' }, 'hold-exams': { name: '開科取士' },
      'take-census': { name: '戶口普查' }, 'adjust-taxes': { name: '調整賦稅' }, 'relieve-disaster': { name: '賑濟災民' },
      'hold-sacrifice': { name: '祭祀' }, 'conduct-diplomacy': { name: '外交' },
      'conscript-soldiers': { name: '徵召士兵' }, 'drill-troops': { name: '操練軍隊' },
      'grant-amnesty': { name: '大赦天下' }, 'try-major-case': { name: '審理要案' },
      build: { name: '建造' }, 'forge-weapons': { name: '打造兵器' },
    });
    expect(Object.keys(gameText.departments)).toEqual([...DEPARTMENT_IDS]);
    expect(Object.keys(gameText.courtOptions).sort()).toEqual([...COURT_OPTION_IDS].sort());
    expect(uiText.leaveCourt).toBe('退');
    expect(uiText.leaveCourtLabel).toBe('退出宣政殿');
    expect(uiText.notYetOpen).toBe('尚未開放');
  });
});
