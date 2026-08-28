import type { MetadataRoute } from 'next';

// Assistant crawlers are allowed deliberately. Getting fetched by
// OAI-SearchBot and ClaudeBot is the first measurable signal that the
// entity is resolvable, and blocking them forfeits it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: 'https://getcardpulse.app/sitemap.xml',
    host: 'https://getcardpulse.app',
  };
}
