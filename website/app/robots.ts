import type { MetadataRoute } from 'next';

// Assistant crawlers are named explicitly, not just covered by the
// wildcard: being fetched by them is the first measurable GEO signal,
// and the explicit rule is the deliberate version of that choice.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/' })),
    ],
    sitemap: 'https://getcardpulse.app/sitemap.xml',
    host: 'https://getcardpulse.app',
  };
}
