import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearQuoteCacheForTest,
  getStockQuotes,
  parseYahooQuote,
  setCachedQuoteForTest,
  setQuoteFetcherForTest,
} from '../src/services/stockService.js';

afterEach(() => {
  clearQuoteCacheForTest();
  setQuoteFetcherForTest();
});

test('parseYahooQuote prefers regular market price and preserves currency', () => {
  const now = 1_700_000_000_000;
  const quote = parseYahooQuote(
    'AAPL',
    {
      symbol: 'AAPL',
      shortName: 'Apple',
      regularMarketPrice: 190.12,
      regularMarketTime: now / 1000,
      regularMarketChange: 1.25,
      regularMarketChangePercent: 0.66,
      currency: 'USD',
    },
    now
  );

  assert.ok(quote);
  assert.equal(quote.price, 190.12);
  assert.equal(quote.currency, 'USD');
  assert.equal(quote.asOf, now);
  assert.equal(quote.priceSource, 'regular');
});

test('parseYahooQuote falls back to post market price when regular is missing', () => {
  const now = 1_700_000_000_000;
  const quote = parseYahooQuote(
    'TSLA',
    {
      symbol: 'TSLA',
      postMarketPrice: 250.5,
      postMarketTime: now,
      currency: 'USD',
    },
    now
  );

  assert.ok(quote);
  assert.equal(quote.price, 250.5);
  assert.equal(quote.priceSource, 'post');
});

test('getStockQuotes marks stale when using cached data after fetch failure', async () => {
  const now = Date.now();
  setCachedQuoteForTest('AAPL', {
    symbol: 'AAPL',
    name: 'Apple',
    price: 180.25,
    change: 0,
    changePercent: 0,
    currency: 'USD',
    asOf: now - 300_000,
    priceSource: 'regular',
    fetchedAt: now - 300_000,
  }, now - 300_000);

  setQuoteFetcherForTest(async () => null);

  const response = await getStockQuotes(['AAPL']);
  assert.equal(response.quotes.length, 1);
  assert.equal(response.stale, true);
  assert.equal(response.quotes[0].price, 180.25);
});

test('getStockQuotes does not return too-old cached data after fetch failure', async () => {
  const now = Date.now();
  setCachedQuoteForTest('AAPL', {
    symbol: 'AAPL',
    name: 'Apple',
    price: 170.1,
    change: 0,
    changePercent: 0,
    currency: 'USD',
    asOf: now - 1_200_000,
    priceSource: 'regular',
    fetchedAt: now - 1_200_000,
  }, now - 1_200_000);

  setQuoteFetcherForTest(async () => null);

  const response = await getStockQuotes(['AAPL']);
  assert.equal(response.quotes.length, 0);
  assert.deepEqual(response.missing, ['AAPL']);
  assert.ok(response.error);
});
