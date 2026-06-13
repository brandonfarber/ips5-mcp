import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { FileOAuthStore, MemoryOAuthStore } from '../src/oauth/store.js';

describe('OAuth store', () => {
  test('MemoryOAuthStore registers and retrieves clients', async () => {
    const store = new MemoryOAuthStore();
    const client = await store.registerClient({
      client_id: 'chatgpt-client',
      redirect_uris: ['https://chatgpt.com/callback'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    });

    expect(client.client_id).toBe('chatgpt-client');
    const loaded = await store.getClient('chatgpt-client');
    expect(loaded?.redirect_uris).toEqual(['https://chatgpt.com/callback']);
  });

  describe('FileOAuthStore', () => {
    let dir: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'ips5-mcp-oauth-'));
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    test('persists clients across instances', async () => {
      const path = join(dir, 'oauth.json');
      const store1 = new FileOAuthStore(path);
      await store1.registerClient({
        client_id: 'persisted',
        redirect_uris: ['https://example.com/cb'],
        grant_types: ['authorization_code'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      });

      const raw = readFileSync(path, 'utf8');
      expect(raw).toContain('persisted');

      const store2 = new FileOAuthStore(path);
      const client = await store2.getClient('persisted');
      expect(client?.client_id).toBe('persisted');
    });
  });
});
