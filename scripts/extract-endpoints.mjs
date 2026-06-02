/**
 * Scans Invision Community application/api/*.php docblocks and builds endpoints.json.
 *
 * Usage:
 *   node scripts/extract-endpoints.mjs [path-to-invision5]
 *
 * Default invision5 path: ../invision5 relative to repo root.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildToolName } from '../src/ips/tool-name.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const defaultIpsRoot = path.resolve(repoRoot, '..', 'invision5');
const ipsRoot = path.resolve(process.argv[2] ?? defaultIpsRoot);
const outFile = path.join(repoRoot, 'src', 'ips', 'endpoints.json');

const ROUTE_LINE = /^\s*\*\s*(GET|POST|PUT|DELETE)\s+(\/[^\s*]+)/;
const API_PARAM = /^\s*\*\s*@(reqapiparam|apiparam)\s+/;
const API_MEMBER = /^\s*\*\s*@apimemberonly\b/;
const API_CLIENT = /^\s*\*\s*@apiclientonly\b/;

function parseApiFile(filePath, app, controller) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const endpoints = [];

  for (let i = 0; i < lines.length; i++) {
    const routeMatch = lines[i].match(ROUTE_LINE);
    if (!routeMatch) {
      continue;
    }

    const method = routeMatch[1];
    const apiPath = routeMatch[2];
    let description = '';
    const queryParams = [];
    let memberOnly = false;
    let clientOnly = false;

    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (/^\s*\*\/\s*$/.test(line) || /^\s*public function /.test(line)) {
        break;
      }
      if (/^\s*\*\s*(GET|POST|PUT|DELETE)\s+\//.test(line)) {
        break;
      }
      if (API_MEMBER.test(line)) {
        memberOnly = true;
      }
      if (API_CLIENT.test(line)) {
        clientOnly = true;
      }
      const paramMatch = line.match(API_PARAM);
      if (paramMatch) {
        const rest = line.replace(API_PARAM, '').trim();
        const parts = rest.split(/\s+/).map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          queryParams.push({
            name: parts[1].replace(/^\$/, ''),
            type: parts[0],
            description: parts.slice(2).join(' '),
            required: paramMatch[1] === 'reqapiparam',
          });
        }
      } else if (
        /^\s*\*\s*[^@]/.test(line) &&
        !/^\s*\*\s*@(apireturn|apiresponse|throws|note|brief)/.test(line)
      ) {
        const descLine = line.replace(/^\s*\*\s?/, '').trim();
        if (descLine && !description) {
          description = descLine;
        }
      }
    }

    const pathParams = [...apiPath.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
    const id = `${app}/${controller}/${method}${pathSuffixFromPath(apiPath)}`;

    endpoints.push({
      id,
      app,
      controller,
      method,
      path: apiPath,
      pathParams,
      queryParams,
      description: description || `${method} ${apiPath}`,
      memberOnly,
      clientOnly,
      toolName: buildToolName(method, apiPath),
    });
  }

  return endpoints;
}

function pathSuffixFromPath(apiPath) {
  const segments = apiPath.split('/').filter(Boolean);
  if (segments.length <= 2) {
    return '_index';
  }
  return `_${segments.slice(2).join('_').replace(/\{|\}/g, '')}`;
}

function main() {
  const appsDir = path.join(ipsRoot, 'applications');
  if (!fs.existsSync(appsDir)) {
    console.error(`Invision root not found: ${ipsRoot}`);
    process.exit(1);
  }

  const all = [];
  for (const app of fs.readdirSync(appsDir)) {
    const apiDir = path.join(appsDir, app, 'api');
    if (!fs.statSync(path.join(appsDir, app)).isDirectory() || !fs.existsSync(apiDir)) {
      continue;
    }
    for (const file of fs.readdirSync(apiDir)) {
      if (!file.endsWith('.php')) {
        continue;
      }
      const controller = file.slice(0, -4);
      const filePath = path.join(apiDir, file);
      all.push(...parseApiFile(filePath, app, controller));
    }
  }

  all.sort((a, b) => a.toolName.localeCompare(b.toolName));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: ipsRoot,
    count: all.length,
    endpoints: all,
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${all.length} endpoints to ${outFile}`);
}

main();
