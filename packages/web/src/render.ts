import type { GameText, UiText } from '@emperor/content';
import { formatAge, formatChanges, formatDate, formatLifespan, formatReign } from '@emperor/content';
import {
  CATALOG,
  PALACE_IDS,
  STAT_REGISTRY,
  getActionPointId,
  getAge,
  getHalfSeason,
  getReignYear,
  type GameState,
} from '@emperor/core';
import type { Screen } from './screen';

type Of<K extends Screen['screen']> = Extract<Screen, { screen: K }>;

export type TitleImages = { palace: string; scroll: string };

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderTitleScreen(text: UiText, images: TitleImages): string {
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
  const stats = STAT_REGISTRY.map(
    (s) => `<span data-stat="${s.id}">${game.statLabels[s.id]} ${state.stats[s.id]}</span>`,
  ).join('');
  return `<header id="game-header"><span id="header-date">${escapeHtml(date)}</span><span id="header-action-point">${game.actionPointLabels[getActionPointId(state)]}</span><span id="header-age">${formatAge(getAge(state))}</span><div id="header-stats">${stats}</div></header>`;
}

export function renderPlayScreen(screen: Of<'play'>, text: UiText, game: GameText): string {
  const { state } = screen;
  const header = renderHeader(state, text, game);
  if (state.location === 'map') {
    const buttons = PALACE_IDS.map(
      (id) => `<button type="button" id="palace-${id}" data-palace="${id}">${game.palaces[id].name}</button>`,
    ).join('');
    return `${header}<main id="palace-map"><h2>${text.mapHeading}</h2><div id="palace-grid">${buttons}</div></main>`;
  }
  const palace = game.palaces[state.location];
  const actions = CATALOG.palaces[state.location].actions
    .map((id) => `<button type="button" id="action-${id}" data-action="${id}">${game.actions[id].name}</button>`)
    .join('');
  return `${header}<main id="palace-view"><h2>${palace.name}</h2><p>${palace.description}</p><div id="action-list">${actions}</div><button type="button" id="back-to-map">${text.backToMap}</button></main>`;
}

export function renderResultScreen(screen: Of<'result'>, text: UiText, game: GameText): string {
  return `${renderHeader(screen.state, text, game)}<main id="action-result"><h2>${game.actions[screen.actionId].name}</h2><p id="result-changes">${formatChanges(screen.changes)}</p><button type="button" id="continue">${text.continueButton}</button></main>`;
}

export function renderSummaryScreen(screen: Of<'summary'>, text: UiText, game: GameText): string {
  const ended = game.halfSeasonLabels[screen.endedHalfSeason];
  const next = game.halfSeasonLabels[getHalfSeason(screen.state)];
  return `${renderHeader(screen.state, text, game)}<main id="turn-summary"><h2>${ended}${text.summarySuffix}</h2><p id="summary-action">${game.actions[screen.actionId].name}：${formatChanges(screen.changes)}</p><p id="summary-totals">${formatChanges(screen.totals)}</p><button type="button" id="next-turn">${text.nextTurnPrefix}${next}</button></main>`;
}

export function renderEndingScreen(screen: Of<'ending'>, text: UiText, _game?: GameText): string {
  const { state } = screen;
  return `<main id="ending"><h1>${text.endingHeading}</h1><p id="ending-era">${text.eraLabel}：${escapeHtml(state.eraName)}</p><p id="ending-reign">${formatReign(getReignYear(state))}</p><p id="ending-age">${formatLifespan(getAge(state))}</p><button type="button" id="restart">${text.restartButton}</button></main>`;
}

export function renderScreen(screen: Screen, text: UiText, game: GameText, images: TitleImages): string {
  switch (screen.screen) {
    case 'title':
      return renderTitleScreen(text, images);
    case 'era':
      return renderEraScreen(screen, text);
    case 'play':
      return renderPlayScreen(screen, text, game);
    case 'result':
      return renderResultScreen(screen, text, game);
    case 'summary':
      return renderSummaryScreen(screen, text, game);
    case 'ending':
      return renderEndingScreen(screen, text, game);
  }
}
