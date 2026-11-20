import { describe, expect, it } from 'vitest';
import { gameText, uiText } from '@emperor/content';
import { createInitialState, DEPARTMENT_IDS, DEPARTMENTS, EMPEROR_STAT_IDS, enterPalace, PALACE_IDS } from '@emperor/core';
import {
  escapeHtml,
  renderAtlasScreen,
  renderEndingScreen,
  renderEraScreen,
  renderHeader,
  renderPlayScreen,
  renderResultScreen,
  renderScreen,
  renderSummaryScreen,
  renderTitleScreen,
} from './render';
import { PALACE_ANCHORS } from './palaceMap';
import { COURT_PALACE, type Screen } from './screen';

const images = { palace: '/img/palace.webp', scroll: '/img/scroll.webp', map: '/img/map.webp',
  backgrounds: {
    chongwen: '/img/bg-chongwen.jpg',
    yuhuayuan: '/img/bg-yuhuayuan.jpg',
    yanwu: '/img/bg-yanwu.jpg',
    yangxin: '/img/bg-yangxin.jpg',
    xuanzheng: '/img/bg-xuanzheng.jpg',
  },
};

describe('title screen', () => {
  it('UC-WEB-001 renders the palace image with the title on a decorative scroll', () => {
    const html = renderTitleScreen(uiText, images);
    expect(html).toContain(`<img id="title-palace" src="/img/palace.webp" alt="${uiText.titleImageAlt}">`);
    expect(html).toContain(`<div id="title-scroll"><img src="/img/scroll.webp" alt=""><h1>${uiText.gameTitle}</h1></div>`);
    expect(html.startsWith('<div id="title-stage">')).toBe(true);
    expect(html.endsWith('</div>')).toBe(true);
  });
});

describe('start flow', () => {
  it('UC-WEB-002 title screen has the start button inside the image stage', () => {
    const html = renderTitleScreen(uiText, images);
    expect(html).toContain(`<button type="button" id="start">${uiText.startButton}</button></div>`);
  });
});

const state = createInitialState(7, '承平', gameText.regions);

describe('era screen', () => {
  const era: Extract<Screen, { screen: 'era' }> = { screen: 'era', seed: 7, suggestions: ['承平', '景和', '永綏'], draft: '', error: false };

  it('UC-WEB-003 renders three suggestions, the input, the confirm button and no error', () => {
    const html = renderEraScreen(era, uiText);
    expect(html).toContain('id="era-screen"');
    ['承平', '景和', '永綏'].forEach((n, i) => {
      expect(html).toContain(`id="era-suggestion-${i}"`);
      expect(html).toContain(`data-era="${n}"`);
    });
    expect(html).toContain('id="era-input"');
    expect(html).toContain(uiText.eraInputLabel);
    expect(html).toContain('id="era-confirm"');
    expect(html).not.toContain('era-error');
  });

  it('UC-WEB-003 with an error shows the alert and escapes the draft', () => {
    const html = renderEraScreen({ ...era, draft: '<b>', error: true }, uiText);
    expect(html).toContain('id="era-error"');
    expect(html).toContain('role="alert"');
    expect(html).toContain(uiText.eraError);
    expect(html).toContain('value="&lt;b&gt;"');
  });

  it('escapeHtml escapes markup characters', () => {
    expect(escapeHtml('<a href="x">&\'')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
});

describe('game screens', () => {
  it('UC-WEB-004 header shows date, action point, age and the 4 stats', () => {
    const html = renderHeader(state, uiText, gameText);
    expect(html).toContain('承平元年 春上');
    expect(html).toContain('朝');
    expect(html).toContain('十六歲');
    let last = -1;
    for (const id of EMPEROR_STAT_IDS) {
      const at = html.indexOf(`data-stat="${id}">${gameText.statLabels[id]} ${state.stats[id]}<`);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
  });

  it('UC-WEB-004 map shows the image with one positioned button per palace, a hidden heading and no 輿圖', () => {
    const html = renderPlayScreen({ screen: 'play', state }, uiText, gameText, images);
    expect(html.startsWith('<main id="palace-map">')).toBe(true);
    expect(html.indexOf('id="map-stage"')).toBeLessThan(html.indexOf('<header id="game-header"'));
    expect(html.indexOf('<header id="game-header"')).toBeLessThan(html.indexOf('id="map-image"'));
    expect(html).toContain(`<h2 class="visually-hidden">${uiText.mapHeading}</h2>`);
    expect(html).toContain(`<img id="map-image" src="/img/map.webp" alt="${uiText.mapImageAlt}">`);
    let last = -1;
    for (const id of PALACE_IDS) {
      const { x, y } = PALACE_ANCHORS[id];
      const at = html.indexOf(`<button type="button" id="palace-${id}" data-palace="${id}" style="left:${x}%;top:${y}%">${gameText.palaces[id].name}</button>`);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
    expect(html).not.toContain('open-atlas');
    expect(html).not.toContain('map-footer');
    expect(html).not.toContain('palace-grid');
  });

  it('UC-WEB-004 palace shows name, description, actions and 返回', () => {
    const inside = enterPalace(state, 'chongwen');
    const html = renderPlayScreen({ screen: 'play', state: inside }, uiText, gameText, images);
    expect(html).toContain('id="palace-view"');
    expect(html).toContain(gameText.palaces.chongwen.name);
    expect(html).toContain(gameText.palaces.chongwen.description);
    expect(html).toContain('id="action-study"');
    expect(html).toContain(gameText.actions.study.name);
    expect(html.indexOf('id="action-study"')).toBeLessThan(html.indexOf('id="action-arts"'));
    expect(html).toContain(gameText.actions.arts.name);
    expect(html).toContain(`id="back-to-map">${uiText.backToMap}<`);
    expect(uiText.backToMap).toBe('返回宮城');
  });

  it('UC-WEB-004 each palace shows its background with the header as a banner and a text panel', () => {
    for (const id of PALACE_IDS.filter((p) => p !== COURT_PALACE)) {
      const html = renderPlayScreen({ screen: 'play', state: enterPalace(state, id) }, uiText, gameText, images);
      expect(html.startsWith('<main id="palace-view">')).toBe(true);
      expect(html).toContain(`<img id="palace-image" src="/img/bg-${id}.jpg" alt="${gameText.palaces[id].imageAlt}">`);
      const at = (s: string): number => html.indexOf(s);
      expect(at('id="palace-stage"')).toBeLessThan(at('<header id="game-header"'));
      expect(at('<header id="game-header"')).toBeLessThan(at('id="palace-image"'));
      expect(at('id="palace-image"')).toBeLessThan(at('id="palace-panel"'));
      const panel = html.slice(at('id="palace-panel"'));
      expect(panel).toContain(`<h2>${gameText.palaces[id].name}</h2>`);
      expect(panel).toContain(`id="palace-description">${gameText.palaces[id].description}<`);
      expect(panel).toContain('id="back-to-map"');
    }
  });

  it('UC-WEB-004 screens without an image keep the header above the content', () => {
    const economy = { taxIncome: 0, upkeep: 0, regionChanges: [] };
    const result = renderScreen({ screen: 'result', state, actionId: 'study', changes: [] }, uiText, gameText, images);
    const summary = renderScreen(
      { screen: 'summary', state, actionId: 'study', changes: [], endedHalfSeason: 'spring-early', totals: [], economy },
      uiText,
      gameText,
      images,
    );
    const atlas = renderScreen({ screen: 'atlas', state }, uiText, gameText, images);
    for (const html of [result, summary, atlas]) expect(html.startsWith('<header id="game-header"')).toBe(true);
  });

  it('UC-WEB-004 a palace with no actions shows the empty line instead of an action list', () => {
    const html = renderPlayScreen({ screen: 'play', state: enterPalace(state, 'yuhuayuan') }, uiText, gameText, images);
    expect(html).toContain('id="palace-view"');
    expect(html).toContain(gameText.palaces.yuhuayuan.name);
    expect(html).toContain(gameText.palaces.yuhuayuan.description);
    expect(html).toContain(`<p id="no-actions">${uiText.noActions}</p>`);
    expect(html).not.toContain('action-list');
    expect(html).not.toContain('data-action');
    expect(html).toContain('id="back-to-map"');
  });

  it('UC-WEB-004 result shows the action name and change line with #continue', () => {
    const html = renderResultScreen(
      { screen: 'result', state, actionId: 'study', changes: [{ stat: 'learning', amount: 3 }, { stat: 'health', amount: -1 }] },
      uiText,
      gameText,
    );
    expect(html).toContain('id="action-result"');
    expect(html).toContain('讀經史');
    expect(html).toContain('學識 +3，健康 −1');
    expect(html).toContain('id="continue"');
    expect(html).toContain('繼續');
  });

  it('UC-WEB-004 summary shows 春上總結, the totals and 進入春下', () => {
    const html = renderSummaryScreen(
      {
        screen: 'summary',
        state: { ...state, turn: 1 },
        actionId: 'study',
        changes: [{ stat: 'learning', amount: 3 }],
        endedHalfSeason: 'spring-early',
        totals: [{ stat: 'learning', amount: 9 }, { stat: 'health', amount: -2 }],
        economy: { taxIncome: 0, upkeep: 120000, regionChanges: [] },
      },
      uiText,
      gameText,
    );
    expect(html).toContain('id="turn-summary"');
    expect(html).toContain('春上總結');
    expect(html).toContain('id="summary-action"');
    expect(html).toContain('學識 +3');
    expect(html).toContain('id="summary-totals"');
    expect(html).toContain('學識 +9，健康 −2');
    expect(html).toContain('id="next-turn"');
    expect(html).toContain('進入春下');
  });

  it('UC-WEB-004 the header shows only emperor stats and 國庫', () => {
    const html = renderHeader(state, uiText, gameText);
    expect(html.match(/data-stat="/g)).toHaveLength(4);
    expect(html).toMatch(/id="header-treasury">國庫 500,000 兩</);
    const poor = { ...state, nation: { ...state.nation, treasury: -20000 } };
    expect(renderHeader(poor, uiText, gameText)).toContain('國庫 −20,000 兩');
  });

  it('UC-WEB-006 only 崇文館 shows 輿圖, after the actions and before 返回宮城', () => {
    const html = renderPlayScreen({ screen: 'play', state: enterPalace(state, 'chongwen') }, uiText, gameText, images);
    expect(html).toMatch(/id="open-atlas"[^>]*>輿圖</);
    expect(html.indexOf('id="palace-nav"')).toBeGreaterThan(html.indexOf('id="action-arts"'));
    expect(html.indexOf('id="open-atlas"')).toBeLessThan(html.indexOf('id="back-to-map"'));
    for (const id of ['yuhuayuan', 'yanwu', 'yangxin'] as const) {
      const other = renderPlayScreen({ screen: 'play', state: enterPalace(state, id) }, uiText, gameText, images);
      expect(other).not.toContain('open-atlas');
    }
  });

  it('UC-WEB-004 the summary shows tax, upkeep and region changes', () => {
    const base = {
      screen: 'summary' as const,
      state: { ...state, turn: 1 },
      actionId: 'study' as const,
      changes: [],
      endedHalfSeason: 'spring-early' as const,
      totals: [],
    };
    const html = renderSummaryScreen(
      {
        ...base,
        economy: {
          taxIncome: 547437,
          upkeep: 120000,
          regionChanges: [{ region: 'guanzhong', changes: [{ stat: 'morale', amount: -3 }] }],
        },
      },
      uiText,
      gameText,
    );
    expect(html).toMatch(/id="summary-treasury">稅入 \+547,437 兩，宮廷用度 −120,000 兩</);
    expect(html).toMatch(/<li data-region="guanzhong">關中：民心 −3<\/li>/);
    const empty = renderSummaryScreen(
      { ...base, economy: { taxIncome: 0, upkeep: 120000, regionChanges: [] } },
      uiText,
      gameText,
    );
    expect(empty.match(/<li/g)).toHaveLength(1);
    expect(empty).toContain('諸項無變化');
  });

  it('UC-WEB-006 輿圖 lists every region with 民心, 人口 and 富庶', () => {
    const html = renderAtlasScreen({ screen: 'atlas', state }, uiText, gameText);
    expect(html).toContain('id="atlas"');
    expect(html).toContain('<h2>輿圖</h2>');
    expect(html).toContain('id="atlas-table"');
    expect(html.match(/<tr data-region=/g)).toHaveLength(9);
    const row = html.match(/<tr data-region="guanzhong">.*?<\/tr>/)?.[0] ?? '';
    for (const t of ['關中（京師）', '65', '3,000,000', '60']) expect(row).toContain(t);
    expect(html).toMatch(/id="close-atlas"[^>]*>返回崇文館</);
    expect(renderScreen({ screen: 'atlas', state }, uiText, gameText, images)).toContain('id="atlas"');
  });

  it('UC-WEB-004 renderScreen dispatches every screen kind', () => {
    const screens: Screen[] = [{ screen: 'title' }, { screen: 'play', state }];
    expect(renderScreen(screens[0] as Screen, uiText, gameText, images)).toContain('id="start"');
    expect(renderScreen(screens[1] as Screen, uiText, gameText, images)).toContain('id="palace-map"');
  });
});

describe('palace panel without a description', () => {
  it('UC-WEB-004 never emits an empty description paragraph', () => {
    const noText = { ...gameText, palaces: { ...gameText.palaces, chongwen: { ...gameText.palaces.chongwen, description: undefined as unknown as string } } };
    const html = renderPlayScreen({ screen: 'play', state: enterPalace(state, 'chongwen') }, uiText, noText, images);
    expect(html).not.toContain('palace-description');
  });
});

describe('宣政殿', () => {
  const court = enterPalace(state, 'xuanzheng');
  const departmentButton = (id: (typeof DEPARTMENT_IDS)[number], expanded: boolean): string =>
    `<button type="button" id="department-${id}" data-department="${id}" aria-label="${gameText.departments[id].name}"${expanded ? ' class="is-open"' : ''}>${gameText.departments[id].label}</button>`;
  const leave = `<button type="button" id="leave-court" aria-label="${uiText.leaveCourtLabel}">${uiText.leaveCourt}</button>`;

  it('UC-WEB-007 宣政殿 has the image, banner and court row but no panel', () => {
    const html = renderPlayScreen({ screen: 'play', state: court }, uiText, gameText, images);
    expect(html.startsWith('<main id="palace-view" class="court-view">')).toBe(true);
    expect(html).toContain(`<h2 class="visually-hidden">${gameText.palaces.xuanzheng.name}</h2>`);
    expect(html).toContain(`<img id="palace-image" src="/img/bg-xuanzheng.jpg" alt="${gameText.palaces.xuanzheng.imageAlt}">`);
    expect(html.indexOf('<header id="game-header"')).toBeGreaterThan(-1);
    expect(html.indexOf('<header id="game-header"')).toBeLessThan(html.indexOf('id="palace-image"'));
    for (const absent of ['palace-panel', 'palace-description', 'back-to-map', 'court-options']) {
      expect(html).not.toContain(absent);
    }
    let last = -1;
    for (const id of DEPARTMENT_IDS) {
      const at = html.indexOf(departmentButton(id, false));
      expect(at).toBeGreaterThan(last);
      last = at;
    }
    expect(html.indexOf(leave)).toBeGreaterThan(last);
  });

  it('UC-WEB-007 an open department is highlighted and lists its disabled options', () => {
    const html = renderPlayScreen({ screen: 'play', state: court, department: 'personnel' }, uiText, gameText, images);
    for (const id of DEPARTMENT_IDS) expect(html).toContain(departmentButton(id, id === 'personnel'));
    expect(html).toContain('<div id="court-options">');
    let last = -1;
    for (const id of DEPARTMENTS.personnel.options) {
      const at = html.indexOf(
        `<button type="button" id="court-option-${id}" data-court-option="${id}" disabled>${gameText.courtOptions[id].name}<span class="court-option-tag">${uiText.notYetOpen}</span></button>`,
      );
      expect(at).toBeGreaterThan(last);
      last = at;
    }
    for (const other of DEPARTMENT_IDS.filter((d) => d !== 'personnel')) {
      for (const option of DEPARTMENTS[other].options) expect(html).not.toContain(`court-option-${option}"`);
    }
    expect(html.indexOf('id="court-options"')).toBeLessThan(html.indexOf('id="leave-court"'));
  });

  it.each(DEPARTMENT_IDS)('UC-WEB-007 the options of %s are always the last child of the department row, above 工', (open) => {
    const html = renderPlayScreen({ screen: 'play', state: court, department: open }, uiText, gameText, images);
    const options = DEPARTMENTS[open].options
      .map(
        (id) =>
          `<button type="button" id="court-option-${id}" data-court-option="${id}" disabled>${gameText.courtOptions[id].name}<span class="court-option-tag">${uiText.notYetOpen}</span></button>`,
      )
      .join('');
    const buttons = DEPARTMENT_IDS.map((id) => departmentButton(id, id === open)).join('');
    expect(html).toContain(`<div id="department-row">${buttons}<div id="court-options">${options}</div></div>`);
    expect(html.split('id="court-options"').length).toBe(2);
  });

  it('UC-WEB-007 no department is open, no options list is rendered', () => {
    const html = renderPlayScreen({ screen: 'play', state: court }, uiText, gameText, images);
    expect(html).not.toContain('id="court-options"');
    expect(html).not.toContain('is-open');
  });
});

describe('ending', () => {
  it('UC-WEB-005 ending shows 駕崩, the 年號, 在位N年, 享年N歲 and 再開新局', () => {
    const html = renderEndingScreen({ screen: 'ending', state: { ...state, dead: true } }, uiText, gameText);
    expect(html).toContain('id="ending"');
    expect(html).toContain('駕崩');
    expect(html).toContain('id="ending-era"');
    expect(html).toContain('承平');
    expect(html).toContain('在位一年');
    expect(html).toContain('享年十六歲');
    expect(html).toContain('id="restart"');
    expect(html).toContain('再開新局');
  });
});
