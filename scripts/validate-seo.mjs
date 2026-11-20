import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const articlesDir = path.join(root, 'src', 'content', 'articles');

if (!fs.existsSync(dist)) {
  console.error('validate:seo requires dist/. Run npm run build first.');
  process.exit(1);
}

const siteConfig = fs.readFileSync(path.join(root, 'src', 'config', 'site.ts'), 'utf8');
const siteUrlMatch = siteConfig.match(/SITE_URL\s*=\s*['"]([^'"]+)['"]/);
const siteUrl = siteUrlMatch?.[1] ?? '';

const errors = [];

if (!siteUrl || siteUrl.includes('localhost')) {
  errors.push(`SITE_URL must be a production origin (found: ${siteUrl || 'missing'})`);
}

const robotsPath = path.join(dist, 'robots.txt');
if (!fs.existsSync(robotsPath)) {
  errors.push('Missing dist/robots.txt');
} else {
  const robots = fs.readFileSync(robotsPath, 'utf8');
  if (!robots.includes('Disallow: /*?q=')) {
    errors.push('robots.txt should disallow /*?q=');
  }
  if (!robots.includes(`Sitemap: ${siteUrl}/sitemap-index.xml`)) {
    errors.push(`robots.txt Sitemap should be ${siteUrl}/sitemap-index.xml`);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith('.html') || entry.name.endsWith('.xml') || entry.name.endsWith('.json') || entry.name === 'robots.txt') {
      files.push(full);
    }
  }
  return files;
}

const files = walk(dist);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

function routeFromFile(file) {
  const rel = path.relative(dist, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404';
  return `/${rel.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const value = kv[2].trim().replace(/^["']|["']$/g, '');
    if (value === 'true' || value === 'false') data[kv[1]] = value === 'true';
    else data[kv[1]] = value;
  }
  return data;
}

const PLACEHOLDER_PATTERN =
  /\[?\s*placeholder\s*\]?|research needed|to be researched|todo:|tbd\b/i;

const indexableArticleRoutes = [];
for (const name of fs.readdirSync(articlesDir)) {
  if (!name.endsWith('.md')) continue;
  const raw = fs.readFileSync(path.join(articlesDir, name), 'utf8');
  const data = parseFrontmatter(raw);
  const draft = data.draft === false ? false : true;
  const noindex = data.noindex === true;
  const unfinished = PLACEHOLDER_PATTERN.test(raw);
  if (!draft && !noindex && !unfinished && data.category && data.slug) {
    indexableArticleRoutes.push(`/${data.category}/${data.slug}`);
  }
}

let sitemapPageLocs = [];
const sitemapFiles = files.filter((f) => /sitemap.*\.xml$/i.test(path.basename(f)));
for (const file of sitemapFiles) {
  const xml = fs.readFileSync(file, 'utf8');
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  for (const loc of locs) {
    if (loc.includes('localhost')) errors.push(`Sitemap contains localhost: ${loc}`);
    if (loc.includes('/search')) errors.push(`Sitemap includes search URL: ${loc}`);
    if (loc.includes('/404')) errors.push(`Sitemap includes 404: ${loc}`);
    if (!loc.endsWith('.xml')) sitemapPageLocs.push(loc.replace(/\/$/, '') || loc);
  }
}

if (sitemapFiles.length === 0) {
  errors.push('No sitemap XML found in dist/');
}

const sitemapPaths = new Set(
  sitemapPageLocs.map((loc) => {
    try {
      const url = new URL(loc);
      return url.pathname.replace(/\/$/, '') || '/';
    } catch {
      return loc;
    }
  }),
);

for (const route of indexableArticleRoutes) {
  if (!sitemapPaths.has(route)) {
    errors.push(`Indexable article missing from sitemap: ${route}`);
  }
}

const searchIndexPath = path.join(dist, 'search-index.json');
let searchHrefs = new Set();
if (!fs.existsSync(searchIndexPath)) {
  errors.push('Missing dist/search-index.json');
} else {
  const index = JSON.parse(fs.readFileSync(searchIndexPath, 'utf8'));
  if (!Array.isArray(index)) errors.push('search-index.json must be an array');
  const routes = new Set(htmlFiles.map(routeFromFile));
  for (const doc of index) {
    if (!doc.slug || !doc.title || !doc.href) {
      errors.push('search-index entry missing slug/title/href');
      break;
    }
    if (String(doc.href).includes('localhost')) {
      errors.push(`search-index href has localhost: ${doc.href}`);
    }
    if (!routes.has(doc.href)) {
      errors.push(`search-index href not built: ${doc.href}`);
    }
    searchHrefs.add(doc.href);
  }

  for (const route of indexableArticleRoutes) {
    if (!searchHrefs.has(route)) {
      errors.push(`Indexable article missing from search-index: ${route}`);
    }
  }
}

for (const file of htmlFiles) {
  const route = routeFromFile(file);
  const html = fs.readFileSync(file, 'utf8');

  const canonical = html.match(/rel="canonical"\s+href="([^"]+)"/i)?.[1]
    || html.match(/href="([^"]+)"\s+rel="canonical"/i)?.[1];
  if (!canonical) {
    errors.push(`${route}: missing canonical`);
  } else {
    if (canonical.includes('localhost')) errors.push(`${route}: canonical is localhost`);
    if (!canonical.startsWith(siteUrl)) errors.push(`${route}: canonical host mismatch (${canonical})`);
    if (canonical.includes('?')) errors.push(`${route}: canonical has query string`);
  }

  if (route === '/search') {
    if (!/noindex/i.test(html)) errors.push('/search should be noindex');
    if (!/follow/i.test(html)) errors.push('/search should include follow in robots');
  }

  if (route === '/404') {
    if (!/noindex/i.test(html)) errors.push('/404 should be noindex');
  }

  // Empty article category hubs and empty calculators hub must stay noindex.
  const categoryHubRoutes = ['/projects', '/materials', '/guides'];
  if (categoryHubRoutes.includes(route)) {
    const hasIndexableInCategory = indexableArticleRoutes.some((articleRoute) =>
      articleRoute.startsWith(`${route}/`),
    );
    if (!hasIndexableInCategory) {
      if (!/noindex/i.test(html)) {
        errors.push(`${route}: empty category hub should be noindex`);
      }
      if (sitemapPaths.has(route)) {
        errors.push(`${route}: empty category hub should be omitted from sitemap`);
      }
    }
  }

  if (route === '/calculators') {
    const hasCalculatorPage = htmlFiles.some((f) => {
      const r = routeFromFile(f);
      return r.startsWith('/calculators/') && r !== '/calculators';
    });
    if (!hasCalculatorPage) {
      if (!/noindex/i.test(html)) {
        errors.push('/calculators: hub with no available tools should be noindex');
      }
      if (sitemapPaths.has('/calculators')) {
        errors.push('/calculators: empty tools hub should be omitted from sitemap');
      }
    }
  }

  if (/https?:\/\/localhost/i.test(html)) {
    errors.push(`${route}: contains localhost URL`);
  }

  // Block fake rich-result schema types.
  if (/application\/ld\+json/i.test(html)) {
    if (/"@type"\s*:\s*"Offer"/i.test(html)) errors.push(`${route}: unexpected Offer schema`);
    if (/"@type"\s*:\s*"AggregateRating"/i.test(html)) errors.push(`${route}: unexpected AggregateRating schema`);
    if (/"@type"\s*:\s*"Review"/i.test(html)) errors.push(`${route}: unexpected Review schema`);
  }
}

// After SITE_URL leaves example.com, leftover example.com in build output is a config drift bug.
if (siteUrl && !siteUrl.includes('example.com')) {
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('example.com')) {
      errors.push(`Leftover example.com in ${path.relative(root, file)} after SITE_URL change`);
    }
  }
}

if (errors.length) {
  console.error('validate:seo failed:');
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `validate:seo passed (sitemap page locs ≈ ${sitemapPaths.size}, indexable articles ${indexableArticleRoutes.length})`,
);
