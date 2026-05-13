import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import {
  IpsRestClient,
  normalizeCommunityBaseUrl,
} from '../src/ips/client.js';

describe('normalizeCommunityBaseUrl', () => {
  test('strips trailing slashes', () => {
    expect(normalizeCommunityBaseUrl('https://ex.com/')).toBe('https://ex.com');
    expect(normalizeCommunityBaseUrl('https://ex.com/ips///')).toBe(
      'https://ex.com/ips',
    );
  });
});

describe('IpsRestClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = jest.fn() as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('getCoreHello uses /api/core/hello and Basic auth', async () => {
    const mockFetch = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          communityName: 'Test',
          communityUrl: 'http://x',
          ipsVersion: '5.0.0',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const client = new IpsRestClient({
      baseUrl: 'https://ex.com/path/',
      apiKey: 'secretkey',
    });
    const data = await client.getCoreHello();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const first = mockFetch.mock.calls[0];
    expect(first).toBeDefined();
    const [url, init] = first as [string, RequestInit];
    expect(url).toBe('https://ex.com/path/api/core/hello');
    expect(init.method).toBe('GET');
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe(
      `Basic ${Buffer.from('secretkey:', 'utf8').toString('base64')}`,
    );
    expect(headers.get('User-Agent')).toContain('ips5-mcp');
    expect(data).toEqual({
      communityName: 'Test',
      communityUrl: 'http://x',
      ipsVersion: '5.0.0',
    });
  });

  test('getCoreHello throws on IPS JSON error body', async () => {
    const mockFetch = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          errorCode: '3S290/7',
          errorMessage: 'INVALID_API_KEY',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const client = new IpsRestClient({
      baseUrl: 'https://ex.com',
      apiKey: 'bad',
    });
    await expect(client.getCoreHello()).rejects.toThrow(/INVALID_API_KEY/);
  });
});
