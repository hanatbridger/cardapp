/**
 * eBay Finding API client
 * Fetches completed/sold listings for Pokemon cards
 */

const EBAY_FINDING_URL = 'https://svcs.ebay.com/services/search/FindingService/v1';

interface EbaySoldItem {
  title: string;
  price: number;
  currency: string;
  endTime: string;
  listingUrl: string;
}

interface EbayPriceResult {
  cardName: string;
  grade: string;
  items: EbaySoldItem[];
  averagePrice: number;
  medianPrice: number;
  highPrice: number;
  lowPrice: number;
  salesCount: number;
  lastSaleDate: string;
  lastSalePrice: number;
}

// Simple in-memory cache
const cache = new Map<string, { data: EbayPriceResult; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function buildSearchQuery(
  cardName: string,
  grade: string,
  language: string = 'EN',
  setName?: string,
  cardNumber?: string,
): string {
  // Include card name + set name + card number for exact matching
  let query = `"${cardName}"`;

  // Add set name to narrow results to the specific card version
  if (setName) {
    query += ` "${setName}"`;
  }

  // Add card number if available (e.g., 238/191)
  if (cardNumber) {
    query += ` ${cardNumber}`;
  }

  query += ' pokemon';

  // Language filter — critical to avoid mixing JP/EN prices
  if (language === 'JP') {
    query += ' japanese -english';
  } else {
    query += ' -japanese';
  }

  // Grade filter — only PSA 10 and Raw supported
  if (grade === 'PSA10') {
    query += ' PSA 10';
  } else {
    // UNGRADED/Raw: exclude all graded listings
    query += ' -PSA -CGC -BGS -graded -slab';
  }

  return query;
}

function buildFindingUrl(appId: string, query: string, page: number = 1): string {
  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.13.0',
    'SECURITY-APPNAME': appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': '',
    'keywords': query,
    'categoryId': '183454', // Pokemon TCG category
    'itemFilter(0).name': 'SoldItemsOnly',
    'itemFilter(0).value': 'true',
    'itemFilter(1).name': 'Condition',
    'itemFilter(1).value': '1000', // New
    'sortOrder': 'EndTimeSoonest',
    'paginationInput.entriesPerPage': '50',
    'paginationInput.pageNumber': String(page),
  });

  return `${EBAY_FINDING_URL}?${params.toString()}`;
}

function parseItems(response: any): EbaySoldItem[] {
  try {
    const searchResult = response?.findCompletedItemsResponse?.[0]?.searchResult?.[0];
    const items = searchResult?.item || [];

    return items.map((item: any) => ({
      title: item.title?.[0] || '',
      price: parseFloat(item.sellingStatus?.[0]?.convertedCurrentPrice?.[0]?.__value__ || '0'),
      currency: item.sellingStatus?.[0]?.convertedCurrentPrice?.[0]?.['@currencyId'] || 'USD',
      endTime: item.listingInfo?.[0]?.endTime?.[0] || '',
      listingUrl: item.viewItemURL?.[0] || '',
    }));
  } catch {
    return [];
  }
}

function filterOutliers(items: EbaySoldItem[]): EbaySoldItem[] {
  if (items.length < 4) return items;

  const prices = items.map((i) => i.price).sort((a, b) => a - b);
  const q1 = prices[Math.floor(prices.length * 0.25)];
  const q3 = prices[Math.floor(prices.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return items.filter((i) => i.price >= lowerBound && i.price <= upperBound);
}

export async function fetchSoldPrices(
  appId: string,
  cardName: string,
  grade: string,
  language: string = 'EN',
  setName?: string,
  cardNumber?: string,
): Promise<EbayPriceResult> {
  const cacheKey = `${cardName}:${setName || ''}:${cardNumber || ''}:${grade}:${language}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const query = buildSearchQuery(cardName, grade, language, setName, cardNumber);
  const url = buildFindingUrl(appId, query);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`eBay API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const rawItems = parseItems(json);
  const items = filterOutliers(rawItems);

  if (items.length === 0) {
    const result: EbayPriceResult = {
      cardName,
      grade,
      items: [],
      averagePrice: 0,
      medianPrice: 0,
      highPrice: 0,
      lowPrice: 0,
      salesCount: 0,
      lastSaleDate: '',
      lastSalePrice: 0,
    };
    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL });
    return result;
  }

  const prices = items.map((i) => i.price).sort((a, b) => a - b);
  const sum = prices.reduce((acc, p) => acc + p, 0);
  const avg = sum / prices.length;
  const median = prices.length % 2 === 0
    ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
    : prices[Math.floor(prices.length / 2)];

  // Sort by end time to find most recent
  const sortedByTime = [...items].sort(
    (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
  );

  const result: EbayPriceResult = {
    cardName,
    grade,
    items: sortedByTime.slice(0, 10), // Return top 10 most recent
    averagePrice: Math.round(avg * 100) / 100,
    medianPrice: Math.round(median * 100) / 100,
    highPrice: Math.max(...prices),
    lowPrice: Math.min(...prices),
    salesCount: items.length,
    lastSaleDate: sortedByTime[0]?.endTime || '',
    lastSalePrice: sortedByTime[0]?.price || 0,
  };

  cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL });
  return result;
}

export function clearCache(): void {
  cache.clear();
}
