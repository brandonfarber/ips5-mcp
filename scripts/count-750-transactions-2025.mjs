/**
 * Count Nexus transactions with amount $750.00 in calendar year 2025.
 * Uses the same REST API as ips5-mcp (GET /api/nexus/transactions).
 */
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const baseUrl = (process.env.IPS5_BASE_URL ?? '').replace(/\/+$/, '');
const apiKey = process.env.IPS5_API_KEY ?? '';
if (!baseUrl || !apiKey) {
  console.error('Missing IPS5_BASE_URL or IPS5_API_KEY in .env');
  process.exit(1);
}

const TARGET = 750;
const YEAR_START = Date.parse('2025-01-01T00:00:00.000Z');
const YEAR_END = Date.parse('2026-01-01T00:00:00.000Z');
const PER_PAGE = 100;

function authHeader() {
  return `Basic ${Buffer.from(`${apiKey}:`, 'utf8').toString('base64')}`;
}

async function fetchPage(page) {
  const qs = new URLSearchParams({
    perPage: String(PER_PAGE),
    page: String(page),
    sortBy: 'date',
    sortDir: 'asc',
    statuses: 'okay',
  });
  const url = `${baseUrl}/api/nexus/transactions?${qs}`;
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader(),
      'User-Agent': 'ips5-mcp/0.0.1',
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

function parseAmount(amount) {
  return parseFloat(String(amount?.amount ?? amount).replace(/,/g, ''));
}

function in2025(isoDate) {
  const t = Date.parse(isoDate);
  return t >= YEAR_START && t < YEAR_END;
}

const matches = [];
let page = 1;
let totalPages = 1;
let scanned = 0;
let pastYear = false;

while (page <= totalPages && !pastYear) {
  const data = await fetchPage(page);
  totalPages = data.totalPages ?? 1;
  scanned += data.results?.length ?? 0;

  for (const tx of data.results ?? []) {
    const d = Date.parse(tx.date);
    if (d >= YEAR_END) {
      pastYear = true;
      break;
    }
    if (!in2025(tx.date)) {
      continue;
    }
    const amt = parseAmount(tx.amount);
    if (Math.abs(amt - TARGET) < 0.005) {
      matches.push({
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        invoiceId: tx.invoiceId,
        customer: tx.customer?.name ?? tx.customer?.id,
      });
    }
  }

  page++;
  if (page % 10 === 0) {
    console.error(`Scanned page ${page - 1}/${totalPages}...`);
  }
}

console.log(
  JSON.stringify(
    {
      year: 2025,
      amountUsd: TARGET,
      statusFilter: 'okay',
      transactionsScanned: scanned,
      count: matches.length,
      transactions: matches,
    },
    null,
    2,
  ),
);
