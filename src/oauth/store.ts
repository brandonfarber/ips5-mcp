import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';

export type PendingIpsAuth = {
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
  ipsCodeVerifier: string;
};

export type McpAuthCodeRecord = {
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
  memberId: number;
};

export type McpAccessTokenRecord = {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt: number;
  resource?: URL;
  memberId: number;
};

export type OAuthStoreSnapshot = {
  clients: Record<string, OAuthClientInformationFull>;
  ipsPending: Record<string, PendingIpsAuth>;
  codes: Record<string, McpAuthCodeRecord>;
  tokens: Record<string, McpAccessTokenRecord>;
};

export interface OAuthStore {
  getClient(clientId: string): Promise<OAuthClientInformationFull | undefined>;
  registerClient(
    client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>,
  ): Promise<OAuthClientInformationFull>;
  setIpsPending(state: string, pending: PendingIpsAuth): Promise<void>;
  getIpsPending(state: string): Promise<PendingIpsAuth | undefined>;
  deleteIpsPending(state: string): Promise<void>;
  setAuthCode(code: string, record: McpAuthCodeRecord): Promise<void>;
  getAuthCode(code: string): Promise<McpAuthCodeRecord | undefined>;
  deleteAuthCode(code: string): Promise<void>;
  setAccessToken(token: string, record: McpAccessTokenRecord): Promise<void>;
  getAccessToken(token: string): Promise<McpAccessTokenRecord | undefined>;
}

export class MemoryOAuthStore implements OAuthStore {
  private clients = new Map<string, OAuthClientInformationFull>();
  private ipsPending = new Map<string, PendingIpsAuth>();
  private codes = new Map<string, McpAuthCodeRecord>();
  private tokens = new Map<string, McpAccessTokenRecord>();

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    return this.clients.get(clientId);
  }

  async registerClient(
    client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>,
  ): Promise<OAuthClientInformationFull> {
    const full = client as OAuthClientInformationFull;
    this.clients.set(full.client_id, full);
    return full;
  }

  async setIpsPending(state: string, pending: PendingIpsAuth): Promise<void> {
    this.ipsPending.set(state, pending);
  }

  async getIpsPending(state: string): Promise<PendingIpsAuth | undefined> {
    return this.ipsPending.get(state);
  }

  async deleteIpsPending(state: string): Promise<void> {
    this.ipsPending.delete(state);
  }

  async setAuthCode(code: string, record: McpAuthCodeRecord): Promise<void> {
    this.codes.set(code, record);
  }

  async getAuthCode(code: string): Promise<McpAuthCodeRecord | undefined> {
    return this.codes.get(code);
  }

  async deleteAuthCode(code: string): Promise<void> {
    this.codes.delete(code);
  }

  async setAccessToken(token: string, record: McpAccessTokenRecord): Promise<void> {
    this.tokens.set(token, record);
  }

  async getAccessToken(token: string): Promise<McpAccessTokenRecord | undefined> {
    return this.tokens.get(token);
  }

  snapshot(): OAuthStoreSnapshot {
    return {
      clients: Object.fromEntries(this.clients),
      ipsPending: Object.fromEntries(this.ipsPending),
      codes: Object.fromEntries(this.codes),
      tokens: Object.fromEntries(this.tokens),
    };
  }

  loadSnapshot(data: OAuthStoreSnapshot): void {
    this.clients = new Map(Object.entries(data.clients ?? {}));
    this.ipsPending = new Map(Object.entries(data.ipsPending ?? {}));
    this.codes = new Map(Object.entries(data.codes ?? {}));
    this.tokens = new Map(Object.entries(data.tokens ?? {}));
  }
}

export class FileOAuthStore extends MemoryOAuthStore {
  constructor(private readonly filePath: string) {
    super();
    if (existsSync(filePath)) {
      try {
        const raw = readFileSync(filePath, 'utf8');
        this.loadSnapshot(JSON.parse(raw) as OAuthStoreSnapshot);
      } catch {
        // Start fresh if file is corrupt
      }
    }
  }

  private persist(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(this.snapshot()), 'utf8');
  }

  override async registerClient(
    client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>,
  ): Promise<OAuthClientInformationFull> {
    const result = await super.registerClient(client);
    this.persist();
    return result;
  }

  override async setIpsPending(state: string, pending: PendingIpsAuth): Promise<void> {
    await super.setIpsPending(state, pending);
    this.persist();
  }

  override async deleteIpsPending(state: string): Promise<void> {
    await super.deleteIpsPending(state);
    this.persist();
  }

  override async setAuthCode(code: string, record: McpAuthCodeRecord): Promise<void> {
    await super.setAuthCode(code, record);
    this.persist();
  }

  override async deleteAuthCode(code: string): Promise<void> {
    await super.deleteAuthCode(code);
    this.persist();
  }

  override async setAccessToken(token: string, record: McpAccessTokenRecord): Promise<void> {
    await super.setAccessToken(token, record);
    this.persist();
  }
}

export function createOAuthStore(): OAuthStore {
  const path = (process.env.MCP_OAUTH_STORE_PATH ?? '').trim();
  if (path) {
    return new FileOAuthStore(path);
  }
  return new MemoryOAuthStore();
}
