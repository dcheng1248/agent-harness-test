import { describe, expect, it } from 'vitest';
import { checkIds } from '../lib/ids.mjs';

const doc = (id, status) => `| ${id} | something | ${status} |\n`;

describe('checkIds', () => {
  it('accepts planned use cases without tests', () => {
    expect(checkIds([doc('UC-CORE-001', 'planned')], [])).toEqual([]);
  });

  it('requires a test for implemented use cases', () => {
    expect(checkIds([doc('UC-CORE-001', 'implemented')], [])).toHaveLength(1);
    expect(checkIds([doc('UC-CORE-001', 'implemented')], ["it('UC-CORE-001 works')"])).toEqual([]);
  });

  it('rejects unknown and duplicate IDs', () => {
    expect(checkIds([], ['UC-WEB-009'])).toHaveLength(1);
    expect(checkIds([doc('UC-CORE-001', 'planned'), doc('UC-CORE-001', 'planned')], [])).toHaveLength(1);
  });
});
