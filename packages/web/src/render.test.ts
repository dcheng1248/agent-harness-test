import { describe, expect, it } from 'vitest';
import { gameText, uiText } from '@emperor/content';
import { createInitialState, EMPEROR_STAT_IDS, enterPalace } from '@emperor/core';
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
import type { Screen } from './screen';

const images = { palace: '/img/palace.webp', scroll: '/img/scroll.webp' };

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

  it('UC-WEB-004 map has one button per palace', () => {
    const html = renderPlayScreen({ screen: 'play', state }, uiText, gameText);
    expect(html).toContain('id="palace-map"');
    expect(html).toContain(uiText.mapHeading);
    for (const id of ['chongwen', 'hanmo', 'yanwu', 'qingong'] as const) {
      expect(html).toContain(`id="palace-${id}"`);
      expect(html).toContain(`data-palace="${id}"`);
      expect(html).toContain(gameText.palaces[id].name);
    }
  });

  it('UC-WEB-004 palace shows name, description, actions and 返回', () => {
    const inside = enterPalace(state, 'chongwen');
    const html = renderPlayScreen({ screen: 'play', state: inside }, uiText, gameText);
    expect(html).toContain('id="palace-view"');
    expect(html).toContain(gameText.palaces.chongwen.name);
    expect(html).toContain(gameText.palaces.chongwen.description);
    expect(html).toContain('id="action-study"');
    expect(html).toContain(gameText.actions.study.name);
    expect(html).toContain('id="back-to-map"');
    expect(html).toContain('返回');
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

  it('UC-WEB-004 the palace map has the 輿圖 entry', () => {
    const html = renderPlayScreen({ screen: 'play', state }, uiText, gameText);
    expect(html).toMatch(/id="open-atlas"[^>]*>輿圖</);
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
    expect(html).toMatch(/id="close-atlas"[^>]*>返回</);
    expect(renderScreen({ screen: 'atlas', state }, uiText, gameText, images)).toContain('id="atlas"');
  });

  it('UC-WEB-004 renderScreen dispatches every screen kind', () => {
    const screens: Screen[] = [{ screen: 'title' }, { screen: 'play', state }];
    expect(renderScreen(screens[0] as Screen, uiText, gameText, images)).toContain('id="start"');
    expect(renderScreen(screens[1] as Screen, uiText, gameText, images)).toContain('id="palace-map"');
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
