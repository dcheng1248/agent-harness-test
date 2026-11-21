import { describe, expect, it } from 'vitest';
import { placeCourtOptions } from './courtOptions';

describe('UC-WEB-007 placeCourtOptions', () => {
  it('right-aligned: list right edge meets the button right edge', () => {
    expect(placeCourtOptions({ left: 600, right: 1000 }, { left: 900, right: 940 }, { left: 0, right: 1000 }, 150)).toEqual({ left: 190, caretX: 130 });
  });

  it('shifted: list starts at the image left edge when it would overflow', () => {
    expect(placeCourtOptions({ left: 20, right: 420 }, { left: 20, right: 70 }, { left: 10, right: 500 }, 150)).toEqual({ left: -10, caretX: 35 });
  });

  it('touching: no shift when the list just fits', () => {
    expect(placeCourtOptions({ left: 100, right: 500 }, { left: 200, right: 260 }, { left: 110, right: 600 }, 150)).toEqual({ left: 10, caretX: 120 });
  });
});
