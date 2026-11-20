import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

if (!fs.existsSync(dist)) {
  console.error('validate:links requires dist/. Run npm run build first.');
  process.exit(1);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function routeFromHtmlFile(file) {
  const rel = path.relative(dist, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404';
  return `/${rel.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`;
}

function assetExists(pathname) {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const candidates = [
    path.join(dist, normalized.slice(1)),
    path.join(dist, normalized.slice(1), 'index.html'),
    path.join(root, 'public', normalized.slice(1)),
  ];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

const allFiles = walk(dist);
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
const routes = new Set(htmlFiles.map(routeFromHtmlFile));
if (fs.existsSync(path.join(dist, 'search-index.json'))) routes.add('/search-index.json');
if (fs.existsSync(path.join(dist, 'robots.txt'))) routes.add('/robots.txt');

const errors = [];
const hrefPattern = /href=(["'])(.*?)\1/gi;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const from = routeFromHtmlFile(file);
  let match;
  while ((match = hrefPattern.exec(html))) {
    const href = match[2];
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (href.startsWith('#')) continue;
    const [pathname] = href.split('?');
    if (!pathname.startsWith('/')) continue;
    const normalized = pathname.replace(/\/$/, '') || '/';

    // Page routes
    if (routes.has(normalized)) continue;

    // Static assets (/_astro/*, images, favicon, etc.)
    if (normalized.startsWith('/_astro/') || path.extname(normalized)) {
      if (!assetExists(normalized)) {
        errors.push(`${from} → missing asset ${normalized}`);
      }
      continue;
    }

    errors.push(`${from} → missing ${normalized}`);
  }
}

const articlesDir = path.join(root, 'src', 'content', 'articles');
for (const name of fs.readdirSync(articlesDir)) {
  if (!name.endsWith('.md')) continue;
  const raw = fs.readFileSync(path.join(articlesDir, name), 'utf8');
  const draft = /^draft:\s*true\s*$/m.test(raw);
  const noindex = /^noindex:\s*true\s*$/m.test(raw);
  const slugMatch = raw.match(/^slug:\s*["']?([a-z0-9-]+)["']?\s*$/m);
  const categoryMatch = raw.match(/^category:\s*["']?([a-z0-9-]+)["']?\s*$/m);
  if ((draft || noindex) && slugMatch && categoryMatch) {
    const route = `/${categoryMatch[1]}/${slugMatch[1]}`;
    if (routes.has(route)) {
      errors.push(`Draft/noindex leakage: ${route} was built`);
    }
  }
}

if (errors.length) {
  console.error('validate:links failed:');
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`validate:links passed (${routes.size} routes checked)`);
