import { uiText } from '@emperor/content';
import titleImage from './assets/title-forbidden-city.webp';
import scrollImage from './assets/title-scroll.webp';
import { renderScreen } from './render';
import { startGame, type Screen } from './screen';
import './style.css';

const root = document.querySelector<HTMLElement>('#app');

if (root) {
  let current: Screen = { screen: 'title' };
  const draw = (): void => {
    root.innerHTML = renderScreen(current, uiText, { palace: titleImage, scroll: scrollImage });
  };
  root.addEventListener('click', (event) => {
    if ((event.target as Element).closest('#start')) {
      current = startGame(crypto.getRandomValues(new Uint32Array(1))[0] ?? 0);
      draw();
    }
  });
  draw();
}
