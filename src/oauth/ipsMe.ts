import { USER_AGENT } from '../config.js';
import { normalizeCommunityBaseUrl } from '../ips/client.js';
import type { IpsMeProfile } from './adminGate.js';

export async function fetchIpsMeProfile(
  baseUrl: string,
  accessToken: string,
): Promise<IpsMeProfile> {
  const base = normalizeCommunityBaseUrl(baseUrl);
  const url = `${base}/api/core/me`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`IPS /core/me failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return JSON.parse(text) as IpsMeProfile;
}
