import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import {
  getHttpPort,
  getMcpAllowedHosts,
  getMcpAuthToken,
  getMcpTransport,
  getServerInfo,
} from '../src/config.js';

describe('getServerInfo', () => {
  test('returns stable identity for MCP initialization', () => {
    expect(getServerInfo()).toEqual({
      name: 'ips5-mcp',
      version: '0.0.1',
    });
  });
});

describe('hosted MCP config', () => {
  const envKeys = ['MCP_TRANSPORT', 'PORT', 'MCP_AUTH_TOKEN', 'MCP_ALLOWED_HOSTS'] as const;
  const saved: Partial<Record<string, string | undefined>> = {};

  beforeEach(() => {
    for (const key of envKeys) {
      saved[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  test('getMcpTransport defaults to stdio', () => {
    delete process.env.MCP_TRANSPORT;
    expect(getMcpTransport()).toBe('stdio');
  });

  test('getMcpTransport parses http', () => {
    process.env.MCP_TRANSPORT = 'http';
    expect(getMcpTransport()).toBe('http');
  });

  test('getHttpPort defaults to 8080', () => {
    delete process.env.PORT;
    expect(getHttpPort()).toBe(8080);
  });

  test('getHttpPort parses PORT', () => {
    process.env.PORT = '80';
    expect(getHttpPort()).toBe(80);
  });

  test('getMcpAuthToken returns trimmed token or null', () => {
    delete process.env.MCP_AUTH_TOKEN;
    expect(getMcpAuthToken()).toBeNull();

    process.env.MCP_AUTH_TOKEN = '  secret  ';
    expect(getMcpAuthToken()).toBe('secret');
  });

  test('getMcpAllowedHosts parses comma-separated hosts', () => {
    process.env.MCP_ALLOWED_HOSTS = 'mc-xxx.bunny.run, custom.example.com';
    expect(getMcpAllowedHosts()).toEqual(['mc-xxx.bunny.run', 'custom.example.com']);
  });

  test('getMcpAllowedHosts returns empty array when unset', () => {
    delete process.env.MCP_ALLOWED_HOSTS;
    expect(getMcpAllowedHosts()).toEqual([]);
  });
});
