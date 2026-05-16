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
});
