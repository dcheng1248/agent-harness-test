import type { GameText, UiText } from '@emperor/content';
import {
  formatAge,
  formatArtisans,
  formatWages,
  formatTrainingChange,
  formatAmount,
  formatChineseNumber,
  formatChanges,
  formatDate,
  formatEconomy,
  formatLifespan,
  formatPostName,
  formatReign,
  formatTaels,
  formatLegionName,
} from '@emperor/content';
import {
  canEnterPalace,
  findLegion,
  CATALOG,
  DEPARTMENT_IDS,
  DEPARTMENTS,
  PALACE_IDS,
  EMPEROR_STAT_IDS,
  getActionPointId,
  getAge,
  getHalfSeason,
  getReignYear,
  canHoldExam,
  canFormLegion,
  canRecall,
  legionMoves,
  maxLegionSoldiers,
  capitalRegion,
  stationedLegion,
  canHoldSacrifice,
  canLevy,
  expectedTax,
  levyAmount,
  nextCollection,
  TAX_LEVEL_IDS,
  type TaxLevelId,
  canRecruit,
  canConscript,
  drillTurnsLeft,
  maxConscript,
  canRecommend,
  freePopulation,
  halfSeasonsToFinish,
  buildingStatus,
  idleArtisans,
  maxRecruit,
  isExamYear,
  nextExamYear,
  listPosts,
  OFFICIAL_STAT_IDS,
  BALANCE,
  type DepartmentId,
  type GameState,
  type Official,
  type PalaceId,
  type PostInfo,
} from '@emperor/core';
import { PALACE_ANCHORS } from './palaceMap';
import { renderWorldMap } from './worldMap';
import { ATLAS_PALACE, COURT_PALACE, countStep, examCandidates, idleOfficials, OPEN_COURT_OPTIONS, type Screen } from './screen';

type Of<K extends Screen['screen']> = Extract<Screen, { screen: K }>;

export type ScreenImages = { palace: string; scroll: string; map: string; backgrounds: Record<PalaceId, string> };

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

export function renderPlayScreen(screen: Of<'play'>, text: UiText, game: GameText, images: ScreenImages): string {
  const { state } = screen;
  const header = renderHeader(state, text, game);
  if (state.location === 'map') {
    const buttons = PALACE_IDS.map((id) => {
      const { x, y } = PALACE_ANCHORS[id];
      return `<button type="button" id="palace-${id}" data-palace="${id}" style="left:${x}%;top:${y}%"${canEnterPalace(state, id) ? '' : ' disabled'}>${game.palaces[id].name}</button>`;
    }).join('');
    return `<main id="palace-map"><h2 class="visually-hidden">${text.mapHeading}</h2><div id="map-stage" class="image-stage">${header}<img id="map-image" src="${images.map}" alt="${text.mapImageAlt}">${buttons}</div></main>`;
  }
  if (state.location === COURT_PALACE) return renderCourtView(screen, header, text, game, images);
  const palace = game.palaces[state.location];
  const ids = CATALOG.palaces[state.location].actions;
  const actions =
    ids.length === 0
      ? `<p id="no-actions">${text.noActions}</p>`
      : `<div id="action-list">${ids
          .map((id) => `<button type="button" id="action-${id}" data-action="${id}">${game.actions[id].name}</button>`)
          .join('')}</div>`;
  const atlasButton =
    state.location === ATLAS_PALACE ? `<button type="button" id="open-atlas">${text.atlasButton}</button>` : '';
  return `<main id="palace-view"><div id="palace-stage" class="image-stage">${header}<img id="palace-image" src="${images.backgrounds[state.location]}" alt="${palace.imageAlt}"></div><div id="palace-panel"><h2>${palace.name}</h2>${palace.description ? `<p id="palace-description">${palace.description}</p>` : ''}${actions}<div id="palace-nav">${atlasButton}<button type="button" id="back-to-map">${text.backToMap}</button></div></div></main>`;
}

function examTag(state: GameState, text: UiText): string {
  if (isExamYear(state)) return text.examHeld;
  return `${text.nextExamPrefix}${formatChineseNumber(nextExamYear(state) - getReignYear(state))}${text.nextExamSuffix}`;
}

function legionTag(state: GameState, text: UiText, game: GameText): string {
  const capital = capitalRegion(game.regions);
  if (capital !== null && stationedLegion(state, capital) !== undefined) return text.capitalOccupied;
  if (state.army.soldiers < BALANCE.army.step) return text.noSoldiers;
  return text.noIdleGeneral;
}

function renderCourtView(screen: Of<'play'>, header: string, text: UiText, game: GameText, images: ScreenImages): string {
  const palace = game.palaces[COURT_PALACE];
  const open = screen.department;
  const optionList = (id: DepartmentId): string =>
    `<div id="court-options">${DEPARTMENTS[id].options
      .map((option) =>
        option === 'hold-sacrifice' && !canHoldSacrifice(screen.state)
          ? `<button type="button" id="court-option-${option}" data-court-option="${option}" disabled>${game.courtOptions[option].name}<span class="court-option-tag">${text.sacrificeUsed}</span></button>`
          : option === 'extra-levy' && !canLevy(screen.state)
          ? `<button type="button" id="court-option-${option}" data-court-option="${option}" disabled>${game.courtOptions[option].name}<span class="court-option-tag">${text.levyUsed}</span></button>`
          : option === 'recruit-artisans' && !canRecruit(screen.state)
          ? `<button type="button" id="court-option-${option}" data-court-option="${option}" disabled>${game.courtOptions[option].name}<span class="court-option-tag">${screen.state.works.recruitedTurn === screen.state.turn ? text.recruitUsed : text.noRecruits}</span></button>`
          : option === 'release-artisans' && idleArtisans(screen.state) <= 0
          ? `<button type="button" id="court-option-${option}" data-court-option="${option}" disabled>${game.courtOptions[option].name}<span class="court-option-tag">${text.noIdleArtisans}</span></button>`
          : option === 'conscript-soldiers' && !canConscript(screen.state)
          ? `<button type="button" id="court-option-${option}" data-court-option="${option}" disabled>${game.courtOptions[option].name}<span class="court-option-tag">${screen.state.army.conscriptedTurn === screen.state.turn ? text.recruitUsed : text.noRecruits}</span></button>`
          : option === 'release-soldiers' && screen.state.army.soldiers <= 0
          ? `<button type="button" id="court-option-${option}" data-court-option="${option}" disabled>${game.courtOptions[option].name}<span class="court-option-tag">${text.noSoldiers}</span></button>`
          : option === 'form-legion' && !canFormLegion(screen.state, game.regions)
          ? `<button type="button" id="court-option-${option}" data-court-option="${option}" disabled>${game.courtOptions[option].name}<span class="court-option-tag">${legionTag(screen.state, text, game)}</span></button>`
          : option === 'recommend-officials' && !canRecommend(screen.state)
          ? `<button type="button" id="court-option-${option}" data-court-option="${option}" disabled>${game.courtOptions[option].name}<span class="court-option-tag">${text.recommendUsed}</span></button>`
          : option === 'hold-exams' && !canHoldExam(screen.state)
          ? `<button type="button" id="court-option-${option}" data-court-option="${option}" disabled>${game.courtOptions[option].name}<span class="court-option-tag">${examTag(screen.state, text)}</span></button>`
          : OPEN_COURT_OPTIONS.includes(option)
          ? `<button type="button" id="court-option-${option}" data-court-option="${option}">${game.courtOptions[option].name}</button>`
          : `<button type="button" id="court-option-${option}" data-court-option="${option}" disabled>${game.courtOptions[option].name}<span class="court-option-tag">${text.notYetOpen}</span></button>`,
      )
      .join('')}</div>`;
  const buttons = DEPARTMENT_IDS.map((id) => {
    const { label, name } = game.departments[id];
    return `<button type="button" id="department-${id}" data-department="${id}" aria-label="${name}"${id === open ? ' class="is-open"' : ''}>${label}</button>${id === open ? optionList(id) : ''}`;
  }).join('');
  const departments = buttons;
  const leave = `<button type="button" id="leave-court" aria-label="${text.leaveCourtLabel}">${text.leaveCourt}</button>`;
  return `<main id="palace-view" class="court-view"><h2 class="visually-hidden">${palace.name}</h2><div id="palace-stage" class="image-stage">${header}<img id="palace-image" src="${images.backgrounds[COURT_PALACE]}" alt="${palace.imageAlt}"><div id="court-row"><div id="department-row">${departments}</div>${leave}</div></div></main>`;
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
  const wages = screen.economy.wages + screen.economy.soldierWages + screen.economy.legionWages > 0 ? `<p id="summary-wages">${formatWages(screen.economy.wages, screen.economy.soldierWages, screen.economy.legionWages)}</p>` : '';
  const training = screen.training === null ? '' : `<p id="summary-training">${formatTrainingChange(screen.training)}</p>`;
  const completedNames = screen.state.works.buildings
    .filter((b) => screen.completed.includes(b.id))
    .map((b) => escapeHtml(buildingName(game, b.id)));
  const completed =
    completedNames.length > 0 ? `<p id="summary-completed">${text.completedLabel}：${completedNames.join('、')}</p>` : '';
  return `${renderHeader(screen.state, text, game)}<main id="turn-summary"><h2>${ended}${text.summarySuffix}</h2><p id="summary-action">${game.actions[screen.actionId].name}：${formatChanges(screen.changes)}</p><p id="summary-totals">${formatChanges(screen.totals)}</p><p id="summary-treasury">${formatEconomy(screen.economy)}</p>${wages}${training}${completed}<ul id="summary-regions">${regionLines}</ul><button type="button" id="next-turn">${text.nextTurnPrefix}${next}</button></main>`;
}

export function renderAtlasScreen(screen: Of<'atlas'>, text: UiText, game: GameText): string {
  const nationOf = (id: string) => game.nations.find((n) => n.id === id);
  const chosen = screen.state.regions
    .map((r) => ({ state: r, entry: game.regions.find((g) => g.id === r.id) }))
    .find((d) => d.state.id === screen.region && d.entry);
  const panel =
    chosen && chosen.entry
      ? `<section id="region-panel"><h3 id="region-panel-name">${escapeHtml(chosen.entry.name)}</h3><dl><dt>${text.ownerLabel}</dt><dd id="region-owner">${escapeHtml(nationOf(chosen.state.owner)?.name ?? chosen.state.owner)}</dd><dt>${game.statLabels.morale}</dt><dd id="region-morale">${chosen.state.stats.morale}</dd><dt>${game.statLabels.population}</dt><dd id="region-population">${formatAmount(chosen.state.stats.population)}</dd><dt>${game.statLabels.prosperity}</dt><dd id="region-prosperity">${chosen.state.stats.prosperity}</dd></dl><button type="button" id="close-region-panel">${text.closeRegionPanel}</button></section>`
      : `<p id="atlas-hint">${text.atlasHint}</p>`;
  const map = renderWorldMap(screen.state, text, game, screen.region === undefined ? { kind: 'atlas' } : { kind: 'atlas', region: screen.region });
  return `${renderHeader(screen.state, text, game)}<main id="atlas"><h2>${text.atlasHeading}</h2>${map}${panel}<button type="button" id="close-atlas">${text.closeAtlas}</button></main>`;
}

const POST_GROUPS = [
  ['central', 'postGroupCentral'],
  ['ministry', 'postGroupMinistry'],
  ['region', 'postGroupRegion'],
] as const satisfies readonly (readonly [PostInfo['group'], keyof UiText])[];

function statCells(official: Official): string {
  return OFFICIAL_STAT_IDS.map((stat) => `<td>${official.stats[stat]}</td>`).join('');
}

function renderPostGroups(state: GameState, text: UiText, game: GameText): string {
  const posts = listPosts(state);
  const head = `<tr><th>${text.postColumn}</th><th>${text.holderColumn}</th>${OFFICIAL_STAT_IDS.map((stat) => `<th>${game.statLabels[stat]}</th>`).join('')}</tr>`;
  const sections = POST_GROUPS.map(([group, heading]) => {
    const rows = posts
      .filter((post) => post.group === group)
      .map((post) => {
        const holder = state.officials.find((o) => o.post === post.id);
        const cells = holder
          ? `<td>${escapeHtml(holder.name)}</td>${statCells(holder)}`
          : `<td class="vacant">${text.vacant}</td>${'<td></td>'.repeat(OFFICIAL_STAT_IDS.length)}`;
        return `<tr data-post-row="${escapeHtml(post.id)}"><th scope="row"><button type="button" id="post-${escapeHtml(post.id)}" data-post="${escapeHtml(post.id)}">${escapeHtml(formatPostName(post))}</button></th>${cells}</tr>`;
      })
      .join('');
    return `<section id="post-group-${group}"><h3>${text[heading]}</h3><div class="table-scroll"><table class="post-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div></section>`;
  }).join('');
  return `<div id="post-groups">${sections}</div>`;
}

function renderIdleList(screen: Of<'appoint'>, post: PostInfo, text: UiText, game: GameText): string {
  const { state, sort } = screen;
  const holder = state.officials.find((o) => o.post === post.id);
  const heading = `<h3 id="selected-post">${escapeHtml(formatPostName(post))}　${text.holderColumn}：${holder ? escapeHtml(holder.name) : text.vacant}</h3>`;
  const idle = idleOfficials(state, sort);
  const list =
    idle.length === 0
      ? `<p id="no-idle">${text.noIdleOfficials}</p>`
      : `<div class="table-scroll"><table id="idle-list"><thead><tr><th>${text.nameColumn}</th>${OFFICIAL_STAT_IDS.map(
          (stat) =>
            `<th><button type="button" id="sort-${stat}" data-sort="${stat}" aria-pressed="${stat === sort}">${game.statLabels[stat]}</button></th>`,
        ).join('')}<th></th></tr></thead><tbody>${idle
          .map(
            (o) =>
              `<tr><th scope="row">${escapeHtml(o.name)}</th>${statCells(o)}<td><button type="button" id="appoint-${escapeHtml(o.id)}" data-official="${escapeHtml(o.id)}">${text.appointButton}</button></td></tr>`,
          )
          .join('')}</tbody></table></div>`;
  return `${heading}${list}<button type="button" id="back-to-posts">${text.backToPosts}</button>`;
}

export function renderAppointScreen(screen: Of<'appoint'>, text: UiText, game: GameText): string {
  const post = screen.post === undefined ? undefined : listPosts(screen.state).find((p) => p.id === screen.post);
  const body = post ? renderIdleList(screen, post, text, game) : renderPostGroups(screen.state, text, game);
  return `${renderHeader(screen.state, text, game)}<main id="appoint-screen"><h2>${text.appointHeading}</h2>${body}<button type="button" id="back-to-court">${text.backToCourt}</button></main>`;
}

export function renderRecommendScreen(screen: Of<'recommend'>, text: UiText, game: GameText): string {
  const { state } = screen;
  const rec = state.recommendation;
  const candidate = rec !== null && rec.turn === state.turn ? rec.candidate : null;
  const back = `<button type="button" id="back-to-court">${text.backToCourt}</button>`;
  let body: string;
  if (candidate === null) {
    body = `<p id="no-candidate">${text.noCandidate}</p>${back}`;
  } else {
    const mark = candidate.notable === null ? '' : `<span class="notable-mark">${text.notableMark}</span>`;
    const data = candidate.notable === null ? '' : ` data-notable="${escapeHtml(candidate.notable)}"`;
    const head = OFFICIAL_STAT_IDS.map((stat) => `<th>${game.statLabels[stat]}</th>`).join('');
    const cells = OFFICIAL_STAT_IDS.map((stat) => `<td>${candidate.stats[stat]}</td>`).join('');
    body = `<div id="candidate"${data}><h3 id="candidate-name">${escapeHtml(candidate.name)}${mark}</h3><div class="table-scroll"><table id="candidate-stats"><thead><tr>${head}</tr></thead><tbody><tr>${cells}</tr></tbody></table></div></div><div id="candidate-actions"><button type="button" id="accept-candidate">${text.acceptCandidate}</button><button type="button" id="decline-candidate">${text.declineCandidate}</button></div>`;
  }
  return `${renderHeader(state, text, game)}<main id="recommend-screen"><h2>${text.recommendHeading}</h2>${body}</main>`;
}

export function renderExamScreen(screen: Of<'exam'>, text: UiText, game: GameText): string {
  const { state, picks, sort } = screen;
  const candidates = examCandidates(state, sort);
  let body: string;
  if (candidates.length === 0) {
    body = `<p id="no-exam-candidates">${text.noExamCandidates}</p><button type="button" id="back-to-court">${text.backToCourt}</button>`;
  } else {
    const head = `<tr><th>${text.examPickColumn}</th><th>${text.nameColumn}</th>${OFFICIAL_STAT_IDS.map(
      (stat) =>
        `<th><button type="button" id="exam-sort-${stat}" data-exam-sort="${stat}" aria-pressed="${stat === sort}">${game.statLabels[stat]}</button></th>`,
    ).join('')}</tr>`;
    const rows = candidates
      .map(({ index, candidate }) => {
        const name = escapeHtml(candidate.name);
        const data = candidate.notable === null ? '' : ` data-notable="${escapeHtml(candidate.notable)}"`;
        const mark = candidate.notable === null ? '' : `<span class="notable-mark">${text.notableMark}</span>`;
        const checked = picks.includes(index) ? ' checked' : '';
        return `<tr data-exam-row="${index}"${data}><td><input type="checkbox" id="exam-pick-${index}" data-exam-pick="${index}" aria-label="${name}"${checked}></td><th scope="row">${name}${mark}</th>${OFFICIAL_STAT_IDS.map((stat) => `<td>${candidate.stats[stat]}</td>`).join('')}</tr>`;
      })
      .join('');
    body = `<p id="exam-picked">${text.examPicked}：${picks.length}</p><div class="table-scroll"><table id="exam-list"><thead>${head}</thead><tbody>${rows}</tbody></table></div><button type="button" id="confirm-exam">${text.confirmExamButton}</button>`;
  }
  return `${renderHeader(state, text, game)}<main id="exam-screen"><h2>${text.examHeading}</h2>${body}</main>`;
}

function buildingName(game: GameText, id: string): string {
  return game.buildings.find((b) => b.id === id)?.name ?? id;
}

function renderPicker(count: number, limit: number, step: number, maxLabel: string, text: UiText): string {
  return `<div id="count-picker"><button type="button" id="count-down" aria-label="${text.countDownLabel}"${count <= step ? ' disabled' : ''}>${text.countDown}</button><span id="count-value" aria-label="${text.countLabel}">${formatArtisans(count)}</span><button type="button" id="count-up" aria-label="${text.countUpLabel}"${count >= limit ? ' disabled' : ''}>${text.countUp}</button><button type="button" id="count-max">${maxLabel}</button></div>`;
}

export function renderRecruitScreen(screen: Of<'recruit'>, text: UiText, game: GameText): string {
  const { state, count } = screen;
  const max = maxRecruit(state);
  return `${renderHeader(state, text, game)}<main id="recruit-screen"><h2>${text.recruitHeading}</h2><p id="artisan-total">${text.artisanTotalLabel}：${formatArtisans(state.works.artisans)}</p><p id="free-population">${text.freePopulationLabel}：${formatArtisans(freePopulation(state))}</p><p id="recruit-max-line">${text.recruitMaxLabel}：${formatArtisans(max)}</p>${renderPicker(count, max, countStep(screen), text.recruitMax, text)}<button type="button" id="confirm-recruit">${text.confirmRecruit}</button><button type="button" id="back-to-court">${text.backToCourt}</button></main>`;
}

export function renderConscriptScreen(screen: Of<'conscript'>, text: UiText, game: GameText): string {
  const { state, count } = screen;
  const max = maxConscript(state);
  return `${renderHeader(state, text, game)}<main id="conscript-screen"><h2>${text.conscriptHeading}</h2><p id="soldier-total">${text.soldierTotalLabel}：${formatArtisans(state.army.soldiers)}</p><p id="free-population">${text.freePopulationLabel}：${formatArtisans(freePopulation(state))}</p><p id="conscript-max-line">${text.recruitMaxLabel}：${formatArtisans(max)}</p><p id="conscript-hint">${text.conscriptHint}</p>${renderPicker(count, max, countStep(screen), text.recruitMax, text)}<button type="button" id="confirm-conscript">${text.confirmConscript}</button><button type="button" id="back-to-court">${text.backToCourt}</button></main>`;
}

function renderLegionPanel(state: GameState, legionId: string, text: UiText, game: GameText): string {
  const l = findLegion(state, legionId);
  if (!l) return '';
  const general = state.officials.find((o) => o.id === l.general);
  const regionName = game.regions.find((r) => r.id === l.region)?.name ?? l.region;
  const status =
    l.route === null
      ? text.stationedStatus
      : `${text.returningPrefix}${formatChineseNumber(l.route.length)}${text.returningSuffix}`;
  let orders = '';
  if (l.route === null) {
    const moves = legionMoves(state, game.regions, l.id);
    const move =
      moves.length > 0
        ? `<p id="move-hint">${text.moveHint}</p>`
        : l.movedTurn === state.turn
        ? `<p id="legion-moved">${text.movedThisTurn}</p>`
        : `<p id="legion-no-moves">${text.noMoves}</p>`;
    const atCapital = l.region === capitalRegion(game.regions);
    const hint = atCapital ? `<p id="recall-hint">${text.recallDisbandHint}</p>` : '';
    const recall = canRecall(state, game.regions, l.id)
      ? `<button type="button" id="recall-legion">${text.recallButton}</button>`
      : `<button type="button" id="recall-legion" disabled>${text.recallButton}<span class="court-option-tag">${text.noRoute}</span></button>`;
    orders = `${move}${hint}${recall}`;
  }
  return `<section id="legion-panel"><h3 id="legion-panel-name">${escapeHtml(formatLegionName(l.name))}</h3><dl><dt>${text.generalLabel}</dt><dd id="legion-general">${escapeHtml(general?.name ?? '')}</dd><dt>${text.legionSoldiersLabel}</dt><dd id="legion-soldiers">${formatArtisans(l.soldiers)}</dd><dt>${text.trainingLabel}</dt><dd id="legion-training">${l.training}</dd><dt>${text.legionRegionLabel}</dt><dd id="legion-region">${escapeHtml(regionName)}</dd><dt>${text.legionStatusLabel}</dt><dd id="legion-status">${status}</dd></dl>${orders}<button type="button" id="close-legion-panel">${text.closeLegionPanel}</button></section>`;
}

export function renderDeployScreen(screen: Of<'deploy'>, text: UiText, game: GameText): string {
  const { state, legion } = screen;
  const moves = legion === undefined ? [] : legionMoves(state, game.regions, legion);
  const map = renderWorldMap(state, text, game, legion === undefined ? { kind: 'deploy', moves } : { kind: 'deploy', legion, moves });
  const panel =
    state.army.legions.length === 0
      ? `<p id="deploy-empty">${text.noLegions}</p>`
      : legion !== undefined && state.army.legions.some((l) => l.id === legion)
      ? renderLegionPanel(state, legion, text, game)
      : `<p id="deploy-hint">${text.deployHint}</p>`;
  return `${renderHeader(state, text, game)}<main id="deploy-screen"><h2>${text.deployHeading}</h2>${map}${panel}<button type="button" id="back-to-court">${text.backToCourt}</button></main>`;
}

export function renderLegionScreen(screen: Of<'legion'>, text: UiText, game: GameText): string {
  const { state, count, general, draft, error } = screen;
  const max = maxLegionSoldiers(state);
  const head = `<tr><th>${text.nameColumn}</th>${OFFICIAL_STAT_IDS.map((stat) => `<th>${game.statLabels[stat]}</th>`).join('')}<th></th></tr>`;
  const rows = idleOfficials(state)
    .map((o, i) => {
      const chosen = o.id === general;
      return `<tr${chosen ? ' class="is-chosen"' : ''}><th scope="row">${escapeHtml(o.name)}</th>${statCells(o)}<td><button type="button" id="legion-general-${i}" data-general="${escapeHtml(o.id)}" aria-pressed="${chosen}">${text.chooseGeneral}</button></td></tr>`;
    })
    .join('');
  const generals =
    rows === ''
      ? `<p id="no-idle">${text.noIdleOfficials}</p>`
      : `<div class="table-scroll"><table id="legion-generals"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  const suggestions = screen.suggestions
    .map(
      (name, i) =>
        `<button type="button" id="legion-suggestion-${i}" data-legion-name="${escapeHtml(name)}">${escapeHtml(formatLegionName(name))}</button>`,
    )
    .join('');
  const message = error === undefined ? '' : `<p id="legion-error" role="alert">${error === 'name-taken' ? text.legionNameTaken : text.legionNameError}</p>`;
  return `${renderHeader(state, text, game)}<main id="legion-screen"><h2>${text.legionHeading}</h2><p id="legion-pool">${text.soldierTotalLabel}：${formatArtisans(state.army.soldiers)}</p><p id="legion-training">${text.trainingLabel}：${state.army.training}</p><p id="legion-max-line">${text.legionMaxLabel}：${formatArtisans(max)}</p><h3>${text.generalHeading}</h3>${generals}<h3>${text.legionSizeHeading}</h3>${renderPicker(count, max, countStep(screen), text.recruitMax, text)}<h3>${text.legionNameHeading}</h3><div id="legion-suggestions">${suggestions}</div><label for="legion-name-input">${text.legionNameInputLabel}</label><div id="legion-name-row"><input type="text" id="legion-name-input" maxlength="4" value="${escapeHtml(draft)}" autocomplete="off"><span>${text.legionSuffix}</span></div>${message}<button type="button" id="confirm-legion"${general === undefined ? ' disabled' : ''}>${text.confirmLegion}</button><button type="button" id="back-to-court">${text.backToCourt}</button></main>`;
}

export function renderDrillScreen(screen: Of<'drill'>, text: UiText, game: GameText): string {
  const { state } = screen;
  const left = drillTurnsLeft(state);
  const status =
    left > 0
      ? `<p id="drill-remaining">${text.drillingPrefix}${formatChineseNumber(left)}${text.drillingSuffix}</p>`
      : `<p id="drill-hint">${text.drillHintPrefix}${formatTaels(BALANCE.army.drillCost)}${text.drillHintSuffix}</p>`;
  return `${renderHeader(state, text, game)}<main id="drill-screen"><h2>${text.drillHeading}</h2><p id="soldier-total">${text.soldierTotalLabel}：${formatArtisans(state.army.soldiers)}</p><p id="soldier-training">${text.trainingLabel}：${state.army.training}</p>${status}<button type="button" id="confirm-drill"${left > 0 ? ' disabled' : ''}>${text.confirmDrill}</button><button type="button" id="back-to-court">${text.backToCourt}</button></main>`;
}

export function renderDischargeScreen(screen: Of<'discharge'>, text: UiText, game: GameText): string {
  const { state, count } = screen;
  return `${renderHeader(state, text, game)}<main id="discharge-screen"><h2>${text.dischargeHeading}</h2><p id="soldier-total">${text.soldierTotalLabel}：${formatArtisans(state.army.soldiers)}</p>${renderPicker(count, state.army.soldiers, countStep(screen), text.dischargeAll, text)}<button type="button" id="confirm-discharge">${text.confirmDischarge}</button><button type="button" id="back-to-court">${text.backToCourt}</button></main>`;
}

export function renderReleaseScreen(screen: Of<'release'>, text: UiText, game: GameText): string {
  const { state, count } = screen;
  const idle = idleArtisans(state);
  return `${renderHeader(state, text, game)}<main id="release-screen"><h2>${text.releaseHeading}</h2><p id="artisan-total">${text.artisanTotalLabel}：${formatArtisans(state.works.artisans)}</p><p id="artisan-idle">${text.idleArtisansLabel}：${formatArtisans(idle)}</p>${renderPicker(count, idle, countStep(screen), text.releaseAll, text)}<button type="button" id="confirm-release">${text.confirmRelease}</button><button type="button" id="back-to-court">${text.backToCourt}</button></main>`;
}

export function renderBuildScreen(screen: Of<'build'>, text: UiText, game: GameText): string {
  const { state } = screen;
  const idle = idleArtisans(state);
  const rows = state.works.buildings
    .map((b) => {
      const status = buildingStatus(b);
      const entry = game.buildings.find((g) => g.id === b.id);
      const name = escapeHtml(entry?.name ?? b.id);
      const description = entry ? `<span class="building-description">${escapeHtml(entry.description)}</span>` : '';
      let statusText: string;
      if (status === 'not-started') statusText = text.statusNotStarted;
      else if (status === 'completed') statusText = text.statusCompleted;
      else {
        const left = halfSeasonsToFinish(b);
        const eta = left === null ? text.pausedMark : `${text.etaPrefix}${left}${text.etaSuffix}`;
        statusText = `${text.statusInProgress} ${formatAmount(b.progress)} / ${formatAmount(b.required)}（${eta}）`;
      }
      const id = escapeHtml(b.id);
      const assign =
        status === 'completed'
          ? ''
          : `<button type="button" id="assign-down-${id}" data-assign="${id}" data-direction="-1" aria-label="${text.countDownLabel}"${b.assigned <= 0 ? ' disabled' : ''}>${text.countDown}</button> ${formatAmount(b.assigned)} <button type="button" id="assign-up-${id}" data-assign="${id}" data-direction="1" aria-label="${text.countUpLabel}"${idle <= 0 ? ' disabled' : ''}>${text.countUp}</button>`;
      return `<tr data-building-row="${id}" data-status="${status}"><th scope="row">${name}${description}</th><td>${formatAmount(b.required)}</td><td>${statusText}</td><td class="assign-cell">${assign}</td></tr>`;
    })
    .join('');
  const head = `<tr><th>${text.buildingColumn}</th><th>${text.requiredColumn}</th><th>${text.statusColumn}</th><th>${text.assignedColumn}</th></tr>`;
  return `${renderHeader(state, text, game)}<main id="build-screen"><h2>${text.buildHeading}</h2><p id="artisan-total">${text.artisanTotalLabel}：${formatArtisans(state.works.artisans)}</p><p id="artisan-idle">${text.idleArtisansLabel}：${formatArtisans(idle)}</p><div class="table-scroll"><table id="building-list"><thead>${head}</thead><tbody>${rows}</tbody></table></div><button type="button" id="back-to-court">${text.backToCourt}</button></main>`;
}

function sumTaels(rows: { tax: number }[]): number {
  return rows.reduce((total, row) => total + row.tax, 0);
}

export function renderTaxPreview(
  state: GameState,
  level: TaxLevelId,
  text: UiText,
  game: GameText,
): { level: string; expected: string } {
  return {
    level: `${text.taxLevelLabel}：${game.taxLevels[level].name}`,
    expected: `${text.expectedTaxLabel}：${formatTaels(sumTaels(expectedTax(state, level)))}`,
  };
}

export function renderTaxScreen(screen: Of<'taxes'>, text: UiText, game: GameText): string {
  const { state } = screen;
  const level = state.revenue.taxLevel;
  const preview = renderTaxPreview(state, level, text, game);
  const notches = TAX_LEVEL_IDS.map((_, i) => `<option value="${i}"></option>`).join('');
  const names = TAX_LEVEL_IDS.map((id) => `<span>${game.taxLevels[id].name}</span>`).join('');
  return `${renderHeader(state, text, game)}<main id="tax-screen"><h2>${text.taxHeading}</h2><p id="tax-hint">${text.taxHint}</p><input type="range" id="tax-slider" min="0" max="${TAX_LEVEL_IDS.length - 1}" step="1" value="${TAX_LEVEL_IDS.indexOf(level)}" list="tax-notches" aria-label="${text.taxSliderLabel}"><datalist id="tax-notches">${notches}</datalist><div id="tax-level-names">${names}</div><p id="tax-level">${preview.level}</p><p id="tax-expected">${preview.expected}</p><button type="button" id="back-to-court">${text.backToCourt}</button></main>`;
}

export function renderLevyScreen(screen: Of<'levy'>, text: UiText, game: GameText): string {
  const { state, gained } = screen;
  const body =
    gained === undefined
      ? `<p id="levy-hint">${text.levyHintPrefix}${formatTaels(levyAmount(state))}${text.levyHintSuffix}</p><button type="button" id="confirm-levy">${text.confirmLevy}</button><button type="button" id="back-to-court">${text.levyBack}</button>`
      : `<p id="levy-result">${text.levyResultLabel}：${formatTaels(gained)}</p><button type="button" id="back-to-court">${text.backToCourt}</button>`;
  return `${renderHeader(state, text, game)}<main id="levy-screen"><h2>${text.levyHeading}</h2>${body}</main>`;
}

export function renderSacrificeScreen(screen: Of<'sacrifice'>, text: UiText, game: GameText): string {
  return `${renderHeader(screen.state, text, game)}<main id="sacrifice-screen"><h2>${text.sacrificeHeading}</h2><p id="sacrifice-hint">${text.sacrificeHint}</p><button type="button" id="confirm-sacrifice">${text.confirmSacrifice}</button><button type="button" id="back-to-court">${text.sacrificeBack}</button></main>`;
}

export function renderBudgetScreen(screen: Of<'budget'>, text: UiText, game: GameText): string {
  const { state } = screen;
  const rows = expectedTax(state);
  const body = rows
    .map(({ region, tax }) => {
      const name = game.regions.find((g) => g.id === region)?.name ?? region;
      return `<tr data-region="${escapeHtml(region)}"><th scope="row">${escapeHtml(name)}</th><td>${formatTaels(tax)}</td></tr>`;
    })
    .join('');
  const head = `<tr><th>${text.regionColumn}</th><th>${text.expectedTaxColumn}</th></tr>`;
  const total = `<tr id="budget-total"><th scope="row">${text.totalRow}</th><td>${formatTaels(sumTaels(rows))}</td></tr>`;
  const upkeep = formatTaels((BALANCE.upkeep * BALANCE.turnsPerYear) / 2);
  return `${renderHeader(state, text, game)}<main id="budget-screen"><h2>${text.budgetHeading}</h2><p id="budget-treasury">${game.statLabels.treasury}：${formatTaels(state.nation.treasury)}</p><p id="budget-level">${text.currentTaxLabel}：${game.taxLevels[state.revenue.taxLevel].name}</p><table id="budget-table"><thead>${head}</thead><tbody>${body}${total}</tbody></table><p id="budget-upkeep">${text.halfYearUpkeepLabel}：${upkeep}</p><p id="budget-next">${text.nextCollectionLabel}：${game.halfSeasonLabels[nextCollection(state)]}</p><button type="button" id="back-to-court">${text.backToCourt}</button></main>`;
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
      return renderPlayScreen(screen, text, game, images);
    case 'result':
      return renderResultScreen(screen, text, game);
    case 'summary':
      return renderSummaryScreen(screen, text, game);
    case 'atlas':
      return renderAtlasScreen(screen, text, game);
    case 'appoint':
      return renderAppointScreen(screen, text, game);
    case 'recommend':
      return renderRecommendScreen(screen, text, game);
    case 'exam':
      return renderExamScreen(screen, text, game);
    case 'recruit':
      return renderRecruitScreen(screen, text, game);
    case 'release':
      return renderReleaseScreen(screen, text, game);
    case 'conscript':
      return renderConscriptScreen(screen, text, game);
    case 'discharge':
      return renderDischargeScreen(screen, text, game);
    case 'legion':
      return renderLegionScreen(screen, text, game);
    case 'deploy':
      return renderDeployScreen(screen, text, game);
    case 'drill':
      return renderDrillScreen(screen, text, game);
    case 'build':
      return renderBuildScreen(screen, text, game);
    case 'taxes':
      return renderTaxScreen(screen, text, game);
    case 'levy':
      return renderLevyScreen(screen, text, game);
    case 'sacrifice':
      return renderSacrificeScreen(screen, text, game);
    case 'budget':
      return renderBudgetScreen(screen, text, game);
    case 'ending':
      return renderEndingScreen(screen, text, game);
  }
}
