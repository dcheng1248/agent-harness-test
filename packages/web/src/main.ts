import { gameText, uiText } from '@emperor/content';
import { TAX_LEVEL_IDS } from '@emperor/core';
import type { ActionId, CourtOptionId, DepartmentId, OfficialStatId, PalaceId } from '@emperor/core';
import titleImage from './assets/title-forbidden-city.webp';
import mapImage from './assets/map-forbidden-city.webp';
import scrollImage from './assets/title-scroll.webp';
import { placeCourtOptions } from './courtOptions';
import { PALACE_BACKGROUNDS } from './palaceBackgrounds';
import { renderScreen, renderTaxPreview } from './render';
import {
  acceptRecommendation,
  appoint,
  backToCourt,
  cancelPost,
  chooseCourtOption,
  changeAssignment,
  chooseEraName,
  closeAtlas,
  confirmExamPicks,
  confirmLevy,
  confirmSacrifice,
  confirmRecruit,
  confirmConscript,
  confirmDischarge,
  confirmRelease,
  continueToMap,
  declineRecommendation,
  goToMap,
  goToPalace,
  maxCount,
  openAtlas,
  selectAtlasRegion,
  performAction,
  restart,
  selectPost,
  setTax,
  sortExam,
  sortIdle,
  startGame,
  stepCount,
  toggleDepartment,
  toggleExamPick,
  type Screen,
} from './screen';
import './style.css';

const root = document.querySelector<HTMLElement>('#app');

if (root) {
  let current: Screen = { screen: 'title' };
  const placeCourtList = (): void => {
    const list = root.querySelector<HTMLElement>('#court-options');
    const row = root.querySelector<HTMLElement>('#department-row');
    const image = root.querySelector<HTMLElement>('#palace-image');
    const button = root.querySelector<HTMLElement>('#department-row button.is-open');
    if (!list || !row || !image || !button) return;
    const { left, caretX } = placeCourtOptions(
      row.getBoundingClientRect(),
      button.getBoundingClientRect(),
      image.getBoundingClientRect(),
      list.offsetWidth,
    );
    list.style.left = `${left}px`;
    list.style.setProperty('--caret-x', `${caretX}px`);
  };
  const draw = (): void => {
    root.innerHTML = renderScreen(current, uiText, gameText, {
      palace: titleImage, scroll: scrollImage, map: mapImage,
      backgrounds: PALACE_BACKGROUNDS,
    });
    placeCourtList();
    const image = root.querySelector<HTMLImageElement>('#palace-image');
    if (image && !image.complete) image.addEventListener('load', placeCourtList, { once: true });
  };
  const confirmTyped = (): void => {
    const input = root.querySelector<HTMLInputElement>('#era-input');
    current = chooseEraName(current, input?.value ?? '', gameText.regions, gameText.officialNames, gameText.buildings);
    draw();
    if (current.screen === 'era') root.querySelector<HTMLInputElement>('#era-input')?.focus();
  };

  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    const hit = (selector: string): HTMLElement | null => target.closest<HTMLElement>(selector);
    let handled = true;
    if (hit('#start')) {
      current = startGame(crypto.getRandomValues(new Uint32Array(1))[0] ?? 0, gameText.eraNamePool);
    } else if (hit('#era-confirm')) {
      confirmTyped();
      return;
    } else if (hit('[data-era]')) {
      current = chooseEraName(current, hit('[data-era]')?.dataset.era ?? '', gameText.regions, gameText.officialNames, gameText.buildings);
    } else if (hit('[data-palace]')) {
      current = goToPalace(current, hit('[data-palace]')?.dataset.palace as PalaceId);
    } else if (hit('[data-department]')) {
      current = toggleDepartment(current, hit('[data-department]')?.dataset.department as DepartmentId);
    } else if (hit('[data-court-option]')) {
      current = chooseCourtOption(
        current,
        hit('[data-court-option]')?.dataset.courtOption as CourtOptionId,
        gameText.notables,
        gameText.officialNames,
      );
    } else if (hit('#atlas-map [data-region]')) {
      current = selectAtlasRegion(current, hit('#atlas-map [data-region]')?.dataset.region ?? '');
    } else if (hit('#close-region-panel')) {
      current = selectAtlasRegion(current, null);
    } else if (hit('[data-post]')) {
      current = selectPost(current, hit('[data-post]')?.dataset.post ?? '');
    } else if (hit('[data-sort]')) {
      current = sortIdle(current, hit('[data-sort]')?.dataset.sort as OfficialStatId);
    } else if (hit('[data-official]')) {
      current = appoint(current, hit('[data-official]')?.dataset.official ?? '');
    } else if (hit('#accept-candidate')) {
      current = acceptRecommendation(current);
    } else if (hit('#decline-candidate')) {
      current = declineRecommendation(current);
    } else if (hit('#back-to-posts')) {
      current = cancelPost(current);
    } else if (hit('#back-to-court')) {
      current = backToCourt(current);
    } else if (hit('#leave-court')) {
      current = goToMap(current);
    } else if (hit('[data-exam-pick]')) {
      current = toggleExamPick(current, Number(hit('[data-exam-pick]')?.dataset.examPick));
    } else if (hit('[data-exam-sort]')) {
      current = sortExam(current, hit('[data-exam-sort]')?.dataset.examSort as OfficialStatId);
    } else if (hit('#confirm-exam')) {
      current = confirmExamPicks(current);
    } else if (hit('#count-down')) {
      current = stepCount(current, -1);
    } else if (hit('#count-up')) {
      current = stepCount(current, 1);
    } else if (hit('#count-max')) {
      current = maxCount(current);
    } else if (hit('#confirm-recruit')) {
      current = confirmRecruit(current);
    } else if (hit('#confirm-conscript')) {
      current = confirmConscript(current);
    } else if (hit('#confirm-discharge')) {
      current = confirmDischarge(current);
    } else if (hit('#confirm-levy')) {
      current = confirmLevy(current);
    } else if (hit('#confirm-sacrifice')) {
      current = confirmSacrifice(current);
    } else if (hit('#confirm-release')) {
      current = confirmRelease(current);
    } else if (hit('[data-assign]')) {
      const button = hit('[data-assign]');
      current = changeAssignment(current, button?.dataset.assign ?? '', Number(button?.dataset.direction) as 1 | -1);
    } else if (hit('[data-action]')) {
      current = performAction(current, hit('[data-action]')?.dataset.action as ActionId);
    } else if (hit('#open-atlas')) {
      current = openAtlas(current);
    } else if (hit('#close-atlas')) {
      current = closeAtlas(current);
    } else if (hit('#back-to-map')) {
      current = goToMap(current);
    } else if (hit('#continue') || hit('#next-turn')) {
      current = continueToMap(current);
    } else if (hit('#restart')) {
      current = restart();
    } else {
      handled = false;
    }
    if (handled) draw();
  });

  const sliderLevel = (event: Event) => {
    const target = event.target as Element;
    if (target.id !== 'tax-slider' || current.screen !== 'taxes') return undefined;
    return TAX_LEVEL_IDS[Number((target as HTMLInputElement).value)];
  };
  root.addEventListener('input', (event) => {
    const level = sliderLevel(event);
    if (level === undefined || current.screen !== 'taxes') return;
    const preview = renderTaxPreview(current.state, level, uiText, gameText);
    const levelLine = root.querySelector<HTMLElement>('#tax-level');
    const expectedLine = root.querySelector<HTMLElement>('#tax-expected');
    if (levelLine) levelLine.textContent = preview.level;
    if (expectedLine) expectedLine.textContent = preview.expected;
  });
  root.addEventListener('change', (event) => {
    const level = sliderLevel(event);
    if (level === undefined) return;
    current = setTax(current, level);
    draw();
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.target as Element).id === 'era-input') {
      event.preventDefault();
      confirmTyped();
    }
  });
  window.addEventListener('resize', placeCourtList);
  draw();
}
