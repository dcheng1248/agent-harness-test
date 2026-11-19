import { describe, expect, it } from 'vitest';
import { createInitialState } from '@emperor/core';
import { startGame } from './screen';

describe('start game', () => {
  it('UC-WEB-002 startGame returns the game screen with the initial state', () => {
    expect(startGame(42)).toEqual({ screen: 'game', state: createInitialState(42) });
  });
});
