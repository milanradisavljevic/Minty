import { useEffect, useMemo, useRef, useState } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import type { NewsFeed, NewsItem } from '../../types';
import { getLocale, useTranslation } from '../../i18n';

// Single news column component
function NewsColumn({
  feed,
  formatDate,
  emptyLabel,
  columns,
}: {
  feed: NewsFeed;
  formatDate: (date: string) => string;
  emptyLabel: string;
  columns: number;
}) {
  const clamped = Math.min(4, Math.max(1, feed.colSpan ?? 1));
  const span = Math.min(columns, Math.max(1, Math.round((columns / 4) * clamped)));
  const icon = feed.icon || (feed.name ? feed.name.charAt(0).toUpperCase() : '📰');
  return (
    <div className="flex flex-col h-full min-w-0" style={{ gridColumn: `span ${span}` }}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-widget-border)] bg-[var(--color-dashboard-bg)]">
        <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold bg-[var(--color-accent)] text-white">
          {icon}
        </div>
        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {feed.name}
        </span>
      </div>

      {/* Scrollable articles */}
      <div className="flex-1 overflow-y-auto">
        {feed.items.length === 0 ? (
          <div className="p-4 text-center text-[var(--color-text-secondary)] text-sm">
            {emptyLabel}
          </div>
        ) : (
          feed.items.map((item, index) => (
            <NewsArticle key={`${item.link}-${index}`} item={item} formatDate={formatDate} />
          ))
        )}
      </div>
    </div>
  );
}

// Single article component
function NewsArticle({
  item,
  formatDate,
}: {
  item: NewsItem;
  formatDate: (date: string) => string;
}) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 border-b border-[var(--color-widget-border)] hover:bg-[var(--color-widget-border)]/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-2 leading-tight">
          {item.title}
        </h3>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-2">
        {item.content}
      </p>
      <span className="text-[10px] text-[var(--color-text-secondary)] opacity-70">
        {formatDate(item.pubDate)}
      </span>
    </a>
  );
}

export function NewsWidget() {
  const { language, t } = useTranslation();
  const locale = getLocale(language);
  const relativeTimeFormatter = useMemo(
    () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }),
    [locale]
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [feeds, setFeeds] = useState<NewsFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    let isMounted = true;

    async function fetchNews() {
      try {
        const response = await fetch('/api/news');
        if (!response.ok) throw new Error('Failed to fetch news');
        const data = await response.json();
        if (isMounted) {
          setFeeds(data.feeds);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchNews();

    // Refresh every 5 minutes
    const interval = setInterval(fetchNews, 300000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const node = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (width < 500) setColumns(1);
      else if (width < 800) setColumns(2);
      else if (width < 1100) setColumns(3);
      else setColumns(4);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMins / 60);

    if (Math.abs(diffMins) < 60) {
      return relativeTimeFormatter.format(diffMins, 'minute');
    }
    if (Math.abs(diffHours) < 24) {
      return relativeTimeFormatter.format(diffHours, 'hour');
    }
    return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return (
      <WidgetWrapper titleKey="widget_news">
        <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
          <span className="ml-2 text-sm">{t('news_loading')}</span>
        </div>
      </WidgetWrapper>
    );
  }

  if (error) {
    return (
      <WidgetWrapper titleKey="widget_news">
        <div className="flex items-center justify-center h-full text-[var(--color-error)] text-sm gap-2 px-4 text-center">
          <span>⚠️</span>
          <span>
            {t('news_error')}
            {error ? ` (${error})` : ''}
          </span>
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper titleKey="widget_news" noPadding>
      <div
        ref={containerRef}
        className="h-full grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: '12px' }}
      >
        {feeds.map((feed) => (
          <NewsColumn
            key={feed.id}
            feed={feed}
            formatDate={formatDate}
            emptyLabel={t('news_empty')}
            columns={columns}
          />
        ))}
      </div>
    </WidgetWrapper>
  );
}
