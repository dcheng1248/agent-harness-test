import { PLAYER_OWNER } from '@emperor/core';
import type { NationEntry } from './schema';

export const nations: readonly NationEntry[] = [
  { id: PLAYER_OWNER, name: '本朝', color: '#a8322a' },
  { id: 'khitan', name: '契丹', color: '#4a6d8c' },
  { id: 'tibet', name: '吐蕃', color: '#8a6a2f' },
  { id: 'goryeo', name: '高麗', color: '#3f7f5a' },
  { id: 'nanzhao', name: '南詔', color: '#7a4f8f' },
];
