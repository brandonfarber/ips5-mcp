import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const baseUrl = (process.env.IPS5_BASE_URL ?? '').replace(/\/+$/, '');
const apiKey = process.env.IPS5_API_KEY ?? '';

const invoiceIds = [1668531, 1668911, 1668974, 1669094, 1669945, 1670194, 1670248];

function authHeader() {
  return `Basic ${Buffer.from(`${apiKey}:`, 'utf8').toString('base64')}`;
}

async function get(path) {
  const res = await fetch(`${baseUrl}/api${path}`, {
    headers: { Authorization: authHeader(), 'User-Agent': 'ips5-mcp/0.0.1' },
  });
  return res.json();
}

async function getPurchasesForCustomer(customerId) {
  const qs = new URLSearchParams({ customers: String(customerId), perPage: '100' });
  const data = await get(`/nexus/purchases?${qs}`);
  return data.results ?? [];
}

const out = [];
for (const id of invoiceIds) {
  const inv = await get(`/nexus/invoices/${id}`);
  const item = inv.items?.[0];
  const customerId = inv.customer?.id;
  const paid = inv.paidDate;
  const prior = (await getPurchasesForCustomer(customerId)).filter((p) => {
    const purchased = Date.parse(p.purchased);
    return purchased < Date.parse(paid) && p.name === 'Yearly';
  });
  const isRenewal =
    Boolean(item?.parentPurchase) ||
    prior.length > 0 ||
    (inv.title?.toLowerCase().includes('renew') ?? false);

  out.push({
    invoiceId: id,
    transactionId: inv.transactions?.[0]?.id,
    customer: inv.customer?.name,
    paidDate: paid,
    lineItem: item?.name,
    linePrice: item?.linePrice?.amount,
    priorYearlyPurchases: prior.length,
    type: isRenewal ? 'renewal' : 'new_sale',
  });
}

console.log(JSON.stringify(out, null, 2));
