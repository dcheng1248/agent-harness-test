import { uiText } from '@emperor/content';
import { renderPlaceholder } from './render';

const root = document.querySelector<HTMLElement>('#app');
if (root) root.innerHTML = renderPlaceholder(uiText);
