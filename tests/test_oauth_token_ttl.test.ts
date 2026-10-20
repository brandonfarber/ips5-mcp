import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { IpsOAuthBrokerProvider } from '../src/oauth/ipsBrokerProvider.js';
import { MemoryOAuthStore } from '../src/oauth/store.js';

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

describe('MCP access token lifetime', () => {
  const savedIssuer = process.env.MCP_OAUTH_ISSUER_URL;

  beforeEach(() => {
    process.env.MCP_OAUTH_ISSUER_URL = 'https://mcp.example.com';
  });

  afterEach(() => {
    if (savedIssuer === undefined) {
      delete process.env.MCP_OAUTH_ISSUER_URL;
    } else {
      process.env.MCP_OAUTH_ISSUER_URL = savedIssuer;
    }
  });

  test('exchangeAuthorizationCode issues a token that expires in 30 days', async () => {
    const store = new MemoryOAuthStore();
    const provider = new IpsOAuthBrokerProvider({ store });
    const client = {
      client_id: 'chatgpt-client',
      redirect_uris: ['https://chatgpt.com/callback'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    };

    await store.setAuthCode('auth-code', {
      client,
      params: {
        redirectUri: 'https://chatgpt.com/callback',
        codeChallenge: 'challenge',
        scopes: ['mcp:tools'],
      },
      memberId: 42,
    });

    const before = Date.now();
    const tokens = await provider.exchangeAuthorizationCode(client, 'auth-code');
    const after = Date.now();

    expect(tokens.expires_in).toBe(THIRTY_DAYS_SECONDS);
    expect(tokens.token_type).toBe('bearer');

    const record = await store.getAccessToken(tokens.access_token);
    expect(record).toBeDefined();
    expect(record!.expiresAt).toBeGreaterThanOrEqual(before + THIRTY_DAYS_SECONDS * 1000);
    expect(record!.expiresAt).toBeLessThanOrEqual(after + THIRTY_DAYS_SECONDS * 1000);
    expect(record!.memberId).toBe(42);

    const auth = await provider.verifyAccessToken(tokens.access_token);
    expect(auth.clientId).toBe('chatgpt-client');
    expect(auth.extra).toEqual({ memberId: 42 });
  });

  test('verifyAccessToken rejects a token past its expiry', async () => {
    const store = new MemoryOAuthStore();
    const provider = new IpsOAuthBrokerProvider({ store });

    await store.setAccessToken('stale-token', {
      token: 'stale-token',
      clientId: 'chatgpt-client',
      scopes: ['mcp:tools'],
      expiresAt: Date.now() - 1000,
      memberId: 7,
    });

    await expect(provider.verifyAccessToken('stale-token')).rejects.toThrow(/expired/i);
  });
});
