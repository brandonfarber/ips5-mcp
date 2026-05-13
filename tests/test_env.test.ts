import { afterEach, describe, expect, test } from '@jest/globals';

import { getIpsCredentials } from '../src/env.js';

describe('getIpsCredentials', () => {
  const initialUrl = process.env.IPS5_BASE_URL;
  const initialKey = process.env.IPS5_API_KEY;

  afterEach(() => {
    if (initialUrl === undefined) {
      delete process.env.IPS5_BASE_URL;
    } else {
      process.env.IPS5_BASE_URL = initialUrl;
    }
    if (initialKey === undefined) {
      delete process.env.IPS5_API_KEY;
    } else {
      process.env.IPS5_API_KEY = initialKey;
    }
  });

  test('returns null when variables are missing or blank', () => {
    delete process.env.IPS5_BASE_URL;
    delete process.env.IPS5_API_KEY;
    expect(getIpsCredentials()).toBeNull();

    process.env.IPS5_BASE_URL = 'https://x.com';
    process.env.IPS5_API_KEY = '';
    expect(getIpsCredentials()).toBeNull();

    process.env.IPS5_BASE_URL = '  ';
    process.env.IPS5_API_KEY = 'key';
    expect(getIpsCredentials()).toBeNull();
  });

  test('returns trimmed credentials when both are set', () => {
    process.env.IPS5_BASE_URL = '  https://forum.example.com/  ';
    process.env.IPS5_API_KEY = '  abc123  ';
    expect(getIpsCredentials()).toEqual({
      baseUrl: 'https://forum.example.com/',
      apiKey: 'abc123',
    });
  });
});
