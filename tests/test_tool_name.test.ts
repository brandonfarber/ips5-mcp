import { describe, expect, test } from '@jest/globals';

import {
  buildToolName,
  CURSOR_DEFAULT_MAX_TOOL_NAME_LENGTH,
  CURSOR_MAX_COMBINED_NAME_LENGTH,
  fitsCursorCombinedLimit,
} from '../src/ips/tool-name.js';

describe('buildToolName', () => {
  test('uses single-letter HTTP prefix', () => {
    expect(buildToolName('GET', '/core/hello')).toBe('g_core_hello');
    expect(buildToolName('DELETE', '/forums/topics/{id}')).toBe('d_forums_topics_id');
  });

  test('collapses duplicate app/resource segments', () => {
    expect(buildToolName('GET', '/forums/forums')).toBe('g_forums');
    expect(buildToolName('GET', '/forums/forums/{id}')).toBe('g_forums_id');
  });

  test('abbreviates CMS database and comment path params', () => {
    expect(buildToolName('DELETE', '/cms/comments/{database_id}/{comment_id}/react')).toBe(
      'd_cms_cmt_db_cmt_react',
    );
    expect(buildToolName('GET', '/cms/comments/{database_id}/{id}')).toBe('g_cms_cmt_db_id');
  });

  test('abbreviates copywritingcourse app', () => {
    expect(buildToolName('POST', '/copywritingcourse/pages')).toBe('p_cwc_pages');
    expect(buildToolName('GET', '/copywritingcourse/pages/{id}')).toBe('g_cwc_pages_id');
  });

  test('shortens member warning acknowledge path for Cursor limit', () => {
    const name = buildToolName('POST', '/core/members/{id}/warnings/{warning}/acknowledge');
    expect(name).toBe('p_core_mem_id_warn_ack');
    expect(name.length).toBeLessThanOrEqual(CURSOR_DEFAULT_MAX_TOOL_NAME_LENGTH);
    expect(
      fitsCursorCombinedLimit('project-0-ips5-mcp-ips5-mcp', name, CURSOR_MAX_COMBINED_NAME_LENGTH),
    ).toBe(true);
    expect(fitsCursorCombinedLimit('ips5-mcp', name, CURSOR_MAX_COMBINED_NAME_LENGTH)).toBe(true);
  });

  test('all default catalog names fit project MCP server combined limit', async () => {
    const { getAllEndpoints } = await import('../src/ips/catalog.js');
    const server = 'project-0-ips5-mcp-ips5-mcp';
    const over = getAllEndpoints().filter(
      (e) => !fitsCursorCombinedLimit(server, e.toolName, CURSOR_MAX_COMBINED_NAME_LENGTH),
    );
    expect(over.map((e) => `${e.toolName.length}:${e.toolName}`)).toEqual([]);
  });
});
