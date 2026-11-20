import type { GameText, UiText } from '@emperor/content';
import {
  formatAge,
  formatAmount,
  formatChanges,
  formatDate,
  formatEconomy,
  formatLifespan,
  formatReign,
  formatTaels,
} from '@emperor/content';
import {
  CATALOG,
  PALACE_IDS,
  EMPEROR_STAT_IDS,
  getActionPointId,
  getAge,
  getHalfSeason,
  getReignYear,
  type GameState,
} from '@emperor/core';
import { PALACE_ANCHORS } from './palaceMap';
import type { Screen } from './screen';

type Of<K extends Screen['screen']> = Extract<Screen, { screen: K }>;

export type ScreenImages = { palace: string; scroll: string; map: string };

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderTitleScreen(text: UiText, images: ScreenImages): string {
  return `<div id="title-stage"><img id="title-palace" src="${images.palace}" alt="${text.titleImageAlt}"><div id="title-scroll"><img src="${images.scroll}" alt=""><h1>${text.gameTitle}</h1></div><button type="button" id="start">${text.startButton}</button></div>`;
}

export function renderEraScreen(screen: Of<'era'>, text: UiText): string {
  const suggestions = screen.suggestions
    .map((name, i) => `<button type="button" id="era-suggestion-${i}" data-era="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
    .join('');
  const error = screen.error ? `<p id="era-error" role="alert">${text.eraError}</p>` : '';
  return `<main id="era-screen"><h1>${text.eraHeading}</h1><p>${text.eraPrompt}</p><div id="era-suggestions">${suggestions}</div><label for="era-input">${text.eraInputLabel}</label><input type="text" id="era-input" value="${escapeHtml(screen.draft)}" autocomplete="off">${error}<button type="button" id="era-confirm">${text.eraConfirm}</button></main>`;
}

export function renderHeader(state: GameState, _text: UiText, game: GameText): string {
  const date = formatDate(state.eraName, getReignYear(state), getHalfSeason(state));
  const stats = EMPEROR_STAT_IDS.map(
    (id) => `<span data-stat="${id}">${game.statLabels[id]} ${state.stats[id]}</span>`,
  ).join('');
  return `<header id="game-header"><span id="header-date">${escapeHtml(date)}</span><span id="header-action-point">${game.actionPointLabels[getActionPointId(state)]}</span><span id="header-age">${formatAge(getAge(state))}</span><div id="header-stats">${stats}</div><span id="header-treasury">${game.statLabels.treasury} ${formatTaels(state.nation.treasury)}</span></header>`;
}

export function renderPlayScreen(screen: Of<'play'>, text: UiText, game: GameText, mapImage: string): string {
  const { state } = screen;
  const header = renderHeader(state, text, game);
  if (state.location === 'map') {
    const buttons = PALACE_IDS.map((id) => {
      const { x, y } = PALACE_ANCHORS[id];
      return `<button type="button" id="palace-${id}" data-palace="${id}" style="left:${x}%;top:${y}%">${game.palaces[id].name}</button>`;
    }).join('');
    return `${header}<main id="palace-map"><h2 class="visually-hidden">${text.mapHeading}</h2><div id="map-stage"><img id="map-image" src="${mapImage}" alt="${text.mapImageAlt}">${buttons}</div><div id="map-footer"><button type="button" id="open-atlas">${text.atlasButton}</button></div></main>`;
  }
  const palace = game.palaces[state.location];
  const ids = CATALOG.palaces[state.location].actions;
  const actions =
    ids.length === 0
      ? `<p id="no-actions">${text.noActions}</p>`
      : `<div id="action-list">${ids
          .map((id) => `<button type="button" id="action-${id}" data-action="${id}">${game.actions[id].name}</button>`)
          .join('')}</div>`;
  return `${header}<main id="palace-view"><h2>${palace.name}</h2><p>${palace.description}</p>${actions}<button type="button" id="back-to-map">${text.backToMap}</button></main>`;
}

export function renderResultScreen(screen: Of<'result'>, text: UiText, game: GameText): string {
  return `${renderHeader(screen.state, text, game)}<main id="action-result"><h2>${game.actions[screen.actionId].name}</h2><p id="result-changes">${formatChanges(screen.changes)}</p><button type="button" id="continue">${text.continueButton}</button></main>`;
}

export function renderSummaryScreen(screen: Of<'summary'>, text: UiText, game: GameText): string {
  const ended = game.halfSeasonLabels[screen.endedHalfSeason];
  const next = game.halfSeasonLabels[getHalfSeason(screen.state)];
  const { regionChanges } = screen.economy;
  const regionLines =
    regionChanges.length === 0
      ? `<li>${text.noChange}</li>`
      : regionChanges
          .map((r) => {
            const name = game.regions.find((g) => g.id === r.region)?.name ?? r.region;
            return `<li data-region="${escapeHtml(r.region)}">${escapeHtml(name)}：${formatChanges(r.changes)}</li>`;
          })
          .join('');
  return `${renderHeader(screen.state, text, game)}<main id="turn-summary"><h2>${ended}${text.summarySuffix}</h2><p id="summary-action">${game.actions[screen.actionId].name}：${formatChanges(screen.changes)}</p><p id="summary-totals">${formatChanges(screen.totals)}</p><p id="summary-treasury">${formatEconomy(screen.economy)}</p><ul id="summary-regions">${regionLines}</ul><button type="button" id="next-turn">${text.nextTurnPrefix}${next}</button></main>`;
}

export function renderAtlasScreen(screen: Of<'atlas'>, text: UiText, game: GameText): string {
  const rows = screen.state.regions
    .map((r) => {
      const entry = game.regions.find((g) => g.id === r.id);
      const name = `${entry?.name ?? r.id}${entry?.capital ? `（${text.capitalMark}）` : ''}`;
      return `<tr data-region="${escapeHtml(r.id)}"><th scope="row">${escapeHtml(name)}</th><td>${r.stats.morale}</td><td>${formatAmount(r.stats.population)}</td><td>${r.stats.prosperity}</td></tr>`;
    })
    .join('');
  const head = `<tr><th>${text.regionColumn}</th><th>${game.statLabels.morale}</th><th>${game.statLabels.population}</th><th>${game.statLabels.prosperity}</th></tr>`;
  return `${renderHeader(screen.state, text, game)}<main id="atlas"><h2>${text.atlasHeading}</h2><div id="atlas-scroll"><table id="atlas-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div><button type="button" id="close-atlas">${text.backToMap}</button></main>`;
}

export function renderEndingScreen(screen: Of<'ending'>, text: UiText, _game?: GameText): string {
  const { state } = screen;
  return `<main id="ending"><h1>${text.endingHeading}</h1><p id="ending-era">${text.eraLabel}：${escapeHtml(state.eraName)}</p><p id="ending-reign">${formatReign(getReignYear(state))}</p><p id="ending-age">${formatLifespan(getAge(state))}</p><button type="button" id="restart">${text.restartButton}</button></main>`;
}

export function renderScreen(screen: Screen, text: UiText, game: GameText, images: ScreenImages): string {
  switch (screen.screen) {
    case 'title':
      return renderTitleScreen(text, images);
    case 'era':
      return renderEraScreen(screen, text);
    case 'play':
      return renderPlayScreen(screen, text, game, images.map);
    case 'result':
      return renderResultScreen(screen, text, game);
    case 'summary':
      return renderSummaryScreen(screen, text, game);
    case 'atlas':
      return renderAtlasScreen(screen, text, game);
    case 'ending':
      return renderEndingScreen(screen, text, game);
  }
}
