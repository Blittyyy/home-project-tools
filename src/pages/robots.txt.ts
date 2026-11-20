import { SITE_URL } from '../config/site';

export const prerender = true;

export async function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /*?q=

Sitemap: ${SITE_URL}/sitemap-index.xml
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
