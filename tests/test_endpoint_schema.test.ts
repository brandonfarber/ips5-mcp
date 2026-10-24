import { describe, expect, test } from '@jest/globals';

import { getEndpointByToolName } from '../src/ips/catalog.js';
import { buildEndpointInputSchema } from '../src/tools/factory.js';

describe('buildEndpointInputSchema', () => {
  test('parses string-keyed query values and omits body on GET', () => {
    const endpoint = getEndpointByToolName('g_core_hello');
    expect(endpoint).toBeDefined();
    const schema = buildEndpointInputSchema(endpoint!);

    expect(
      schema.parse({
        query: { page: 1, sortDir: 'desc', hidden: false },
        body: { ignored: true },
      }),
    ).toEqual({
      query: { page: 1, sortDir: 'desc', hidden: false },
    });
  });

  test('parses path params, query, and body on DELETE', () => {
    const endpoint = getEndpointByToolName('d_forums_topics_id');
    expect(endpoint).toBeDefined();
    const schema = buildEndpointInputSchema(endpoint!);

    expect(
      schema.parse({
        id: 42,
        query: { page: '2' },
        body: { reason: 'duplicate', confirmed: true },
      }),
    ).toEqual({
      id: 42,
      query: { page: '2' },
      body: { reason: 'duplicate', confirmed: true },
    });
  });

  test('rejects query values that are not strings, numbers, or booleans', () => {
    const endpoint = getEndpointByToolName('g_core_hello');
    expect(endpoint).toBeDefined();
    const schema = buildEndpointInputSchema(endpoint!);

    expect(() => schema.parse({ query: { page: { nested: true } } })).toThrow();
  });

  test('rejects a missing path parameter', () => {
    const endpoint = getEndpointByToolName('d_forums_topics_id');
    expect(endpoint).toBeDefined();
    const schema = buildEndpointInputSchema(endpoint!);

    expect(() => schema.parse({ query: { page: 1 } })).toThrow();
  });
});
