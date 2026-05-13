import { describe, expect, test } from '@jest/globals';

import { getServerInfo } from '../src/config.js';

describe('getServerInfo', () => {
  test('returns stable identity for MCP initialization', () => {
    expect(getServerInfo()).toEqual({
      name: 'ips5-mcp',
      version: '0.0.1',
    });
  });
});
