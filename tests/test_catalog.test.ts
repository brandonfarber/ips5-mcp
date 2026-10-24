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
      description: expect.stringContaining(
        'type=html creates a raw HTML page. type=builder creates a visual editor page composed of blocks.',
      ),
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
        expect.objectContaining({ name: 'type', required: false }),
        expect.objectContaining({ name: 'areas', required: false }),
        expect.objectContaining({ name: 'blocks', required: false }),
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

  test('includes copywritingcourse CMS media manager endpoints', () => {
    const upload = getEndpointByToolName('p_cwc_media');
    expect(upload).toMatchObject({
      app: 'copywritingcourse',
      method: 'POST',
      path: '/copywritingcourse/media',
    });
    expect(upload?.description).toContain('base64-encoded content');
    expect(upload?.queryParams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'filename', type: 'string', required: true }),
        expect.objectContaining({ name: 'content', type: 'string', required: true }),
        expect.objectContaining({ name: 'folder_path', required: false }),
        expect.objectContaining({ name: 'replace', required: false }),
      ]),
    );

    const mediaTools = filterEndpoints({ app: 'copywritingcourse', search: 'media', limit: 20 });
    expect(mediaTools.map((endpoint) => endpoint.toolName)).toEqual(
      expect.arrayContaining([
        'g_cwc_media',
        'g_cwc_media_id',
        'p_cwc_media',
        'p_cwc_media_id',
        'd_cwc_media_id',
        'g_cwc_mediafolders',
        'g_cwc_mediafolders_id',
        'p_cwc_mediafolders',
        'p_cwc_mediafolders_id',
        'd_cwc_mediafolders_id',
      ]),
    );
  });

  test('includes copywritingcourse menu, theme, and block endpoints', () => {
    const tools = filterEndpoints({ app: 'copywritingcourse', limit: 100 }).map(
      (endpoint) => endpoint.toolName,
    );
    expect(tools).toEqual(
      expect.arrayContaining([
        'g_cwc_menu',
        'g_cwc_menu_types',
        'g_cwc_menu_id',
        'p_cwc_menu',
        'p_cwc_menu_id',
        'd_cwc_menu_id',
        'p_cwc_menu_reorder',
        'p_cwc_menu_publish',
        'p_cwc_menu_restore',
        'g_cwc_theme',
        'g_cwc_theme_id',
        'g_cwc_theme_id_variables',
        'p_cwc_theme_id',
        'g_cwc_blocks',
        'g_cwc_blocks_id',
        'p_cwc_blocks',
        'p_cwc_blocks_id',
        'd_cwc_blocks_id',
      ]),
    );

    expect(getEndpointByToolName('p_cwc_menu')?.queryParams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'extension', required: true }),
        expect.objectContaining({ name: 'permissions' }),
        expect.objectContaining({ name: 'menu_types' }),
      ]),
    );
    expect(getEndpointByToolName('p_cwc_menu_restore')?.description).toContain('confirm=1');
    expect(getEndpointByToolName('p_cwc_blocks')?.description).toContain('PHP blocks are not created');
    expect(getEndpointByToolName('d_cwc_blocks_id')?.queryParams).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'force' })]),
    );
    expect(getEndpointByToolName('p_cwc_theme_id')?.description).toContain('css_variables');
  });
});
