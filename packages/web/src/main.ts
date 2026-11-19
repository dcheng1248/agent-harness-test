import { uiText } from '@emperor/content';
import titleImage from './assets/title-forbidden-city.webp';
import { renderTitleScreen } from './render';
import './style.css';

const root = document.querySelector<HTMLElement>('#app');
if (root) root.innerHTML = renderTitleScreen(uiText, titleImage);
