#!/usr/bin/env node
/**
 * End-to-end OAuth flow tester for hosted ips5-mcp.
 *
 * 1. Fetches OAuth metadata
 * 2. Dynamic client registration (DCR)
 * 3. Opens browser for IPS login (PKCE authorize)
 * 4. Local callback captures authorization code
 * 5. Exchanges code for MCP access token
 * 6. Calls POST /mcp initialize with Bearer token
 *
 * Usage:
 *   node scripts/test-oauth-flow.mjs
 *   node scripts/test-oauth-flow.mjs --base-url https://mcp.kopywriting.com
 *   node scripts/test-oauth-flow.mjs --no-browser   # print authorize URL only
 */

import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { URL } from 'node:url';

const DEFAULT_BASE = 'https://mcp.kopywriting.com';
const CALLBACK_PORT = 9876;
const CALLBACK_PATH = '/callback';
const START_PATH = '/start';

function parseArgs(argv) {
  let baseUrl = process.env.MCP_OAUTH_TEST_BASE_URL?.trim() || DEFAULT_BASE;
  let openBrowser = true;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--base-url' && argv[i + 1]) {
      baseUrl = argv[++i].replace(/\/+$/, '');
    } else if (arg === '--no-browser') {
      openBrowser = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/test-oauth-flow.mjs [options]

Options:
  --base-url URL   MCP server base (default: ${DEFAULT_BASE})
  --no-browser     Print authorize URL instead of opening a browser
  --help           Show this help

Environment:
  MCP_OAUTH_TEST_BASE_URL  Same as --base-url
`);
      process.exit(0);
    }
  }
  return { baseUrl, openBrowser };
}

function generatePkcePair() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function openInBrowser(url) {
  const platform = process.platform;
  if (platform === 'win32') {
    // cmd.exe treats & as a command separator — use PowerShell instead.
    spawn(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', 'Start-Process', url],
      { detached: true, stdio: 'ignore' },
    ).unref();
  } else if (platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
}

function startOAuthTestServer({ port, expectedState, authorizeUrl, timeoutMs = 300_000 }) {
  const redirectUri = `http://127.0.0.1:${port}${CALLBACK_PATH}`;
  const startUrl = `http://127.0.0.1:${port}${START_PATH}`;

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);

      if (reqUrl.pathname === START_PATH) {
        res.writeHead(302, { Location: authorizeUrl });
        res.end();
        return;
      }

      if (reqUrl.pathname !== CALLBACK_PATH) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const error = reqUrl.searchParams.get('error');
      const errorDescription = reqUrl.searchParams.get('error_description');
      const code = reqUrl.searchParams.get('code');
      const state = reqUrl.searchParams.get('state');

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<!doctype html><html><body><p>OAuth test callback received. You can close this tab.</p></body></html>',
      );

      server.close();
      clearTimeout(timer);

      if (error) {
        reject(
          new Error(
            `Authorization failed: ${error}${errorDescription ? ` (${errorDescription})` : ''}`,
          ),
        );
        return;
      }
      if (!code) {
        reject(new Error('Callback missing authorization code'));
        return;
      }
      if (state !== expectedState) {
        reject(new Error(`State mismatch: expected ${expectedState}, got ${state}`));
        return;
      }
      resolve({ code, state, startUrl, redirectUri });
    });

    server.on('error', reject);

    server.listen(port, '127.0.0.1', () => {
      console.log(`Local test server: ${startUrl} → authorize, callback ${redirectUri}`);
    });

    const timer = setTimeout(() => {
      server.close();
      reject(new Error(`Timed out after ${timeoutMs / 1000}s waiting for callback`));
    }, timeoutMs);
  });
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body, headers: res.headers };
}

function logStep(name, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const { baseUrl, openBrowser } = parseArgs(process.argv.slice(2));
  const redirectUri = `http://127.0.0.1:${CALLBACK_PORT}${CALLBACK_PATH}`;
  const state = randomBytes(16).toString('hex');
  const { verifier, challenge } = generatePkcePair();

  console.log(`\nips5-mcp OAuth E2E test\nBase URL: ${baseUrl}\n`);

  // --- Metadata ---
  const prmUrl = `${baseUrl}/.well-known/oauth-protected-resource/mcp`;
  const prm = await fetchJson(prmUrl);
  logStep(
    'Protected resource metadata',
    prm.ok && typeof prm.body === 'object' && prm.body.resource,
    prm.ok ? String(prm.body.resource) : `HTTP ${prm.status}`,
  );
  if (!prm.ok) {
    console.error(prm.body);
    process.exit(1);
  }

  const asUrl = `${baseUrl}/.well-known/oauth-authorization-server`;
  const asMeta = await fetchJson(asUrl);
  logStep(
    'Authorization server metadata',
    asMeta.ok && typeof asMeta.body === 'object' && asMeta.body.issuer,
    asMeta.ok ? String(asMeta.body.issuer) : `HTTP ${asMeta.status}`,
  );
  if (!asMeta.ok) {
    console.error(asMeta.body);
    process.exit(1);
  }

  const health = await fetchJson(`${baseUrl}/health`);
  const oauthConfigured =
    health.ok && typeof health.body === 'object' && health.body.oauth_configured === true;
  logStep(
    'Health oauth_configured',
    oauthConfigured,
    oauthConfigured ? 'true' : JSON.stringify(health.body),
  );
  if (!oauthConfigured) {
    console.error('Server reports OAuth is not fully configured. Fix env vars before testing.');
    process.exit(1);
  }

  // --- DCR ---
  const registerRes = await fetchJson(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_name: `oauth-e2e-test-${Date.now()}`,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });

  const clientId =
    typeof registerRes.body === 'object' && registerRes.body?.client_id
      ? registerRes.body.client_id
      : null;
  logStep('Dynamic client registration', registerRes.ok && clientId, clientId ?? `HTTP ${registerRes.status}`);
  if (!registerRes.ok || !clientId) {
    console.error(registerRes.body);
    process.exit(1);
  }

  // --- Authorize (browser) ---
  const authorizeUrl = new URL(`${baseUrl}/authorize`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);

  console.log('\n--- Browser login ---');
  console.log('Log in at kopywriting.com with an administrator account.');
  console.log(`Full authorize URL (for manual copy):\n${authorizeUrl.href}\n`);

  const oauthPromise = startOAuthTestServer({
    port: CALLBACK_PORT,
    expectedState: state,
    authorizeUrl: authorizeUrl.href,
  });

  // Wait until local server is listening before opening browser.
  await new Promise((r) => setTimeout(r, 300));
  const startUrl = `http://127.0.0.1:${CALLBACK_PORT}${START_PATH}`;

  if (openBrowser) {
    openInBrowser(startUrl);
    console.log(`Opened browser at ${startUrl} (redirects to authorize with all query params).`);
    console.log('Complete IPS login if prompted…');
  } else {
    console.log(`--no-browser: open ${startUrl} or the full authorize URL above.`);
  }

  let code;
  try {
    ({ code } = await oauthPromise);
    logStep('Authorization callback', true, 'code received');
  } catch (err) {
    logStep('Authorization callback', false, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // --- Token ---
  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });

  const tokenRes = await fetchJson(`${baseUrl}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: tokenBody,
  });

  const accessToken =
    typeof tokenRes.body === 'object' && tokenRes.body?.access_token
      ? tokenRes.body.access_token
      : null;
  logStep(
    'Token exchange',
    tokenRes.ok && accessToken,
    tokenRes.ok ? `expires_in=${tokenRes.body.expires_in}` : `HTTP ${tokenRes.status}`,
  );
  if (!tokenRes.ok || !accessToken) {
    console.error(tokenRes.body);
    process.exit(1);
  }

  // --- MCP initialize ---
  const mcpRes = await fetchJson(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'oauth-e2e-test', version: '1.0' },
      },
      id: 1,
    }),
  });

  const mcpOk =
    mcpRes.ok &&
    (typeof mcpRes.body === 'object' &&
      (mcpRes.body.result?.serverInfo || mcpRes.body.result?.protocolVersion)) ||
      (typeof mcpRes.body === 'string' && mcpRes.body.includes('serverInfo'));

  logStep('MCP initialize with OAuth token', mcpOk, `HTTP ${mcpRes.status}`);
  if (!mcpOk) {
    console.error(mcpRes.body);
    process.exit(1);
  }

  const sessionId = mcpRes.headers.get('mcp-session-id');
  if (sessionId) {
    console.log(`MCP session id: ${sessionId}`);
  }

  if (typeof mcpRes.body === 'object' && mcpRes.body.result?.serverInfo) {
    console.log(`Server: ${mcpRes.body.result.serverInfo.name} v${mcpRes.body.result.serverInfo.version}`);
  }

  console.log('\nAll steps passed. OAuth flow is working end-to-end.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
