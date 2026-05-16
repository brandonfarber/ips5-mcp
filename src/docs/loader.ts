import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));

/**
 * Project root: `src/docs` → repo root; `dist/docs` → repo root.
 */
export function getProjectRoot(): string {
  return join(moduleDir, '..', '..');
}

export function readDocFile(relativePath: string): string {
  const path = join(getProjectRoot(), relativePath);
  if (!existsSync(path)) {
    throw new Error(`Documentation file not found: ${path}`);
  }
  return readFileSync(path, 'utf8');
}

/** Short instructions sent in MCP server initialization. */
export function loadMcpInstructions(): string {
  return readDocFile('docs/mcp-instructions.md');
}

/** Full site-specific guide for agents (glossary + recipes). */
export function loadAgentGuide(): string {
  return readDocFile('docs/agent-guide.md');
}
