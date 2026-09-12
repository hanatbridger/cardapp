import type { MetadataRoute } from 'next';

const BASE = 'https://getcardpulse.app';

const routes = [
  '', '/how-it-works', '/price-alerts', '/returns', '/market-dynamics', '/methodology', '/pricing',
  '/about', '/changelog', '/support', '/privacy', '/terms',
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
