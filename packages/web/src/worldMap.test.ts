import { describe, expect, it } from 'vitest';
import { gameText, uiText } from '@emperor/content';
import { createInitialState, type GameState, type Legion } from '@emperor/core';
import { renderWorldMap } from './worldMap';

const legion = (over: Partial<Legion>): Legion => ({
  id: 'legion-1',
  name: '征西',
  general: 'x',
  soldiers: 10000,
  training: 50,
  region: 'guanzhong',
  movedTurn: null,
  route: null,
  ...over,
});
const withLegions = (legions: Legion[]): GameState => {
  const s = createInitialState(7, '承平', gameText.regions, gameText.officialNames, gameText.buildings);
  return { ...s, army: { ...s.army, legions } };
};

describe('renderWorldMap', () => {
  it('UC-WEB-006 atlas mode marks stationed and returning 軍團 inside their region buttons', () => {
    const state = withLegions([
      legion({}),
      legion({ id: 'legion-2', name: '平南', region: 'zhongyuan', route: ['guanzhong'] }),
    ]);
    const html = renderWorldMap(state, uiText, gameText, { kind: 'atlas' });
    const cell = (id: string): string => html.match(new RegExp(`<button[^>]*data-region="${id}".*?</button>`))?.[0] ?? '';
    expect(cell('guanzhong')).toContain('<span class="legion-marker" data-legion="legion-1">征西軍</span>');
    expect(cell('zhongyuan')).toMatch(/<span class="legion-marker returning" data-legion="legion-2">平南軍<span class="legion-tag">回師<\/span>/);
    expect(html).not.toContain('<button type="button" class="legion-marker');
    expect(html).toContain('id="atlas-map"');
    expect(html).toContain('id="map-legend"');
  });

  it('UC-WEB-022 deploy mode renders marker buttons and move buttons, with plain cells', () => {
    const state = withLegions([legion({})]);
    const html = renderWorldMap(state, uiText, gameText, { kind: 'deploy', legion: 'legion-1', moves: ['zhongyuan', 'bashu'] });
    expect(html).toContain('id="deploy-map"');
    expect(html).toMatch(/<button[^>]*class="legion-marker selected"[^>]*data-legion="legion-1"[^>]*aria-pressed="true"/);
    expect(html).toContain('data-move-to="zhongyuan"');
    expect(html).toContain('data-move-to="bashu"');
    expect(html).toMatch(/class="map-cell is-destination" data-cell="zhongyuan"/);
    expect(html).not.toContain('data-region=');
    expect(html).not.toContain('id="atlas-map"');
  });
});
