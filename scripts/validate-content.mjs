import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const articlesDir = path.join(root, 'src', 'content', 'articles');
const categoriesFile = path.join(root, 'src', 'config', 'categories.ts');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: raw };
  const block = match[1];
  const data = {};
  let currentKey = null;

  for (const line of block.split(/\r?\n/)) {
    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      const item = listItem[1].trim().replace(/^["']|["']$/g, '');
      if (/^(title|url|publisher|accessed|note|question|answer):/.test(item)) continue;
      if (item.includes(':') && !/^[a-z0-9-]+$/.test(item)) continue;
      data[currentKey].push(item);
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, valueRaw] = kv;
    currentKey = key;
    const value = valueRaw.trim();
    if (value === '' || value === '|' || value === '>') {
      data[key] = Array.isArray(data[key]) ? data[key] : [];
      continue;
    }
    if (value === 'true' || value === 'false') data[key] = value === 'true';
    else data[key] = value.replace(/^["']|["']$/g, '');
  }

  return { data, body: raw.slice(match[0].length) };
}

function loadAllowedCategories() {
  const raw = fs.readFileSync(categoriesFile, 'utf8');
  const match = raw.match(/ARTICLE_CATEGORIES\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!match) return new Set();
  return new Set([...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
}

function loadArticles() {
  return fs
    .readdirSync(articlesDir)
    .filter((name) => name.endsWith('.md') || name.endsWith('.mdx'))
    .map((name) => {
      const raw = fs.readFileSync(path.join(articlesDir, name), 'utf8');
      return { file: name, ...parseFrontmatter(raw) };
    });
}

const PLACEHOLDER_PATTERN =
  /\[?\s*placeholder\s*\]?|research needed|to be researched|todo:|tbd\b/i;

function hasPlaceholder(article) {
  const { data, body } = article;
  if (PLACEHOLDER_PATTERN.test(body)) return true;
  if (PLACEHOLDER_PATTERN.test(String(data.description ?? ''))) return true;
  if (data.summary && PLACEHOLDER_PATTERN.test(String(data.summary))) return true;
  return false;
}

function isIndexable(article) {
  const draft = article.data.draft === false ? false : true;
  const noindex = article.data.noindex === true;
  return !draft && !noindex && !hasPlaceholder(article);
}

const allowedCategories = loadAllowedCategories();
const articles = loadArticles();
const errors = [];

const slugs = new Map();
const titles = new Map();
const descriptions = new Map();

for (const article of articles) {
  const slug = article.data.slug;
  const title = article.data.title;
  const description = article.data.description;
  const category = article.data.category;

  if (!slug) errors.push(`${article.file}: missing slug`);
  else if (slugs.has(slug)) errors.push(`Duplicate slug "${slug}": ${slugs.get(slug)} and ${article.file}`);
  else slugs.set(slug, article.file);

  if (!title) errors.push(`${article.file}: missing title`);
  else if (titles.has(title)) errors.push(`Duplicate title "${title}": ${titles.get(title)} and ${article.file}`);
  else titles.set(title, article.file);

  if (!description) errors.push(`${article.file}: missing description`);
  else if (descriptions.has(description)) {
    errors.push(`Duplicate description in ${descriptions.get(description)} and ${article.file}`);
  } else descriptions.set(description, article.file);

  if (!category) errors.push(`${article.file}: missing category`);
  else if (allowedCategories.size > 0 && !allowedCategories.has(category)) {
    errors.push(`${article.file}: invalid category "${category}"`);
  }

  if (article.data.featuredImage) {
    const imagePath = path.join(root, 'public', String(article.data.featuredImage).replace(/^\//, ''));
    if (!fs.existsSync(imagePath)) {
      errors.push(`${article.file}: missing image ${article.data.featuredImage}`);
    }
    if (!article.data.featuredImageAlt) {
      errors.push(`${article.file}: featuredImageAlt required when featuredImage is set`);
    }
  }
}

const bySlug = new Map(articles.map((a) => [a.data.slug, a]));
const indexableSlugs = new Set(articles.filter(isIndexable).map((a) => a.data.slug));

for (const article of articles) {
  const related = Array.isArray(article.data.relatedArticles) ? article.data.relatedArticles : [];
  for (const relatedSlug of related) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(relatedSlug)) continue;
    if (!bySlug.has(relatedSlug)) {
      errors.push(`${article.file}: broken relatedArticles slug "${relatedSlug}"`);
      continue;
    }
    // Published/indexable articles must not point related links at hidden content.
    if (isIndexable(article) && !indexableSlugs.has(relatedSlug)) {
      errors.push(
        `${article.file}: relatedArticles slug "${relatedSlug}" points to draft/noindex/unfinished content`,
      );
    }
  }
}

if (errors.length) {
  console.error('validate:content failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `validate:content passed (${articles.length} articles, ${indexableSlugs.size} indexable, ${allowedCategories.size} categories)`,
);
