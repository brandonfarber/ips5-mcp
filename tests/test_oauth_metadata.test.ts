import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import supertest from 'supertest';

import { createHttpApp } from '../src/http.js';

const OAUTH_ENV_KEYS = [
  'MCP_AUTH_MODE',
  'MCP_OAUTH_ISSUER_URL',
  'MCP_RESOURCE_URL',
  'IPS5_BASE_URL',
  'IPS_OAUTH_CLIENT_ID',
  'IPS_OAUTH_CLIENT_SECRET',
  'MCP_ADMIN_GROUP_IDS',
  'MCP_ALLOWED_HOSTS',
] as const;

describe('OAuth metadata endpoints', () => {
  const saved: Partial<Record<string, string | undefined>> = {};

  beforeEach(() => {
    for (const key of OAUTH_ENV_KEYS) {
      saved[key] = process.env[key];
    }
    process.env.MCP_AUTH_MODE = 'oauth';
    process.env.MCP_OAUTH_ISSUER_URL = 'https://mcp.example.com';
    process.env.MCP_RESOURCE_URL = 'https://mcp.example.com/mcp';
    process.env.IPS5_BASE_URL = 'https://community.example.com';
    process.env.IPS_OAUTH_CLIENT_ID = 'gateway-client';
    process.env.IPS_OAUTH_CLIENT_SECRET = 'gateway-secret';
    process.env.MCP_ADMIN_GROUP_IDS = '4';
    process.env.MCP_ALLOWED_HOSTS = '127.0.0.1';
  });

  afterEach(() => {
    for (const key of OAUTH_ENV_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  test('GET protected resource metadata includes issuer and resource URL', async () => {
    const app = createHttpApp();
    const res = await supertest(app).get('/.well-known/oauth-protected-resource/mcp');

    expect(res.status).toBe(200);
    expect(res.body.resource).toBe('https://mcp.example.com/mcp');
    expect(res.body.authorization_servers).toEqual(['https://mcp.example.com/']);
    expect(res.body.scopes_supported).toContain('mcp:tools');
  });

  test('GET authorization server metadata includes PKCE and registration', async () => {
    const app = createHttpApp();
    const res = await supertest(app).get('/.well-known/oauth-authorization-server');

    expect(res.status).toBe(200);
    expect(res.body.issuer).toBe('https://mcp.example.com/');
    expect(res.body.code_challenge_methods_supported).toContain('S256');
    expect(res.body.registration_endpoint).toBe('https://mcp.example.com/register');
    expect(res.body.token_endpoint).toBe('https://mcp.example.com/token');
  });
});
