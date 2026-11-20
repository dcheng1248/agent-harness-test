import { gameText, uiText } from '@emperor/content';
import type { ActionId, PalaceId } from '@emperor/core';
import titleImage from './assets/title-forbidden-city.webp';
import scrollImage from './assets/title-scroll.webp';
import { renderScreen } from './render';
import {
  chooseEraName,
  continueToMap,
  goToMap,
  goToPalace,
  performAction,
  restart,
  startGame,
  type Screen,
} from './screen';
import './style.css';

const root = document.querySelector<HTMLElement>('#app');

if (root) {
  let current: Screen = { screen: 'title' };
  const draw = (): void => {
    root.innerHTML = renderScreen(current, uiText, gameText, { palace: titleImage, scroll: scrollImage });
  };
  const confirmTyped = (): void => {
    const input = root.querySelector<HTMLInputElement>('#era-input');
    current = chooseEraName(current, input?.value ?? '');
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
      current = chooseEraName(current, hit('[data-era]')?.dataset.era ?? '');
    } else if (hit('[data-palace]')) {
      current = goToPalace(current, hit('[data-palace]')?.dataset.palace as PalaceId);
    } else if (hit('[data-action]')) {
      current = performAction(current, hit('[data-action]')?.dataset.action as ActionId);
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
