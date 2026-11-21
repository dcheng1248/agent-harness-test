import type { GameText, UiText } from '@emperor/content';
import { formatLegionName } from '@emperor/content';
import type { GameState, Legion } from '@emperor/core';
import { escapeHtml } from './render';

export type WorldMapMode =
  | { kind: 'atlas'; region?: string }
  | { kind: 'deploy'; legion?: string; moves: readonly string[] };

function marker(legion: Legion, text: UiText, mode: WorldMapMode): string {
  const returning = legion.route !== null;
  const label = escapeHtml(formatLegionName(legion.name));
  const tag = returning ? `<span class="legion-tag">${text.returningTag}</span>` : '';
  const id = escapeHtml(legion.id);
  if (mode.kind === 'atlas') {
    return `<span class="legion-marker${returning ? ' returning' : ''}" data-legion="${id}">${label}${tag}</span>`;
  }
  const selected = legion.id === mode.legion;
  return `<button type="button" class="legion-marker${returning ? ' returning' : ''}${selected ? ' selected' : ''}" data-legion="${id}" aria-pressed="${selected}">${label}${tag}</button>`;
}

/** The 輿圖 grid, the 軍團 markers and the legend, for 輿圖 and 調兵遣將. */
export function renderWorldMap(state: GameState, text: UiText, game: GameText, mode: WorldMapMode): string {
  const nationOf = (id: string) => game.nations.find((n) => n.id === id);
  const drawn = state.regions.flatMap((r) => {
    const entry = game.regions.find((g) => g.id === r.id);
    return entry ? [{ state: r, entry }] : [];
  });
  const cols = Math.max(0, ...drawn.map((d) => d.entry.cell.x + 1));
  const rows = Math.max(0, ...drawn.map((d) => d.entry.cell.y + 1));
  const cells: string[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const place = `grid-column:${x + 1};grid-row:${y + 1}`;
      const found = drawn.find((d) => d.entry.cell.x === x && d.entry.cell.y === y);
      if (!found) {
        cells.push(`<div class="map-cell map-empty" aria-hidden="true" style="${place}"></div>`);
        continue;
      }
      const id = escapeHtml(found.state.id);
      const color = nationOf(found.state.owner)?.color;
      const background = color === undefined ? '' : `;background:${escapeHtml(color)}`;
      const mark = found.entry.capital ? `<span class="capital-mark">${text.capitalMark}</span>` : '';
      const markers = state.army.legions
        .filter((l) => l.region === found.state.id)
        .map((l) => marker(l, text, mode))
        .join('');
      const name = escapeHtml(found.entry.name);
      if (mode.kind === 'atlas') {
        const selected = found.state.id === mode.region;
        cells.push(
          `<button type="button" class="map-cell${selected ? ' selected' : ''}" data-region="${id}" aria-pressed="${selected}" style="${place}${background}">${name}${mark}${markers}</button>`,
        );
      } else {
        const dest = mode.moves.includes(found.state.id);
        const move = dest ? `<button type="button" class="move-here" data-move-to="${id}">${text.moveButton}</button>` : '';
        cells.push(
          `<div class="map-cell${dest ? ' is-destination' : ''}" data-cell="${id}" style="${place}${background}">${name}${mark}${markers}${move}</div>`,
        );
      }
    }
  }
  const container =
    mode.kind === 'atlas'
      ? `<div id="atlas-map" role="group" aria-label="${text.atlasMapLabel}" style="--cols:${cols}">${cells.join('')}</div>`
      : `<div id="deploy-map" role="group" aria-label="${text.deployMapLabel}" style="--cols:${cols}">${cells.join('')}</div>`;
  const legend = game.nations
    .map((n) => `<li data-nation="${escapeHtml(n.id)}"><span class="legend-swatch" style="background:${escapeHtml(n.color)}"></span>${escapeHtml(n.name)}</li>`)
    .join('');
  return `${container}<section id="map-legend"><h3>${text.legendHeading}</h3><ul>${legend}</ul></section>`;
}
