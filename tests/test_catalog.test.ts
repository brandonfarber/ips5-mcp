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
    const ep = getEndpointByToolName('g_core_hello');
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

  test('includes copywritingcourse CMS page generation endpoints', () => {
    const createPage = getEndpointByToolName('p_cwc_pages');
    expect(createPage).toMatchObject({
      app: 'copywritingcourse',
      method: 'POST',
      path: '/copywritingcourse/pages',
      description: 'Create a raw HTML CMS page',
    });
    expect(createPage?.queryParams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'name',
          type: 'string',
          required: true,
        }),
        expect.objectContaining({
          name: 'content',
          type: 'string',
        }),
      ]),
    );

    const updatePage = getEndpointByToolName('p_cwc_pages_id');
    expect(updatePage?.pathParams).toEqual(['id']);
    expect(updatePage?.path).toBe('/copywritingcourse/pages/{id}');

    const pageTools = filterEndpoints({ app: 'copywritingcourse', search: 'pages', limit: 10 });
    expect(pageTools.map((endpoint) => endpoint.toolName)).toEqual(
      expect.arrayContaining([
        'g_cwc_pages',
        'g_cwc_pages_id',
        'p_cwc_pages',
        'p_cwc_pages_id',
        'd_cwc_pages_id',
      ]),
    );
  });
});
