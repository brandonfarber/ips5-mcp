/**
 * IPS credentials from the environment (see `.env.example`).
 * `dotenv` is loaded in `runMcpServer()` before this is read.
 */
export function getIpsCredentials(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = (process.env.IPS5_BASE_URL ?? '').trim();
  const apiKey = (process.env.IPS5_API_KEY ?? '').trim();
  if (!baseUrl || !apiKey) {
    return null;
  }
  return { baseUrl, apiKey };
}
