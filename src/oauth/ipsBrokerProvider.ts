import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { InvalidRequestError, InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { redirectUriMatches } from '@modelcontextprotocol/sdk/server/auth/handlers/authorize.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

import {
  getIps5BaseUrl,
  getIpsOAuthClientId,
  getIpsOAuthClientSecret,
  getIpsOAuthScopes,
  getMcpAdminGroupIds,
  getMcpAllowedMemberIds,
  getMcpOAuthIssuerUrl,
} from '../config.js';
import { isMemberAllowedForMcp } from './adminGate.js';
import { fetchIpsMeProfile } from './ipsMe.js';
import { exchangeIpsAuthorizationCode } from './ipsToken.js';
import { generatePkcePair } from './pkce.js';
import type { OAuthStore } from './store.js';

const MCP_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

export type IpsOAuthBrokerOptions = {
  store: OAuthStore;
  ipsCallbackPath?: string;
};

export class IpsOAuthBrokerProvider implements OAuthServerProvider {
  readonly clientsStore: OAuthServerProvider['clientsStore'];
  private readonly ipsCallbackUrl: string;

  constructor(private readonly options: IpsOAuthBrokerOptions) {
    const issuer = getMcpOAuthIssuerUrl();
    const callbackPath = options.ipsCallbackPath ?? '/oauth/ips/callback';
    this.ipsCallbackUrl = new URL(callbackPath, issuer).href;

    this.clientsStore = {
      getClient: async (clientId) => {
        const client = await options.store.getClient(clientId);
        if (!client) {
          console.warn(
            `OAuth client not found: ${clientId} (if using multiple pods/regions, DCR clients are not shared — set autoscale max=1 or use MCP_OAUTH_STORE_PATH on shared storage)`,
          );
        }
        return client;
      },
      registerClient: (client) => options.store.registerClient(client),
    };
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: import('@modelcontextprotocol/sdk/server/auth/provider.js').AuthorizationParams,
    res: Response,
  ): Promise<void> {
    if (!client.redirect_uris.some((registered) => redirectUriMatches(params.redirectUri, registered))) {
      throw new InvalidRequestError('Unregistered redirect_uri');
    }

    const ipsState = randomUUID();
    const ipsPkce = generatePkcePair();

    await this.options.store.setIpsPending(ipsState, {
      client,
      params,
      ipsCodeVerifier: ipsPkce.verifier,
    });

    const baseUrl = getIps5BaseUrl();
    const clientId = getIpsOAuthClientId();
    const scopes = getIpsOAuthScopes();

    if (!baseUrl || !clientId) {
      throw new InvalidRequestError('IPS OAuth is not configured on this server');
    }

    const authorizeUrl = new URL(`${baseUrl.replace(/\/+$/, '')}/oauth/authorize/`);
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('redirect_uri', this.ipsCallbackUrl);
    authorizeUrl.searchParams.set('scope', scopes.join(' '));
    authorizeUrl.searchParams.set('state', ipsState);
    authorizeUrl.searchParams.set('code_challenge', ipsPkce.challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');

    res.redirect(authorizeUrl.toString());
  }

  async handleIpsCallback(
    ipsCode: string,
    ipsState: string,
    res: Response,
  ): Promise<void> {
    const pending = await this.options.store.getIpsPending(ipsState);
    if (!pending) {
      res.status(400).send('Invalid or expired IPS authorization state');
      return;
    }

    await this.options.store.deleteIpsPending(ipsState);

    const baseUrl = getIps5BaseUrl();
    const clientId = getIpsOAuthClientId();
    const clientSecret = getIpsOAuthClientSecret();

    if (!baseUrl || !clientId || !clientSecret) {
      this.redirectOAuthError(res, pending.params.redirectUri, pending.params.state, 'server_error');
      return;
    }

    try {
      const ipsToken = await exchangeIpsAuthorizationCode(
        baseUrl,
        clientId,
        clientSecret,
        ipsCode,
        this.ipsCallbackUrl,
        pending.ipsCodeVerifier,
      );

      const profile = await fetchIpsMeProfile(baseUrl, ipsToken.access_token);
      const allowed = isMemberAllowedForMcp(
        profile,
        getMcpAdminGroupIds(),
        getMcpAllowedMemberIds(),
      );

      if (!allowed || profile.id === undefined) {
        this.redirectOAuthError(res, pending.params.redirectUri, pending.params.state, 'access_denied');
        return;
      }

      const mcpCode = randomUUID();
      await this.options.store.setAuthCode(mcpCode, {
        client: pending.client,
        params: pending.params,
        memberId: profile.id,
      });

      const target = new URL(pending.params.redirectUri);
      target.searchParams.set('code', mcpCode);
      if (pending.params.state !== undefined) {
        target.searchParams.set('state', pending.params.state);
      }
      res.redirect(target.toString());
    } catch (err) {
      console.error('IPS OAuth callback failed:', err);
      this.redirectOAuthError(res, pending.params.redirectUri, pending.params.state, 'access_denied');
    }
  }

  private redirectOAuthError(
    res: Response,
    redirectUri: string,
    state: string | undefined,
    error: string,
  ): void {
    const target = new URL(redirectUri);
    target.searchParams.set('error', error);
    if (state !== undefined) {
      target.searchParams.set('state', state);
    }
    res.redirect(target.toString());
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const record = await this.options.store.getAuthCode(authorizationCode);
    if (!record) {
      throw new Error('Invalid authorization code');
    }
    return record.params.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    _resource?: URL,
  ): Promise<OAuthTokens> {
    const record = await this.options.store.getAuthCode(authorizationCode);
    if (!record) {
      throw new Error('Invalid authorization code');
    }
    if (record.client.client_id !== client.client_id) {
      throw new Error('Authorization code was not issued to this client');
    }

    await this.options.store.deleteAuthCode(authorizationCode);

    const token = randomUUID();
    const expiresAt = Date.now() + MCP_ACCESS_TOKEN_TTL_MS;

    await this.options.store.setAccessToken(token, {
      token,
      clientId: client.client_id,
      scopes: record.params.scopes ?? ['mcp:tools'],
      expiresAt,
      resource: record.params.resource,
      memberId: record.memberId,
    });

    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: Math.floor(MCP_ACCESS_TOKEN_TTL_MS / 1000),
      scope: (record.params.scopes ?? ['mcp:tools']).join(' '),
    };
  }

  async exchangeRefreshToken(
    _client: OAuthClientInformationFull,
    _refreshToken: string,
    _scopes?: string[],
    _resource?: URL,
  ): Promise<OAuthTokens> {
    throw new Error('Refresh tokens are not supported');
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const record = await this.options.store.getAccessToken(token);
    if (!record || record.expiresAt < Date.now()) {
      throw new InvalidTokenError('Invalid or expired token');
    }

    return {
      token,
      clientId: record.clientId,
      scopes: record.scopes,
      expiresAt: Math.floor(record.expiresAt / 1000),
      resource: record.resource,
      extra: { memberId: record.memberId },
    };
  }
}
