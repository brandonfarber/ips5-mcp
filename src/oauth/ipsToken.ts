import { normalizeCommunityBaseUrl } from '../ips/client.js';

export type IpsTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export async function exchangeIpsAuthorizationCode(
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<IpsTokenResponse> {
  const base = normalizeCommunityBaseUrl(baseUrl);
  const tokenUrl = `${base}/oauth/token/`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: codeVerifier,
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`IPS token exchange failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return JSON.parse(text) as IpsTokenResponse;
}
