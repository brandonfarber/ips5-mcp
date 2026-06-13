import { describe, expect, test } from '@jest/globals';

import { isMemberAllowedForMcp } from '../src/oauth/adminGate.js';

describe('isMemberAllowedForMcp', () => {
  test('allows member on admin group list', () => {
    expect(isMemberAllowedForMcp({ id: 1, primaryGroup: { id: 4 } }, [4], [])).toBe(true);
  });

  test('denies member not on admin group list', () => {
    expect(isMemberAllowedForMcp({ id: 2, primaryGroup: { id: 5 } }, [4], [])).toBe(false);
  });

  test('denies when admin groups configured but profile has no group', () => {
    expect(isMemberAllowedForMcp({ id: 3 }, [4], [])).toBe(false);
  });

  test('denies when no admin groups configured', () => {
    expect(isMemberAllowedForMcp({ id: 1, primaryGroup: { id: 4 } }, [], [])).toBe(false);
  });

  test('member allowlist overrides group check when set', () => {
    expect(isMemberAllowedForMcp({ id: 99, primaryGroup: { id: 5 } }, [4], [99])).toBe(true);
    expect(isMemberAllowedForMcp({ id: 100, primaryGroup: { id: 5 } }, [4], [99])).toBe(false);
  });
});
