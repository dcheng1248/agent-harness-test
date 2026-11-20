import { gameText, uiText } from '@emperor/content';
import type { ActionId, CourtOptionId, DepartmentId, OfficialStatId, PalaceId } from '@emperor/core';
import titleImage from './assets/title-forbidden-city.webp';
import mapImage from './assets/map-forbidden-city.webp';
import scrollImage from './assets/title-scroll.webp';
import { PALACE_BACKGROUNDS } from './palaceBackgrounds';
import { renderScreen } from './render';
import {
  appoint,
  backToCourt,
  cancelPost,
  chooseCourtOption,
  chooseEraName,
  closeAtlas,
  continueToMap,
  goToMap,
  goToPalace,
  openAtlas,
  performAction,
  restart,
  selectPost,
  sortIdle,
  startGame,
  toggleDepartment,
  type Screen,
} from './screen';
import './style.css';

const root = document.querySelector<HTMLElement>('#app');

if (root) {
  let current: Screen = { screen: 'title' };
  const draw = (): void => {
    root.innerHTML = renderScreen(current, uiText, gameText, {
      palace: titleImage, scroll: scrollImage, map: mapImage,
      backgrounds: PALACE_BACKGROUNDS,
    });
  };
  const confirmTyped = (): void => {
    const input = root.querySelector<HTMLInputElement>('#era-input');
    current = chooseEraName(current, input?.value ?? '', gameText.regions, gameText.officialNames);
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
      current = chooseEraName(current, hit('[data-era]')?.dataset.era ?? '', gameText.regions, gameText.officialNames);
    } else if (hit('[data-palace]')) {
      current = goToPalace(current, hit('[data-palace]')?.dataset.palace as PalaceId);
    } else if (hit('[data-department]')) {
      current = toggleDepartment(current, hit('[data-department]')?.dataset.department as DepartmentId);
    } else if (hit('[data-court-option]')) {
      current = chooseCourtOption(current, hit('[data-court-option]')?.dataset.courtOption as CourtOptionId);
    } else if (hit('[data-post]')) {
      current = selectPost(current, hit('[data-post]')?.dataset.post ?? '');
    } else if (hit('[data-sort]')) {
      current = sortIdle(current, hit('[data-sort]')?.dataset.sort as OfficialStatId);
    } else if (hit('[data-official]')) {
      current = appoint(current, hit('[data-official]')?.dataset.official ?? '');
    } else if (hit('#back-to-posts')) {
      current = cancelPost(current);
    } else if (hit('#back-to-court')) {
      current = backToCourt(current);
    } else if (hit('#leave-court')) {
      current = goToMap(current);
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

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.target as Element).id === 'era-input') {
      event.preventDefault();
      confirmTyped();
    }
  });
  draw();
}
