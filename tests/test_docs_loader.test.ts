import { describe, expect, test } from '@jest/globals';

import {
  getProjectRoot,
  loadAgentGuide,
  loadMcpInstructions,
} from '../src/docs/loader.js';

describe('documentation loader', () => {
  test('resolves project root', () => {
    expect(getProjectRoot().replace(/\\/g, '/')).toMatch(/ips5-mcp\/?$/);
  });

  test('loads MCP instructions markdown', () => {
    const text = loadMcpInstructions();
    expect(text).toContain('ips_read_agent_guide');
    expect(text).toContain('ips_list_endpoints');
  });

  test('loads agent guide with maintainer sections', () => {
    const text = loadAgentGuide();
    expect(text).toContain('Glossary');
    expect(text).toContain('Recipes');
    expect(text).toContain('TODO');
  });
});
