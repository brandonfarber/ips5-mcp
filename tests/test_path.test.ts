import { describe, expect, test } from '@jest/globals';

import { buildQueryString, encodeFormBody, resolveApiPath } from '../src/ips/path.js';

describe('resolveApiPath', () => {
  test('substitutes path parameters', () => {
    expect(resolveApiPath('/core/members/{id}', { id: 42 })).toBe('/core/members/42');
    expect(resolveApiPath('/blog/comments/{id}/react', { id: 'abc' })).toBe(
      '/blog/comments/abc/react',
    );
  });

  test('throws when parameter missing', () => {
    expect(() => resolveApiPath('/core/members/{id}', {})).toThrow(/Missing path parameter/);
  });
});

describe('buildQueryString', () => {
  test('builds query string', () => {
    expect(buildQueryString({ page: 1, name: 'test' })).toBe('?page=1&name=test');
    expect(buildQueryString({})).toBe('');
  });
});

describe('encodeFormBody', () => {
  test('encodes form fields', () => {
    expect(encodeFormBody({ title: 'Hi', page: 1 })).toBe('title=Hi&page=1');
  });

  test('encodes boolean form fields as IPS-compatible integers', () => {
    expect(encodeFormBody({ ipb_wrapper: true, meta_index: false })).toBe(
      'ipb_wrapper=1&meta_index=0',
    );
  });

  test('encodes objects and arrays as JSON so values start with { or [', () => {
    const body = encodeFormBody({
      areas: { col1: ['hero', 'cta'] },
      items: [{ id: 1, parent: 0, position: 1 }],
      blocks: ['hero', 'cta'],
    });
    const params = new URLSearchParams(body);
    expect(params.get('areas')).toBe('{"col1":["hero","cta"]}');
    expect(params.get('items')).toBe('[{"id":1,"parent":0,"position":1}]');
    expect(params.get('blocks')).toBe('["hero","cta"]');
  });
});
