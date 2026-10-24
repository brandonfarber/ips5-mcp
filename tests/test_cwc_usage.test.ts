import { describe, expect, test } from '@jest/globals';

import { getEndpointByToolName } from '../src/ips/catalog.js';
import { endpointDescription } from '../src/tools/factory.js';

function descriptionFor(toolName: string): string {
  const endpoint = getEndpointByToolName(toolName);
  expect(endpoint).toBeDefined();
  return endpointDescription(endpoint!);
}

describe('copywritingcourse tool descriptions', () => {
  test('explains form JSON and that the API key must be enabled', () => {
    const text = descriptionFor('p_cwc_menu');
    expect(text).toContain('starts with { or [');
    expect(text).toContain('ACP → System → REST & OAuth → API Keys');
    expect(text).toContain('extension (required)');
    expect(text).toContain('core_Menu');
    expect(text).toContain('INVALID_CONFIG:menu_content_page');
  });

  test('explains visual editor page layouts', () => {
    const text = descriptionFor('p_cwc_pages');
    expect(text).toContain('type=builder');
    expect(text).toContain('{"col1":["hero","cta"]}');
    expect(text).toContain('Do not send areas and blocks together');
    expect(text).toContain('1CWC/P12');
    expect(text).toContain('1CWC/P13');
    expect(text).toContain('cms_widget_custom_block');
  });

  test('explains block deletion and plugin shortcuts', () => {
    expect(descriptionFor('d_cwc_blocks_id')).toContain('409 BLOCK_IN_USE');
    expect(descriptionFor('d_cwc_blocks_id')).toContain('render empty');
    expect(descriptionFor('p_cwc_blocks')).toContain('db_feed_{databaseId}');
    expect(descriptionFor('g_cwc_blocks_id')).toContain('used_on_pages');
  });

  test('explains theme ids and CSS limits', () => {
    expect(descriptionFor('g_cwc_theme_id_variables')).toContain('default, value, custom, and writable');
    expect(descriptionFor('p_cwc_theme_id')).toContain('512KB');
    expect(descriptionFor('p_cwc_theme_id')).toContain('1CWC/T5');
  });
});
