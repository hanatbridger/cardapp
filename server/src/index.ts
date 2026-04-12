import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { fetchSoldPrices, clearCache } from './ebay';

const app = new Hono();

const EBAY_APP_ID = process.env.EBAY_APP_ID || '';
const PORT = parseInt(process.env.PORT || '3001', 10);

if (!EBAY_APP_ID) {
  console.error('EBAY_APP_ID is not set. Check your .env file.');
}

// CORS for Expo dev client
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'OPTIONS'],
}));

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'CardPulse API' }));

/**
 * GET /api/prices?card=<name>&grade=<PSA10|UNGRADED>
 * Returns aggregated sold listing data from eBay
 */
app.get('/api/prices', async (c) => {
  const card = c.req.query('card');
  const grade = c.req.query('grade') || 'PSA10';

  if (!card) {
    return c.json({ error: 'Missing "card" query parameter' }, 400);
  }

  if (!EBAY_APP_ID) {
    return c.json({ error: 'eBay API not configured' }, 500);
  }

  try {
    const lang = c.req.query('lang') || 'EN';
    const setName = c.req.query('set') || undefined;
    const cardNumber = c.req.query('number') || undefined;
    const result = await fetchSoldPrices(EBAY_APP_ID, card, grade, lang, setName, cardNumber);

    // Calculate % change: last sale vs the sale before it
    let percentChange = 0;
    let previousSalePrice = result.lastSalePrice;
    if (result.items.length >= 2) {
      // items are sorted by endTime descending (most recent first)
      const lastSale = result.items[0].price;
      const prevSale = result.items[1].price;
      previousSalePrice = prevSale;
      if (prevSale > 0) {
        percentChange = Math.round(((lastSale - prevSale) / prevSale) * 10000) / 100;
      }
    }

    return c.json({
      cardName: result.cardName,
      grade: result.grade,
      currentPrice: result.lastSalePrice || result.medianPrice,
      averagePrice: result.averagePrice,
      highPrice: result.highPrice,
      lowPrice: result.lowPrice,
      salesCount: result.salesCount,
      lastSaleDate: result.lastSaleDate,
      lastSalePrice: result.lastSalePrice,
      percentChange,
      previousPrice: previousSalePrice,
      recentSales: result.items,
    });
  } catch (error: any) {
    console.error('eBay API error:', error.message);
    return c.json({ error: 'Failed to fetch prices', details: error.message }, 500);
  }
});

/**
 * GET /api/prices/history?card=<name>&grade=<grade>&days=30
 * Returns daily price averages (aggregated from sold listings)
 */
app.get('/api/prices/history', async (c) => {
  const card = c.req.query('card');
  const grade = c.req.query('grade') || 'PSA10';

  if (!card) {
    return c.json({ error: 'Missing "card" query parameter' }, 400);
  }

  if (!EBAY_APP_ID) {
    return c.json({ error: 'eBay API not configured' }, 500);
  }

  try {
    const lang = c.req.query('lang') || 'EN';
    const setName = c.req.query('set') || undefined;
    const cardNumber = c.req.query('number') || undefined;
    const result = await fetchSoldPrices(EBAY_APP_ID, card, grade, lang, setName, cardNumber);

    // Group sales by date
    const dailyPrices = new Map<string, number[]>();
    for (const item of result.items) {
      if (!item.endTime) continue;
      const date = new Date(item.endTime).toISOString().split('T')[0];
      const existing = dailyPrices.get(date) || [];
      existing.push(item.price);
      dailyPrices.set(date, existing);
    }

    // Average per day
    const history = Array.from(dailyPrices.entries())
      .map(([date, prices]) => ({
        date,
        price: Math.round((prices.reduce((s, p) => s + p, 0) / prices.length) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return c.json({ cardName: card, grade, history });
  } catch (error: any) {
    console.error('eBay API error:', error.message);
    return c.json({ error: 'Failed to fetch price history', details: error.message }, 500);
  }
});

// Clear cache endpoint (dev only)
app.post('/api/cache/clear', (c) => {
  clearCache();
  return c.json({ status: 'cache cleared' });
});

console.log(`CardPulse API running on http://localhost:${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT,
});
