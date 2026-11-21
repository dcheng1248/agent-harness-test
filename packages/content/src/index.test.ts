import { describe, expect, it } from 'vitest';
import { ACTION_IDS, ACTION_POINTS, COURT_OPTION_IDS, DEPARTMENTS, DEPARTMENT_IDS, HALF_SEASONS, PALACE_IDS, STAT_IDS, isValidEraName } from '@emperor/core';
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
      'recruit-artisans': { name: '徵召工匠' }, 'release-artisans': { name: '遣散工匠' },
      build: { name: '營建工程' }, 'forge-weapons': { name: '打造兵器' },
    });
    expect(DEPARTMENTS.works.options.map((id) => gameText.courtOptions[id].name)).toEqual(['徵召工匠', '遣散工匠', '營建工程', '打造兵器']);
    expect(Object.keys(gameText.departments)).toEqual([...DEPARTMENT_IDS]);
    expect(Object.keys(gameText.courtOptions).sort()).toEqual([...COURT_OPTION_IDS].sort());
    expect(uiText.leaveCourt).toBe('退');
    expect(uiText.leaveCourtLabel).toBe('退出宣政殿');
    expect(uiText.notYetOpen).toBe('尚未開放');
  });

  it('UC-WEB-008 official stat labels, post and appointment text', () => {
    expect(gameText.statLabels.administration).toBe('文治');
    expect(gameText.statLabels.military).toBe('武功');
    expect(gameText.statLabels.ambition).toBe('野心');
    expect(gameText.statLabels.loyalty).toBe('忠誠');
    expect(gameText.centralPosts).toEqual({ chancellor: { name: '丞相' }, 'grand-general': { name: '大將軍' }, 'grand-tutor': { name: '太傅' } });
    expect(gameText.ministryRanks).toEqual({ minister: { name: '尚書' }, 'vice-minister': { name: '侍郎' } });
    expect(gameText.regionOffices).toEqual({ governor: { name: '知州' }, commander: { name: '總兵' } });
    expect(uiText).toMatchObject({
      appointHeading: '官員任命', postGroupCentral: '中樞', postGroupMinistry: '六部', postGroupRegion: '地方',
      postColumn: '官位', holderColumn: '在任', nameColumn: '姓名', vacant: '空缺', idleHeading: '賦閑官員',
      noIdleOfficials: '並無賦閑官員', appointButton: '任命', backToPosts: '返回官位列表', backToCourt: '返回宣政殿',
    });
  });

  it('UC-WEB-010 開科取士 text', () => {
    expect(uiText).toMatchObject({
      examHeading: '開科取士',
      examPickColumn: '錄取',
      examPicked: '已選',
      confirmExamButton: '確定錄取',
      examHeld: '已開科',
      nextExamPrefix: '下次開科：',
      nextExamSuffix: '年後',
      noExamCandidates: '此科已無應試者',
    });
  });

  it('UC-WEB-011 UC-WEB-013 工部 text', () => {
    expect(uiText).toMatchObject({
      recruitHeading: '徵召工匠', releaseHeading: '遣散工匠', buildHeading: '營建工程', artisanTotalLabel: '工匠總數',
      idleArtisansLabel: '閒置工匠', freePopulationLabel: '可徵人口', recruitMaxLabel: '此次至多', personUnit: '人',
      countLabel: '人數', countDown: '－', countUp: '＋', countDownLabel: '減少', countUpLabel: '增加',
      recruitMax: '最多', releaseAll: '全部閒置', confirmRecruit: '徵召', confirmRelease: '遣散',
      recruitUsed: '本次已徵召', noRecruits: '無可徵之民', noIdleArtisans: '無閒置工匠',
      buildingColumn: '工程', requiredColumn: '所需工匠·半季', statusColumn: '狀態', assignedColumn: '工匠',
      statusNotStarted: '未動工', statusInProgress: '營建中', statusCompleted: '已落成', pausedMark: '停工',
      etaPrefix: '約', etaSuffix: '半季', wagesLabel: '工匠工錢', completedLabel: '落成',
    });
  });
});
