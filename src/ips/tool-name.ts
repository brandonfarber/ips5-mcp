/**
 * Builds MCP tool names for Cursor's 60-character combined server+tool limit.
 * Tool-only budget defaults to 33 chars (60 − 27 for project-0-{workspace}-{serverKey}).
 */

/** Cursor: len(serverName) + len(toolName) must not exceed 60. */
export const CURSOR_MAX_COMBINED_NAME_LENGTH = 60;

/**
 * Worst-case server name when the workspace folder and mcp.json key match (e.g. project-0-ips5-mcp-ips5-mcp).
 * Override with IPS5_MCP_SERVER_NAME in env when registering tools if needed.
 */
export const CURSOR_DEFAULT_SERVER_NAME_LENGTH = 27;

export const CURSOR_DEFAULT_MAX_TOOL_NAME_LENGTH =
  CURSOR_MAX_COMBINED_NAME_LENGTH - CURSOR_DEFAULT_SERVER_NAME_LENGTH;

const METHOD_PREFIX: Record<string, string> = {
  GET: 'g_',
  POST: 'p_',
  PUT: 'u_',
  DELETE: 'd_',
};

/** Long custom app keys → short slug (site-specific apps can be added here). */
const APP_ALIASES: Record<string, string> = {
  copywritingcourse: 'cwc',
};

/** Path segment tokens in tool names only (API paths unchanged). */
const SEGMENT_ALIASES: Record<string, string> = {
  database_id: 'db',
  comment_id: 'cmt',
  record_id: 'rec',
  category_id: 'cat',
  member_id: 'mbr',
  members: 'mem',
  entrycategories: 'entrycats',
  warnreasons: 'warnrs',
  achievements: 'ach',
  warnings: 'warns',
  warning: 'warn',
  acknowledge: 'ack',
  awardbadge: 'award',
  notifications: 'notif',
  secgroup: 'secgrp',
  follows: 'fol',
  followKey: 'fk',
  groupId: 'gid',
  comments: 'cmt',
  categories: 'cats',
  calendars: 'cals',
  contenttypes: 'ctypes',
  converters: 'conv',
  downloads: 'dls',
  gallery: 'gal',
  calendar: 'cal',
};

function normalizeSegment(segment: string): string {
  const bare = segment.replace(/\{|\}/g, '');
  return SEGMENT_ALIASES[bare] ?? bare;
}

function collapseDuplicateSegments(parts: string[]): string[] {
  const out: string[] = [];
  for (const part of parts) {
    if (out.length > 0 && out[out.length - 1] === part) {
      continue;
    }
    out.push(part);
  }
  return out;
}

/** Collapse warns + warn (parent collection + {warning} param) to a single warn token. */
function collapseWarnPair(parts: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'warns' && parts[i + 1] === 'warn') {
      out.push('warn');
      i++;
      continue;
    }
    out.push(parts[i]!);
  }
  return out;
}

function buildBody(method: string, apiPath: string): string {
  const prefix = METHOD_PREFIX[method.toUpperCase()];
  if (!prefix) {
    throw new Error(`Unsupported HTTP method for tool name: ${method}`);
  }

  const raw = apiPath
    .split('/')
    .filter(Boolean)
    .map(normalizeSegment);

  const appKey = raw[0];
  if (appKey !== undefined) {
    raw[0] = APP_ALIASES[appKey] ?? appKey;
  }

  let segments = collapseDuplicateSegments(raw);
  segments = collapseWarnPair(segments);
  return `${prefix}${segments.join('_')}`.replace(/__+/g, '_');
}

function squeezeToolName(name: string, maxLen: number): string {
  let squeezed = name
    .replace(/_id_/g, '_')
    .replace(/_badge_/g, '_')
    .replace(/__+/g, '_');

  if (squeezed.length <= maxLen) {
    return squeezed;
  }

  const parts = squeezed.split('_');
  const shortParts = parts.map((p) => {
    if (p.length <= 4) {
      return p;
    }
    return p.slice(0, 4);
  });
  squeezed = shortParts.join('_').replace(/__+/g, '_');

  if (squeezed.length <= maxLen) {
    return squeezed;
  }

  return squeezed.slice(0, maxLen).replace(/_+$/u, '');
}

/**
 * @param maxLen Tool name only (default fits Cursor project MCP server names).
 */
export function buildToolName(
  method: string,
  apiPath: string,
  maxLen: number = CURSOR_DEFAULT_MAX_TOOL_NAME_LENGTH,
): string {
  const body = buildBody(method, apiPath);
  if (body.length <= maxLen) {
    return body;
  }
  return squeezeToolName(body, maxLen);
}

export function combinedNameLength(serverName: string, toolName: string): number {
  return serverName.length + toolName.length;
}

export function fitsCursorCombinedLimit(
  serverName: string,
  toolName: string,
  maxCombined: number = CURSOR_MAX_COMBINED_NAME_LENGTH,
): boolean {
  return combinedNameLength(serverName, toolName) <= maxCombined;
}
