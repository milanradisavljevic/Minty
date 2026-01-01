import Parser from 'rss-parser';
import { getConfig } from './configService.js';
import type { NewsFeedConfig } from '../../../shared/types/index.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'UltrawideDashboard/1.0',
  },
});

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  source: string;
}

export interface NewsFeed {
  id: string;
  name: string;
  icon: string;
  items: NewsItem[];
  lastUpdated: number;
  colSpan?: number;
}

// Cache per feed
interface FeedCache {
  [feedId: string]: {
    data: NewsFeed;
    timestamp: number;
  };
}

const cache: FeedCache = {};
const CACHE_TTL = 300000; // 5 minutes

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

function sanitizeFeedConfig(feed: NewsFeedConfig, fallbackOrder = 0): NewsFeedConfig {
  const colSpan = Math.min(4, Math.max(1, feed.colSpan ?? 1));
  return {
    ...feed,
    enabled: feed.enabled !== false,
    colSpan,
    order: typeof feed.order === 'number' ? feed.order : fallbackOrder,
    icon: feed.icon || (feed.name ? feed.name.charAt(0).toUpperCase() : '📰'),
  };
}

function getEnabledFeeds(): NewsFeedConfig[] {
  return getConfig()
    .news
    .feeds
    .map((feed, idx) => sanitizeFeedConfig(feed, idx))
    .filter((feed) => feed.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((feed, idx) => ({ ...feed, order: idx }));
}

async function fetchFeed(feedConfig: NewsFeedConfig): Promise<NewsFeed> {
  const now = Date.now();

  const icon = feedConfig.icon || (feedConfig.name ? feedConfig.name.charAt(0).toUpperCase() : '📰');

  // Check cache
  const cached = cache[feedConfig.id];
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    console.log(`Fetching feed: ${feedConfig.name}`);
    const feed = await parser.parseURL(feedConfig.url);

    const items: NewsItem[] = (feed.items || []).slice(0, 15).map((item) => {
      const content = item.contentSnippet || item.content || item.summary || '';
      return {
        title: item.title || 'Untitled',
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        content: truncate(stripHtml(content), 200),
        source: feedConfig.id,
      };
    });

    const result: NewsFeed = {
      id: feedConfig.id,
      name: feedConfig.name,
      icon,
      items,
      lastUpdated: now,
      colSpan: feedConfig.colSpan,
    };

    // Update cache
    cache[feedConfig.id] = {
      data: result,
      timestamp: now,
    };

    return result;
  } catch (error) {
    console.error(`Error fetching ${feedConfig.name}:`, error instanceof Error ? error.message : error);

    // Return cached data if available, even if stale
    if (cached) {
      return cached.data;
    }

    // Return empty feed on error
    return {
      id: feedConfig.id,
      name: feedConfig.name,
      icon,
      items: [],
      lastUpdated: now,
      colSpan: feedConfig.colSpan,
    };
  }
}

export async function getAllFeeds(): Promise<NewsFeed[]> {
  const feedConfigs = getEnabledFeeds();
  const results = await Promise.all(feedConfigs.map(fetchFeed));
  return results;
}

export async function getFeed(feedId: string): Promise<NewsFeed | null> {
  const feedConfig = getEnabledFeeds().find((f) => f.id === feedId);
  if (!feedConfig) return null;
  return fetchFeed(feedConfig);
}

export function getFeedList(): NewsFeedConfig[] {
  return getConfig()
    .news
    .feeds
    .map((feed, idx) => sanitizeFeedConfig(feed, idx))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((feed, idx) => ({ ...feed, order: idx }));
}

export async function testFeedUrl(url: string) {
  const safeUrl = url.trim();
  if (!safeUrl.startsWith('http')) {
    throw new Error('URL must start with http/https');
  }
  const feed = await parser.parseURL(safeUrl);
  return {
    title: feed.title || safeUrl,
    items: (feed.items || []).slice(0, 3).map((item) => ({
      title: item.title || 'Untitled',
      link: item.link || '',
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
    })),
  };
}
