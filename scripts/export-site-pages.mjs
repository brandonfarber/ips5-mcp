import fs from 'node:fs';

const [, , markdownOut, csvOut, ...inputFiles] = process.argv;

if (!markdownOut || !csvOut || inputFiles.length === 0) {
  console.error('Usage: node scripts/export-site-pages.mjs <markdownOut> <csvOut> <response.json>...');
  process.exit(1);
}

const pages = inputFiles.flatMap((file) => {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  return payload.results ?? [];
});

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const markdownEscape = (value) =>
  String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');

const csv = [
  'id,type,full_path,name,url',
  ...pages.map((page) =>
    [page.id, page.type, page.full_path, page.name, page.url].map(csvEscape).join(','),
  ),
].join('\n');

const markdown = [
  '# Site Pages',
  '',
  `Total pages: ${pages.length}`,
  '',
  '| ID | Type | Path | Name | URL |',
  '|---:|---|---|---|---|',
  ...pages.map(
    (page) =>
      `| ${page.id} | ${markdownEscape(page.type)} | \`${markdownEscape(
        page.full_path,
      )}\` | ${markdownEscape(page.name)} | ${markdownEscape(page.url)} |`,
  ),
].join('\n');

fs.writeFileSync(markdownOut, `${markdown}\n`, 'utf8');
fs.writeFileSync(csvOut, `${csv}\n`, 'utf8');

const counts = pages.reduce((acc, page) => {
  acc[page.type] = (acc[page.type] ?? 0) + 1;
  return acc;
}, {});

console.log(
  JSON.stringify(
    {
      total: pages.length,
      counts,
      first10: pages.slice(0, 10).map((page) => ({
        id: page.id,
        type: page.type,
        path: page.full_path,
        name: page.name,
        url: page.url,
      })),
    },
    null,
    2,
  ),
);
