import { describe, expect, it } from 'vitest';
import { formatChineseNumber, formatPostName, gameText, uiText } from '@emperor/content';
import {
  createInitialState,
  DEPARTMENT_IDS,
  DEPARTMENTS,
  EMPEROR_STAT_IDS,
  enterPalace,
  holdExam,
  nextExamYear,
  getReignYear,
  confirmExam,
  listPosts,
  OFFICIAL_STAT_IDS,
  PALACE_IDS,
  type CourtOptionId,
  type GameState,
} from '@emperor/core';
import {
  escapeHtml,
  renderAtlasScreen,
  renderEndingScreen,
  renderEraScreen,
  renderHeader,
  renderPlayScreen,
  renderRecommendScreen,
  renderResultScreen,
  renderScreen,
  renderSummaryScreen,
  renderTitleScreen,
} from './render';
import { PALACE_ANCHORS } from './palaceMap';
import { COURT_PALACE, examCandidates, idleOfficials, OPEN_COURT_OPTIONS, type Screen } from './screen';

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

const state = createInitialState(7, '承平', gameText.regions, gameText.officialNames);

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

  it('UC-WEB-004 宣政殿 is a disabled map button outside 朝', () => {
    const noon = renderPlayScreen({ screen: 'play', state: { ...state, actionPoint: 1 } }, uiText, gameText, images);
    const { x, y } = PALACE_ANCHORS.xuanzheng;
    expect(noon).toContain(`<button type="button" id="palace-xuanzheng" data-palace="xuanzheng" style="left:${x}%;top:${y}%" disabled>${gameText.palaces.xuanzheng.name}</button>`);
    expect(noon.match(/data-palace="[^"]+"[^>]* disabled>/g)).toHaveLength(1);
    const dawn = renderPlayScreen({ screen: 'play', state }, uiText, gameText, images);
    expect(dawn).not.toContain(' disabled>');
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
  const optionButton = (id: CourtOptionId): string =>
    OPEN_COURT_OPTIONS.includes(id)
      ? `<button type="button" id="court-option-${id}" data-court-option="${id}">${gameText.courtOptions[id].name}</button>`
      : `<button type="button" id="court-option-${id}" data-court-option="${id}" disabled>${gameText.courtOptions[id].name}<span class="court-option-tag">${uiText.notYetOpen}</span></button>`;

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

  it('UC-WEB-007 an open department is highlighted and lists its options, 開科取士 and 舉薦人選 and 官員任命 enabled', () => {
    const html = renderPlayScreen({ screen: 'play', state: court, department: 'personnel' }, uiText, gameText, images);
    for (const id of DEPARTMENT_IDS) expect(html).toContain(departmentButton(id, id === 'personnel'));
    expect(html).toContain('<div id="court-options">');
    let last = -1;
    for (const id of DEPARTMENTS.personnel.options) {
      const at = html.indexOf(optionButton(id));
      expect(at).toBeGreaterThan(last);
      last = at;
    }
    for (const other of DEPARTMENT_IDS.filter((d) => d !== 'personnel')) {
      for (const option of DEPARTMENTS[other].options) expect(html).not.toContain(`court-option-${option}"`);
    }
    expect(html.indexOf('id="court-options"')).toBeLessThan(html.indexOf('id="leave-court"'));
    expect(html).toContain('<button type="button" id="court-option-appoint-officials" data-court-option="appoint-officials">官員任命</button>');
  });

  it.each(DEPARTMENT_IDS)('UC-WEB-007 the options of %s follow its own button in the department row', (open) => {
    const html = renderPlayScreen({ screen: 'play', state: court, department: open }, uiText, gameText, images);
    const options = DEPARTMENTS[open].options
      .map(optionButton)
      .join('');
    const at = DEPARTMENT_IDS.indexOf(open);
    const before = DEPARTMENT_IDS.slice(0, at + 1).map((id) => departmentButton(id, id === open)).join('');
    const after = DEPARTMENT_IDS.slice(at + 1).map((id) => departmentButton(id, false)).join('');
    expect(html).toContain(`<div id="department-row">${before}<div id="court-options">${options}</div>${after}</div>`);
    expect(html.split('id="court-options"').length).toBe(2);
  });

  it('UC-WEB-007 no department is open, no options list is rendered', () => {
    const html = renderPlayScreen({ screen: 'play', state: court }, uiText, gameText, images);
    expect(html).not.toContain('id="court-options"');
    expect(html).not.toContain('is-open');
  });
});

describe('官員任命', () => {
  const court = enterPalace(state, 'xuanzheng');
  const render = (screen: Screen): string => renderScreen(screen, uiText, gameText, images);

  it('UC-WEB-008 the post list', () => {
    const html = render({ screen: 'appoint', state: court });
    expect(html).toContain('id="game-header"');
    expect(html).toContain('id="appoint-screen"');
    expect(html).toContain('<h2>官員任命</h2>');
    const groups = [['central', '中樞'], ['ministry', '六部'], ['region', '地方']] as const;
    let last = -1;
    for (const [id, heading] of groups) {
      const at = html.indexOf(`<section id="post-group-${id}"><h3>${heading}</h3>`);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
    const posts = listPosts(court);
    expect(posts).toHaveLength(33);
    expect(html.match(/data-post="/g)).toHaveLength(33);
    last = -1;
    for (const post of posts) {
      const at = html.indexOf(`<button type="button" id="post-${post.id}" data-post="${post.id}">${formatPostName(post)}</button>`);
      expect(at).toBeGreaterThan(last);
      last = at;
      const holder = court.officials.find((o) => o.post === post.id)!;
      const row = html.slice(at, html.indexOf('</tr>', at));
      expect(row).toContain(`<td>${escapeHtml(holder.name)}</td>`);
      expect(row).toContain(OFFICIAL_STAT_IDS.map((s) => `<td>${holder.stats[s]}</td>`).join(''));
    }
    expect(html).not.toContain('idle-list');
    expect(html).toContain('id="back-to-court"');
  });

  it('UC-WEB-008 a vacant post shows 空缺', () => {
    const vacant: GameState = { ...court, officials: court.officials.map((o) => (o.post === 'chancellor' ? { ...o, post: null } : o)) };
    const html = render({ screen: 'appoint', state: vacant });
    const at = html.indexOf('data-post-row="chancellor"');
    const row = html.slice(at, html.indexOf('</tr>', at));
    expect(row).toContain('空缺');
    expect(row).toContain('class="vacant"');
    expect(html).not.toContain('undefined');
  });

  it('UC-WEB-008 a selected post lists the idle officials', () => {
    const html = render({ screen: 'appoint', state: court, post: 'chancellor', sort: 'military' });
    const holder = court.officials.find((o) => o.post === 'chancellor')!;
    const headStart = html.indexOf('<h3 id="selected-post">');
    expect(headStart).toBeGreaterThan(-1);
    const heading = html.slice(headStart, html.indexOf('</h3>', headStart));
    expect(heading).toContain('丞相');
    expect(heading).toContain(escapeHtml(holder.name));
    const tableStart = html.indexOf('<table id="idle-list">');
    expect(tableStart).toBeGreaterThan(-1);
    const table = html.slice(tableStart, html.indexOf('</table>', tableStart));
    const ids = [...table.matchAll(/data-official="([^"]+)">任命</g)].map((m) => m[1]);
    expect(ids).toHaveLength(30);
    expect(ids).toEqual(idleOfficials(court, 'military').map((o) => o.id));
    for (const stat of OFFICIAL_STAT_IDS) {
      expect(html).toContain(`id="sort-${stat}" data-sort="${stat}" aria-pressed="${stat === 'military'}"`);
    }
    expect(html).toContain('id="back-to-posts"');
    expect(html).toContain('id="back-to-court"');
    expect(html).not.toContain('post-group-central');
  });

  it('UC-WEB-008 no idle officials', () => {
    const none: GameState = { ...court, officials: court.officials.filter((o) => o.post !== null) };
    const html = render({ screen: 'appoint', state: none, post: 'chancellor' });
    expect(html).toContain('<p id="no-idle">並無賦閑官員</p>');
    expect(html).not.toContain('idle-list');
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

describe('舉薦人選', () => {
  const court = enterPalace(state, 'xuanzheng');
  const withCandidate = (candidate: { name: string; stats: Record<(typeof OFFICIAL_STAT_IDS)[number], number>; notable: string | null } | null): GameState => ({
    ...court,
    recommendation: { turn: court.turn, candidate },
  });
  const render = (s: GameState): string => renderScreen({ screen: 'recommend', state: s }, uiText, gameText, images);
  const stats = { administration: 71, military: 62, ambition: 33, loyalty: 88 };

  it('UC-WEB-009 an ordinary candidate shows name and four stats, with no 名臣 mark', () => {
    const html = render(withCandidate({ name: '<林&"遠">', stats, notable: null }));
    expect(html).toContain('<main id="recommend-screen">');
    expect(html).toContain(`<h2>${uiText.recommendHeading}</h2>`);
    expect(html.indexOf('<header id="game-header"')).toBeLessThan(html.indexOf('id="recommend-screen"'));
    expect(html).toContain('id="candidate"');
    expect(html).not.toContain('data-notable');
    expect(html).not.toContain('notable-mark');
    expect(html).toContain(`id="candidate-name">${escapeHtml('<林&"遠">')}</h3>`);
    expect(html).not.toContain('<林');
    for (const stat of OFFICIAL_STAT_IDS) expect(html).toContain(`<th>${gameText.statLabels[stat]}</th>`);
    const row = OFFICIAL_STAT_IDS.map((stat) => `<td>${stats[stat]}</td>`).join('');
    expect(html).toContain(`<tbody><tr>${row}</tr></tbody>`);
    expect(html).toContain(`id="accept-candidate">${uiText.acceptCandidate}</button>`);
    expect(html).toContain(`id="decline-candidate">${uiText.declineCandidate}</button>`);
    expect(html).not.toContain('back-to-court');
  });

  it('UC-WEB-009 a 名臣 candidate carries data-notable and the 名臣 mark', () => {
    const html = render(withCandidate({ name: '某臣', stats, notable: 'guan-zhong' }));
    expect(html).toContain('id="candidate" data-notable="guan-zhong"');
    expect(html).toContain(`<span class="notable-mark">${uiText.notableMark}</span>`);
    expect(html).toContain('名臣');
    expect(html.indexOf('某臣')).toBeLessThan(html.indexOf('notable-mark'));
    expect(html.indexOf('notable-mark')).toBeLessThan(html.indexOf('</h3>'));
  });

  it('UC-WEB-009 with no candidate only a way back to 宣政殿 is shown', () => {
    const html = render(withCandidate(null));
    expect(html).toContain(`<p id="no-candidate">${uiText.noCandidate}</p>`);
    expect(html).toContain('id="back-to-court"');
    for (const absent of ['accept-candidate', 'decline-candidate', 'id="candidate"']) expect(html).not.toContain(absent);
  });

  it('UC-WEB-009 the 舉薦人選 option is disabled and tagged once used this 早朝, enabled otherwise', () => {
    const view = (s: GameState): string => renderPlayScreen({ screen: 'play', state: s, department: 'personnel' }, uiText, gameText, images);
    const used = view({ ...court, recommendation: { turn: court.turn, candidate: null } });
    expect(used).toContain(
      `<button type="button" id="court-option-recommend-officials" data-court-option="recommend-officials" disabled>${gameText.courtOptions['recommend-officials'].name}<span class="court-option-tag">${uiText.recommendUsed}</span></button>`,
    );
    const older = view({ ...court, turn: court.turn + 1, recommendation: { turn: court.turn, candidate: null } });
    expect(older).toContain(
      `<button type="button" id="court-option-recommend-officials" data-court-option="recommend-officials">${gameText.courtOptions['recommend-officials'].name}</button>`,
    );
    expect(older).not.toContain(uiText.recommendUsed);
  });
});

describe('開科取士', () => {
  const court = enterPalace(state, 'xuanzheng');
  const held = (): GameState => {
    const outcome = holdExam(court, gameText.notables, gameText.officialNames);
    if (!outcome.ok) throw new Error('unexpected');
    return outcome.state;
  };
  const render = (s: Extract<Screen, { screen: 'exam' }>): string => renderScreen(s, uiText, gameText, images);
  const view = (s: GameState): string =>
    renderPlayScreen({ screen: 'play', state: s, department: 'personnel' }, uiText, gameText, images);
  const examButton = (s: GameState): string => {
    const html = view(s);
    const at = html.indexOf('<button type="button" id="court-option-hold-exams"');
    return html.slice(at, html.indexOf('</button>', at) + 9);
  };

  it('UC-WEB-010 renders heading, count and rows in candidate order', () => {
    const s = held();
    const html = render({ screen: 'exam', state: s, picks: [] });
    expect(html.indexOf('<header id="game-header"')).toBeLessThan(html.indexOf('<main id="exam-screen">'));
    expect(html).toContain(`<h2>${uiText.examHeading}</h2>`);
    expect(html).toContain(`id="exam-picked">${uiText.examPicked}：0</`);
    expect(html).toContain('id="exam-list"');
    expect(html).toContain('id="confirm-exam"');
    let last = -1;
    for (const { index, candidate } of examCandidates(s)) {
      const at = html.indexOf(`<tr data-exam-row="${index}"`);
      expect(at).toBeGreaterThan(last);
      last = at;
      const row = html.slice(at, html.indexOf('</tr>', at));
      expect(row).toContain(`id="exam-pick-${index}" data-exam-pick="${index}" aria-label="${escapeHtml(candidate.name)}">`);
      expect(row).not.toContain('checked');
      expect(row).toContain(escapeHtml(candidate.name));
      for (const stat of OFFICIAL_STAT_IDS) expect(row).toContain(`<td>${candidate.stats[stat]}</td>`);
    }
  });

  it('UC-WEB-010 a 名臣 row carries data-notable and the mark; others do not', () => {
    const s = held();
    const cands = s.exam!.candidates!.map((c, i) => (i === 1 ? { ...c, name: '某<臣>', notable: 'guan-zhong' } : { ...c, notable: null }));
    const html = render({ screen: 'exam', state: { ...s, exam: { turn: s.turn, candidates: cands } }, picks: [] });
    expect(html).toContain('<tr data-exam-row="1" data-notable="guan-zhong">');
    expect(html).toContain(`某&lt;臣&gt;<span class="notable-mark">${uiText.notableMark}</span>`);
    expect(html.split('data-notable').length).toBe(2);
    expect(html.split('notable-mark').length).toBe(2);
  });

  it('UC-WEB-010 sorted rows, pressed sort button and ticks', () => {
    const s = held();
    const html = render({ screen: 'exam', state: s, picks: [0, 2], sort: 'military' });
    expect(html).toContain(`id="exam-picked">${uiText.examPicked}：2</`);
    let last = -1;
    for (const { index } of examCandidates(s, 'military')) {
      const at = html.indexOf(`<tr data-exam-row="${index}"`);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
    for (const stat of OFFICIAL_STAT_IDS) {
      expect(html).toContain(`id="exam-sort-${stat}" data-exam-sort="${stat}" aria-pressed="${stat === 'military'}"`);
    }
    expect(html).toMatch(/id="exam-pick-0" data-exam-pick="0" aria-label="[^"]*" checked>/);
    expect(html).toMatch(/id="exam-pick-2" data-exam-pick="2" aria-label="[^"]*" checked>/);
    expect(html).not.toMatch(/id="exam-pick-1"[^>]*checked/);
  });

  it('UC-WEB-010 with no pending candidates only a way back is shown', () => {
    const html = render({ screen: 'exam', state: court, picks: [] });
    expect(html).toContain(`<p id="no-exam-candidates">${uiText.noExamCandidates}</p>`);
    expect(html).toContain('id="back-to-court"');
    expect(html).not.toContain('id="confirm-exam"');
    expect(html).not.toContain('id="exam-list"');
  });

  it('UC-WEB-007 開科取士 is enabled at turn 0, tagged 已開科 once held', () => {
    expect(examButton(court)).toBe(
      `<button type="button" id="court-option-hold-exams" data-court-option="hold-exams">${gameText.courtOptions['hold-exams'].name}</button>`,
    );
    const s = held();
    const done = confirmExam(s, []);
    if (!done.ok) throw new Error('unexpected');
    expect(examButton(done.state)).toBe(
      `<button type="button" id="court-option-hold-exams" data-court-option="hold-exams" disabled>${gameText.courtOptions['hold-exams'].name}<span class="court-option-tag">${uiText.examHeld}</span></button>`,
    );
  });

  it.each([
    [8, '二'],
    [16, '一'],
  ])('UC-WEB-007 at turn %i the tag counts the years to the next exam', (turn, years) => {
    const s = { ...court, turn };
    expect(formatChineseNumber(nextExamYear(s) - getReignYear(s))).toBe(years);
    expect(examButton(s)).toBe(
      `<button type="button" id="court-option-hold-exams" data-court-option="hold-exams" disabled>${gameText.courtOptions['hold-exams'].name}<span class="court-option-tag">${uiText.nextExamPrefix}${years}${uiText.nextExamSuffix}</span></button>`,
    );
  });
});
