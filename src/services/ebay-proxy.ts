import { apiFetch } from './api-client';
import type { CardPrice, PriceHistory } from '../types/card';
import type { GradeType } from '../constants/grades';

interface EbayPriceResponse {
  cardName: string;
  grade: string;
  currentPrice: number;
  averagePrice: number;
  highPrice: number;
  lowPrice: number;
  salesCount: number;
  lastSaleDate: string;
  lastSalePrice: number;
  percentChange: number;
  previousPrice: number;
  recentSales: Array<{
    title: string;
    price: number;
    endTime: string;
    listingUrl: string;
  }>;
}

interface EbayHistoryResponse {
  cardName: string;
  grade: string;
  history: Array<{ date: string; price: number }>;
}

interface FetchOptions {
  cardName: string;
  grade: GradeType;
  language?: 'EN' | 'JP';
  setName?: string;
  cardNumber?: string;
}

export async function fetchCardPrice(opts: FetchOptions): Promise<CardPrice> {
  const params = new URLSearchParams({
    card: opts.cardName,
    grade: opts.grade,
    lang: opts.language || 'EN',
  });
  if (opts.setName) params.set('set', opts.setName);
  if (opts.cardNumber) params.set('number', opts.cardNumber);

  const data = await apiFetch<EbayPriceResponse>(`/api/prices?${params}`);

  return {
    cardName: data.cardName,
    grade: opts.grade,
    currentPrice: data.currentPrice,
    previousPrice: data.previousPrice,
    percentChange: data.percentChange,
    lastSaleDate: data.lastSaleDate
      ? new Date(data.lastSaleDate).toISOString().split('T')[0]
      : '',
    lastSalePrice: data.lastSalePrice,
    averagePrice: data.averagePrice,
    highPrice: data.highPrice,
    lowPrice: data.lowPrice,
    salesCount: data.salesCount,
  };
}

export async function fetchPriceHistory(opts: FetchOptions): Promise<PriceHistory> {
  const params = new URLSearchParams({
    card: opts.cardName,
    grade: opts.grade,
    lang: opts.language || 'EN',
  });
  if (opts.setName) params.set('set', opts.setName);
  if (opts.cardNumber) params.set('number', opts.cardNumber);

  const data = await apiFetch<EbayHistoryResponse>(`/api/prices/history?${params}`);
  return data.history;
}
