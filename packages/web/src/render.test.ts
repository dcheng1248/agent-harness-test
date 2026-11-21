import { describe, expect, it } from 'vitest';
import { formatAmount, formatArtisans, formatChineseNumber, formatPostName, formatTaels, formatWages, gameText, uiText } from '@emperor/content';
import {
  BALANCE,
  freePopulation,
  maxRecruit,
  recruitArtisans,
  releaseArtisans,
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
  expectedTax,
  levyAmount,
  nextCollection,
} from '@emperor/core';
import {
  escapeHtml,
  renderAtlasScreen,
  renderEndingScreen,
  renderEraScreen,
  renderHeader,
  renderTaxPreview,
  renderPlayScreen,
  renderRecommendScreen,
  renderResultScreen,
  renderScreen,
  renderSummaryScreen,
  renderTitleScreen,
} from './render';
import { PALACE_ANCHORS } from './palaceMap';
import { confirmLevy, confirmSacrifice } from './screen';
import { COURT_PALACE, examCandidates, idleOfficials, OPEN_COURT_OPTIONS, type Screen } from './screen';
import { idleArtisans } from '@emperor/core';

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

const state = createInitialState(7, '承平', gameText.regions, gameText.officialNames, gameText.buildings);

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
    const economy = { taxIncome: 0, upkeep: 0, wages: 0, regionChanges: [] };
    const result = renderScreen({ screen: 'result', state, actionId: 'study', changes: [] }, uiText, gameText, images);
    const summary = renderScreen(
      { screen: 'summary', state, actionId: 'study', changes: [], endedHalfSeason: 'spring-early', totals: [], economy, completed: [] },
      uiText,
      gameText,
      images,
    );
    const atlas = renderScreen({ screen: 'atlas', state }, uiText, gameText, images);
    const extra = (['taxes', 'levy', 'budget', 'sacrifice'] as const).map((k) => renderScreen({ screen: k, state }, uiText, gameText, images));
    for (const html of [result, summary, atlas, ...extra]) expect(html.startsWith('<header id="game-header"')).toBe(true);
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
        economy: { taxIncome: 0, upkeep: 120000, wages: 0, regionChanges: [] },
        completed: [],
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
      completed: [] as string[],
    };
    const html = renderSummaryScreen(
      {
        ...base,
        economy: {
          taxIncome: 547437,
          upkeep: 120000,
          wages: 0,
          regionChanges: [{ region: 'guanzhong', changes: [{ stat: 'morale', amount: -3 }] }],
        },
      },
      uiText,
      gameText,
    );
    expect(html).toMatch(/id="summary-treasury">稅入 \+547,437 兩，宮廷用度 −120,000 兩</);
    expect(html).toMatch(/<li data-region="guanzhong">關中：民心 −3<\/li>/);
    const empty = renderSummaryScreen(
      { ...base, economy: { taxIncome: 0, upkeep: 120000, wages: 0, regionChanges: [] } },
      uiText,
      gameText,
    );
    expect(empty.match(/<li/g)).toHaveLength(1);
    expect(empty).toContain('諸項無變化');
  });

  describe('輿圖 map', () => {
    const atlas = (region?: string): string =>
      renderAtlasScreen(region === undefined ? { screen: 'atlas', state } : { screen: 'atlas', state, region }, uiText, gameText);
    const cell = (html: string, id: string): string => html.match(new RegExp(`<button[^>]*data-region="${id}".*?</button>`))?.[0] ?? '';

    it('UC-WEB-006 draws a grid of 28 region buttons and 14 empty cells', () => {
      const html = atlas();
      expect(html).toContain('id="atlas"');
      expect(html).toContain('<h2>輿圖</h2>');
      expect(html).toContain('style="--cols:7"');
      expect(html.match(/<button[^>]*class="map-cell[^>]*data-region=/g)).toHaveLength(28);
      expect(html.match(/class="map-cell map-empty"/g)).toHaveLength(14);
      expect(html).not.toContain('atlas-table');
    });

    it('UC-WEB-006 region cells sit on their grid cell, take the owner colour and mark only the capital', () => {
      const html = atlas();
      const g = cell(html, 'guanzhong');
      expect(g).toContain('grid-column:3;grid-row:4');
      expect(g).toContain('background:#a8322a');
      expect(g).toContain('關中');
      expect(g).toContain('<span class="capital-mark">京師</span>');
      const s = cell(html, 'shangjing');
      expect(s).toContain('background:#4a6d8c');
      expect(s).not.toContain('capital-mark');
      expect(html.match(/capital-mark/g)).toHaveLength(1);
    });

    it('UC-WEB-006 shows a hint and no panel until a region is selected, and a legend of nations', () => {
      const html = atlas();
      expect(html).not.toContain('id="region-panel"');
      expect(html).toContain('id="atlas-hint"');
      const items = [...html.matchAll(/<li data-nation="[^"]*"><span class="legend-swatch" style="background:([^"]*)"><\/span>([^<]*)<\/li>/g)];
      expect(items.map((m) => m[2])).toEqual(['本朝', '契丹', '吐蕃', '高麗', '南詔']);
      expect(items.map((m) => m[1])).toEqual(gameText.nations.map((n) => n.color));
    });

    it('UC-WEB-006 a selected region opens a panel with owner and stats', () => {
      const html = atlas('shangjing');
      const panel = html.match(/<section id="region-panel">.*?<\/section>/)?.[0] ?? '';
      expect(panel).toContain('<h3 id="region-panel-name">上京</h3>');
      expect(panel).toContain('<dd id="region-owner">契丹</dd>');
      expect(panel).toContain('<dd id="region-morale">65</dd>');
      expect(panel).toContain(`<dd id="region-population">${formatAmount(2500000)}</dd>`);
      expect(panel).toContain('<dd id="region-prosperity">55</dd>');
      expect(panel).toContain('id="close-region-panel"');
      expect(cell(html, 'shangjing')).toContain('selected');
      expect(cell(html, 'shangjing')).toContain('aria-pressed="true"');
      expect(html).not.toContain('atlas-hint');
      expect(atlas('guanzhong')).toContain('<dd id="region-owner">本朝</dd>');
    });

    it('UC-WEB-006 a state region unknown to content is not drawn and a content region missing from state is empty', () => {
      const extra: GameState = { ...state, regions: [...state.regions, { id: 'zz', owner: 'zz', stats: state.regions[0]!.stats }] };
      expect(renderAtlasScreen({ screen: 'atlas', state: extra }, uiText, gameText)).not.toContain('data-region="zz"');
      const missing: GameState = { ...state, regions: state.regions.filter((r) => r.id !== 'shangjing') };
      const html = renderAtlasScreen({ screen: 'atlas', state: missing }, uiText, gameText);
      expect(html).not.toContain('data-region="shangjing"');
      expect(html.match(/class="map-cell map-empty"/g)).toHaveLength(15);
    });

    it('UC-WEB-006 keeps the close button and dispatches through renderScreen', () => {
      expect(atlas()).toMatch(/id="close-atlas"[^>]*>返回崇文館</);
      expect(renderScreen({ screen: 'atlas', state }, uiText, gameText, images)).toContain('id="atlas"');
    });
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
    id === 'release-artisans'
      ? `<button type="button" id="court-option-${id}" data-court-option="${id}" disabled>${gameText.courtOptions[id].name}<span class="court-option-tag">${uiText.noIdleArtisans}</span></button>`
      : OPEN_COURT_OPTIONS.includes(id)
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
    expect(posts.filter((p) => p.group === 'region')).toHaveLength(18);
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

describe('工部', () => {
  const court = enterPalace(state, 'xuanzheng');
  const render = (screen: Screen): string => renderScreen(screen, uiText, gameText, images);
  const step = BALANCE.works.step;
  const ok = (outcome: { ok: boolean; state: GameState }): GameState => {
    if (!outcome.ok) throw new Error('rejected');
    return outcome.state;
  };
  const withWorks = (s: GameState, buildings: GameState['works']['buildings'], artisans: number): GameState => ({
    ...s,
    works: { ...s.works, artisans, buildings },
  });
  const buttonOf = (html: string, id: string): string => {
    const at = html.indexOf(`<button type="button" id="${id}"`);
    return html.slice(at, html.indexOf('</button>', at));
  };

  it('UC-WEB-007 工部 lists its four options with their tags', () => {
    const html = render({ screen: 'play', state: court, department: 'works' });
    const ids = ['recruit-artisans', 'release-artisans', 'build', 'forge-weapons'];
    let last = -1;
    for (const id of ids) {
      const at = html.indexOf(`id="court-option-${id}"`);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
    expect(buttonOf(html, 'court-option-recruit-artisans')).not.toContain('disabled');
    expect(buttonOf(html, 'court-option-build')).not.toContain('disabled');
    expect(buttonOf(html, 'court-option-release-artisans')).toContain('disabled');
    expect(buttonOf(html, 'court-option-release-artisans')).toContain(`>${uiText.noIdleArtisans}<`);
    expect(buttonOf(html, 'court-option-forge-weapons')).toContain(`>${uiText.notYetOpen}<`);
  });

  it('UC-WEB-007 after a 徵召, 徵召工匠 shows 本次已徵召 and 遣散工匠 is enabled', () => {
    const recruited = ok(recruitArtisans(court, step));
    const html = render({ screen: 'play', state: recruited, department: 'works' });
    const recruit = buttonOf(html, 'court-option-recruit-artisans');
    expect(recruit).toContain('disabled');
    expect(recruit).toContain(`>${uiText.recruitUsed}<`);
    expect(buttonOf(html, 'court-option-release-artisans')).not.toContain('disabled');
  });

  it('UC-WEB-007 with no one to recruit the tag is 無可徵之民', () => {
    const tiny: GameState = { ...court, regions: court.regions.map((r) => ({ ...r, stats: { ...r.stats, population: 0 } })) };
    expect(maxRecruit(tiny)).toBe(0);
    const html = render({ screen: 'play', state: tiny, department: 'works' });
    const recruit = buttonOf(html, 'court-option-recruit-artisans');
    expect(recruit).toContain('disabled');
    expect(recruit).toContain(`>${uiText.noRecruits}<`);
  });

  it('UC-WEB-011 the recruit screen shows the totals, the picker and the buttons', () => {
    const html = render({ screen: 'recruit', state: court, count: step });
    expect(html.indexOf('<header id="game-header"')).toBeLessThan(html.indexOf('<main id="recruit-screen">'));
    expect(html).toContain(`<h2>${uiText.recruitHeading}</h2>`);
    expect(html).toMatch(new RegExp(`id="artisan-total">[^<]*${formatArtisans(0)}<`));
    expect(html).toMatch(new RegExp(`id="free-population">[^<]*${formatArtisans(freePopulation(court))}<`));
    expect(html).toMatch(new RegExp(`id="recruit-max-line">[^<]*${formatArtisans(maxRecruit(court))}<`));
    expect(html).toMatch(/id="count-value"[^>]*>10,000 人</);
    expect(buttonOf(html, 'count-down')).toContain('disabled');
    expect(buttonOf(html, 'count-up')).not.toContain('disabled');
    expect(buttonOf(html, 'count-max')).toContain(`>${uiText.recruitMax}`);
    expect(html).toContain('id="confirm-recruit"');
    expect(html).toContain('id="back-to-court"');
    const top = render({ screen: 'recruit', state: court, count: maxRecruit(court) });
    expect(buttonOf(top, 'count-up')).toContain('disabled');
    expect(buttonOf(top, 'count-down')).not.toContain('disabled');
  });

  it('UC-WEB-012 the release screen shows the total and idle 工匠', () => {
    const s = ok(recruitArtisans(court, 3 * step));
    const html = render({ screen: 'release', state: s, count: step });
    expect(html).toContain('id="release-screen"');
    expect(html).toContain(`<h2>${uiText.releaseHeading}</h2>`);
    expect(html).toMatch(new RegExp(`id="artisan-total">[^<]*${formatArtisans(3 * step)}<`));
    expect(html).toMatch(new RegExp(`id="artisan-idle">[^<]*${formatArtisans(idleArtisans(s))}<`));
    expect(buttonOf(html, 'count-max')).toContain(`>${uiText.releaseAll}`);
    expect(html).toContain('id="confirm-release"');
    expect(html).not.toContain('recruit-max-line');
    expect(releaseArtisans(s, step).ok).toBe(true);
  });

  const rowOf = (html: string, id: string): string => {
    const at = html.indexOf(`<tr data-building-row="${id}"`);
    return html.slice(at, html.indexOf('</tr>', at));
  };

  it('UC-WEB-013 the build screen lists every building in order', () => {
    const html = render({ screen: 'build', state: court });
    expect(html).toContain('id="build-screen"');
    expect(html).toContain(`<h2>${uiText.buildHeading}</h2>`);
    expect(html.match(/data-building-row="/g)).toHaveLength(25);
    let last = -1;
    for (const b of gameText.buildings) {
      const at = html.indexOf(`data-building-row="${b.id}"`);
      expect(at).toBeGreaterThan(last);
      last = at;
      const row = rowOf(html, b.id);
      expect(row).toContain(b.name);
      expect(row).toContain(b.description);
      expect(row).toContain(formatAmount(b.required));
    }
    const row = rowOf(html, 'observatory');
    expect(row).toContain('data-status="not-started"');
    expect(row).toContain(uiText.statusNotStarted);
    expect(buttonOf(row, 'assign-down-observatory')).toContain('disabled');
    expect(html).toContain('id="artisan-total"');
    expect(html).toContain('id="artisan-idle"');
  });

  it('UC-WEB-013 in-progress, paused and completed rows', () => {
    const b = court.works.buildings;
    const edit = (id: string, patch: object) => b.map((x) => (x.id === id ? { ...x, ...patch } : x));
    const progress = withWorks(court, edit('tiantan', { progress: 30000, assigned: 20000 }), 50000);
    const row = rowOf(render({ screen: 'build', state: progress }), 'tiantan');
    expect(row).toContain('data-status="in-progress"');
    expect(row).toContain(uiText.statusInProgress);
    expect(row).toContain('30,000 / 400,000');
    expect(row).toContain(`${uiText.etaPrefix}19${uiText.etaSuffix}`);
    expect(row).toContain('data-direction="1"');
    expect(row).toContain('data-assign="tiantan"');
    const paused = withWorks(court, edit('tiantan', { progress: 30000, assigned: 0 }), 50000);
    const pausedRow = rowOf(render({ screen: 'build', state: paused }), 'tiantan');
    expect(pausedRow).toContain(uiText.pausedMark);
    const done = withWorks(court, edit('observatory', { progress: 100000 }), 50000);
    const doneRow = rowOf(render({ screen: 'build', state: done }), 'observatory');
    expect(doneRow).toContain(uiText.statusCompleted);
    expect(doneRow).not.toContain('data-assign');
  });

  it('UC-WEB-013 with no idle 工匠 every plus button is disabled', () => {
    const html = render({ screen: 'build', state: court });
    for (const b of gameText.buildings) expect(buttonOf(html, `assign-up-${b.id}`)).toContain('disabled');
    const staffed = withWorks(court, court.works.buildings, 50000);
    const open = render({ screen: 'build', state: staffed });
    expect(buttonOf(open, 'assign-up-observatory')).not.toContain('disabled');
  });

  it('UC-WEB-004 the summary shows wages and completed buildings only when present', () => {
    const base = {
      screen: 'summary' as const,
      state: { ...state, turn: 1 },
      actionId: 'study' as const,
      changes: [],
      endedHalfSeason: 'spring-early' as const,
      totals: [],
    };
    const none = renderSummaryScreen(
      { ...base, economy: { taxIncome: 0, upkeep: 1, wages: 0, regionChanges: [] }, completed: [] },
      uiText,
      gameText,
    );
    expect(none).not.toContain('summary-wages');
    expect(none).not.toContain('summary-completed');
    const html = renderSummaryScreen(
      { ...base, economy: { taxIncome: 0, upkeep: 1, wages: 155000, regionChanges: [] }, completed: ['observatory', 'tiantan'] },
      uiText,
      gameText,
    );
    expect(html).toContain(`id="summary-wages">${formatWages(155000)}<`);
    expect(html.indexOf('id="summary-wages"')).toBeGreaterThan(html.indexOf('id="summary-treasury"'));
    expect(html).toContain('id="summary-completed">落成：天壇、觀星臺<');
  });
});

describe('戶部 screens', () => {
  const court = enterPalace(state, 'xuanzheng');
  const render = (screen: Screen): string => renderScreen(screen, uiText, gameText, images);
  const sum = (s: GameState, level = s.revenue.taxLevel): number => expectedTax(s, level).reduce((a, e) => a + e.tax, 0);
  const buttonOf = (html: string, id: string): string => {
    const at = html.indexOf(`<button type="button" id="${id}"`);
    return html.slice(at, html.indexOf('</button>', at));
  };

  it('UC-WEB-007 戶部 lists its three options in order, all enabled', () => {
    const html = render({ screen: 'play', state: court, department: 'revenue' });
    let last = -1;
    for (const id of ['adjust-taxes', 'extra-levy', 'budget-sheet']) {
      const at = html.indexOf(`id="court-option-${id}"`);
      expect(at).toBeGreaterThan(last);
      last = at;
      expect(buttonOf(html, `court-option-${id}`)).not.toContain('disabled');
      expect(buttonOf(html, `court-option-${id}`)).not.toContain('court-option-tag');
    }
    const levied = confirmLevy({ screen: 'levy', state: court });
    if (levied.screen !== 'levy') throw new Error('expected levy');
    const after = render({ screen: 'play', state: levied.state, department: 'revenue' });
    expect(buttonOf(after, 'court-option-extra-levy')).toContain('disabled');
    expect(buttonOf(after, 'court-option-extra-levy')).toContain(`<span class="court-option-tag">${uiText.levyUsed}</span>`);
  });

  it('UC-WEB-014 tax screen', () => {
    const html = render({ screen: 'taxes', state: court });
    expect(html).toContain('id="tax-screen"');
    expect(html).toContain(`<p id="tax-hint">${uiText.taxHint}</p>`);
    expect(html).toMatch(/<input type="range" id="tax-slider" min="0" max="4" step="1" value="2"/);
    let last = -1;
    for (const id of ['very-light', 'light', 'normal', 'heavy', 'very-heavy'] as const) {
      const at = html.indexOf(`<span>${gameText.taxLevels[id].name}</span>`);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
    expect(html).toContain(`<p id="tax-level">${uiText.taxLevelLabel}：平</p>`);
    expect(html).toContain(`<p id="tax-expected">${uiText.expectedTaxLabel}：${formatTaels(sum(court))}</p>`);
    expect(html).not.toMatch(new RegExp(`${gameText.statLabels.morale}[ ：]*\\d`));
  });

  it('UC-WEB-014 renderTaxPreview', () => {
    const preview = renderTaxPreview(court, 'very-heavy', uiText, gameText);
    expect(preview.level).toBe('稅率：極重');
    expect(preview.expected).toBe(`${uiText.expectedTaxLabel}：${formatTaels(sum(court, 'very-heavy'))}`);
    expect(court.revenue.taxLevel).toBe('normal');
  });

  it('UC-WEB-015 levy screen', () => {
    const before = render({ screen: 'levy', state: court });
    expect(before).toContain(`${formatTaels(levyAmount(court))}${uiText.levyHintSuffix}`);
    expect(before).toContain('id="confirm-levy"');
    expect(before).toContain('id="back-to-court"');
    expect(before).not.toMatch(new RegExp(`${gameText.statLabels.morale}[ ：]*\\d`));
    const done = confirmLevy({ screen: 'levy', state: court });
    const after = render(done);
    expect(after).toContain(`<p id="levy-result">${uiText.levyResultLabel}：${formatTaels(levyAmount(court))}</p>`);
    expect(after).toContain('id="back-to-court"');
    expect(after).not.toContain('confirm-levy');
    expect(after).not.toContain('levy-hint');
  });

  it('UC-WEB-016 budget sheet', () => {
    const html = render({ screen: 'budget', state: court });
    expect(html).toContain(`<p id="budget-treasury">${gameText.statLabels.treasury}：${formatTaels(court.nation.treasury)}</p>`);
    expect(html).toContain(`<p id="budget-level">${uiText.currentTaxLabel}：平</p>`);
    for (const { region, tax } of expectedTax(court)) {
      const row = html.slice(html.indexOf(`<tr data-region="${region}">`));
      expect(row.slice(0, row.indexOf('</tr>'))).toContain(formatTaels(tax));
    }
    expect(html.match(/data-region=/g)?.length).toBe(expectedTax(court).length);
    const total = html.slice(html.indexOf('id="budget-total"'));
    expect(total.slice(0, total.indexOf('</tr>'))).toContain(formatTaels(sum(court)));
    expect(html).toContain(`<p id="budget-upkeep">${uiText.halfYearUpkeepLabel}：${formatTaels((BALANCE.upkeep * BALANCE.turnsPerYear) / 2)}</p>`);
    expect(nextCollection(court)).toBe('autumn-early');
    expect(html).toContain(`<p id="budget-next">${uiText.nextCollectionLabel}：${gameText.halfSeasonLabels[nextCollection(court)]}</p>`);
    expect(gameText.halfSeasonLabels['autumn-early']).toBe('秋上');
  });
});

describe('祭祀 screens', () => {
  const court = enterPalace(state, 'xuanzheng');
  const render = (screen: Screen): string => renderScreen(screen, uiText, gameText, images);
  const buttonOf = (html: string, id: string): string => {
    const at = html.indexOf(`<button type="button" id="${id}"`);
    return html.slice(at, html.indexOf('</button>', at));
  };

  it('UC-WEB-007 禮部 lists 祭祀 enabled and 外交 not yet open', () => {
    const html = render({ screen: 'play', state: court, department: 'rites' });
    expect(buttonOf(html, 'court-option-hold-sacrifice')).not.toContain('disabled');
    expect(buttonOf(html, 'court-option-hold-sacrifice')).not.toContain('court-option-tag');
    expect(buttonOf(html, 'court-option-conduct-diplomacy')).toContain('disabled');
    expect(buttonOf(html, 'court-option-conduct-diplomacy')).toContain(`>${uiText.notYetOpen}<`);
    const done = confirmSacrifice({ screen: 'sacrifice', state: court });
    if (done.screen !== 'play') throw new Error('expected play');
    const after = render(done);
    expect(buttonOf(after, 'court-option-hold-sacrifice')).toContain('disabled');
    expect(buttonOf(after, 'court-option-hold-sacrifice')).toContain(`<span class="court-option-tag">${uiText.sacrificeUsed}</span>`);
    expect(after).toContain(gameText.actionPointLabels.dawn);
  });

  it('UC-WEB-017 祭祀 screen', () => {
    const html = render({ screen: 'sacrifice', state: court });
    expect(html).toContain('id="sacrifice-screen"');
    expect(html).toContain(`<p id="sacrifice-hint">${uiText.sacrificeHint}</p>`);
    expect(html).toContain('id="confirm-sacrifice"');
    expect(html).toContain('id="back-to-court"');
    const main = html.slice(html.indexOf('<main'));
    const textOnly = main.replace(/<[^>]*>/g, '');
    expect(textOnly).not.toMatch(/[0-9]/);
    expect(textOnly).not.toContain(formatTaels(BALANCE.rites.sacrificeCost));
  });
});
