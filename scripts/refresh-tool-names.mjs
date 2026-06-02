/**
 * Recomputes toolName for every entry in endpoints.json (no Invision source tree required).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildToolName } from '../src/ips/tool-name.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, '..', 'src', 'ips', 'endpoints.json');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
let changed = 0;

for (const endpoint of catalog.endpoints) {
  const next = buildToolName(endpoint.method, endpoint.path);
  if (endpoint.toolName !== next) {
    changed++;
    endpoint.toolName = next;
  }
}

catalog.endpoints.sort((a, b) => a.toolName.localeCompare(b.toolName));

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`Updated ${changed} tool names in ${catalogPath}`);
