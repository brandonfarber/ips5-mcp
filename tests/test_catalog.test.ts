import { describe, expect, test } from '@jest/globals';

import {
  filterEndpoints,
  getAllEndpoints,
  getEndpointByToolName,
} from '../src/ips/catalog.js';

describe('endpoint catalog', () => {
  test('loads endpoints from JSON', () => {
    const all = getAllEndpoints();
    expect(all.length).toBeGreaterThan(200);
  });

  test('finds core hello by tool name', () => {
    const ep = getEndpointByToolName('ips_get_core_hello');
    expect(ep).toBeDefined();
    expect(ep?.path).toBe('/core/hello');
    expect(ep?.method).toBe('GET');
  });

  test('filterEndpoints filters by app and search', () => {
    const core = filterEndpoints({ app: 'core', limit: 10 });
    expect(core.length).toBeLessThanOrEqual(10);
    expect(core.every((e) => e.app === 'core')).toBe(true);

    const hello = filterEndpoints({ search: 'hello', limit: 5 });
    expect(hello.some((e) => e.path.includes('hello'))).toBe(true);
  });
});
