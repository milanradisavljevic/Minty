import { useCallback, useEffect, useMemo, useState } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import { getLocale, useTranslation, type TranslationKey } from '../../i18n';

type Category = 'tech' | 'gaming' | 'entertainment' | 'finance' | 'personal';

interface UpcomingItem {
  id: number;
  title: string;
  date: string;
  category: Category;
  url?: string;
  notes?: string;
}

const CATEGORY_CONFIG: Record<Category, { icon: string; color: string; labelKey: TranslationKey }> = {
  tech: { icon: '💻', color: '#3b82f6', labelKey: 'upcoming_category_tech' },
  gaming: { icon: '🎮', color: '#8b5cf6', labelKey: 'upcoming_category_gaming' },
  entertainment: { icon: '🎬', color: '#ec4899', labelKey: 'upcoming_category_entertainment' },
  finance: { icon: '📈', color: '#22c55e', labelKey: 'upcoming_category_finance' },
  personal: { icon: '📦', color: '#f59e0b', labelKey: 'upcoming_category_personal' },
};

export function UpcomingWidget() {
  const { language, t } = useTranslation();
  const locale = getLocale(language);
  const relativeTimeFormatter = useMemo(
    () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }),
    [locale]
  );

  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [editingItem, setEditingItem] = useState<UpcomingItem | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formCategory, setFormCategory] = useState<Category>('tech');
  const [formUrl, setFormUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const formatCountdown = useCallback(
    (dateStr: string): { text: string; isPast: boolean; urgency: 'past' | 'soon' | 'normal' } => {
      const target = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isPast = diffDays < 0;
      const absoluteDays = Math.abs(diffDays);
      const urgency: 'past' | 'soon' | 'normal' =
        isPast || absoluteDays <= 1 ? 'soon' : absoluteDays <= 7 ? 'soon' : 'normal';

      const value = absoluteDays >= 14 ? Math.round(diffDays / 7) : diffDays;
      const unit: Intl.RelativeTimeFormatUnit = absoluteDays >= 14 ? 'week' : 'day';

      return {
        text: relativeTimeFormatter.format(value, unit),
        isPast,
        urgency: isPast ? 'past' : urgency,
      };
    },
    [relativeTimeFormatter]
  );

  // Fetch items
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/upcoming');
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch upcoming items:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDate('');
    setFormCategory('tech');
    setFormUrl('');
    setFormNotes('');
    setEditingItem(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return;

    const payload = {
      title: formTitle.trim(),
      date: formDate,
      category: formCategory,
      url: formUrl.trim() || undefined,
      notes: formNotes.trim() || undefined,
    };

    try {
      if (editingItem) {
        // Update existing
        const response = await fetch(`/api/upcoming/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = await response.json();
          setItems((prev) => prev.map((i) => (i.id === editingItem.id ? data.item : i)));
        }
      } else {
        // Create new
        const response = await fetch('/api/upcoming', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = await response.json();
          setItems((prev) => [...prev, data.item]);
        }
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/upcoming/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleEdit = (item: UpcomingItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDate(item.date);
    setFormCategory(item.category);
    setFormUrl(item.url || '');
    setFormNotes(item.notes || '');
    setShowForm(true);
  };

  // Sort and filter items
  const sortedItems = [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcomingItems = sortedItems.filter((item) => {
    const countdown = formatCountdown(item.date);
    return !countdown.isPast;
  });
  const pastItems = sortedItems.filter((item) => {
    const countdown = formatCountdown(item.date);
    return countdown.isPast;
  });

  const displayItems = showPast ? pastItems : upcomingItems;

  if (loading) {
    return (
      <WidgetWrapper titleKey="widget_upcoming" noPadding>
        <div className="h-full flex items-center justify-center text-[var(--color-text-secondary)]">
          <span className="text-sm">{t('upcoming_loading')}</span>
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper titleKey="widget_upcoming" noPadding>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-[var(--color-widget-border)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPast(false)}
              className={`text-xs px-2 py-1 rounded ${!showPast ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'}`}
            >
              {t('upcoming_tab_upcoming')} ({upcomingItems.length})
            </button>
            <button
              onClick={() => setShowPast(true)}
              className={`text-xs px-2 py-1 rounded ${showPast ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'}`}
            >
              {t('upcoming_tab_past')} ({pastItems.length})
            </button>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="text-lg text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            +
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="px-3 py-2 border-b border-[var(--color-widget-border)] space-y-2 bg-[var(--color-dashboard-bg)]/50">
            <input
              type="text"
              placeholder={t('upcoming_title_placeholder')}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-[var(--color-widget-border)] rounded border-none outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              autoFocus
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="flex-1 px-2 py-1 text-xs bg-[var(--color-widget-border)] rounded border-none outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as Category)}
                className="px-2 py-1 text-xs bg-[var(--color-widget-border)] rounded border-none outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              >
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {t(config.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="url"
              placeholder={t('upcoming_url_placeholder')}
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-[var(--color-widget-border)] rounded border-none outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-2 py-1 text-xs bg-[var(--color-widget-border)] rounded hover:bg-[var(--color-widget-border)]/80"
              >
                {t('upcoming_cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 px-2 py-1 text-xs bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)]"
              >
                {editingItem ? t('upcoming_save') : t('upcoming_add')}
              </button>
            </div>
          </form>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {displayItems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[var(--color-text-secondary)] text-xs">
              {showPast ? t('upcoming_empty_past') : t('upcoming_empty_upcoming')}
            </div>
          ) : (
            <div className="space-y-2">
              {displayItems.map((item) => {
                const countdown = formatCountdown(item.date);
                const config = CATEGORY_CONFIG[item.category];

                return (
                  <div
                    key={item.id}
                    className={`group p-2 rounded-lg bg-[var(--color-widget-border)]/50 hover:bg-[var(--color-widget-border)] transition-colors ${
                      countdown.urgency === 'soon' ? 'ring-1 ring-[var(--color-accent)]/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Category icon */}
                      <span
                        className="text-sm flex-shrink-0 w-6 h-6 flex items-center justify-center rounded"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        {config.icon}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] truncate"
                            >
                              {item.title}
                            </a>
                          ) : (
                            <span className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                              {item.title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[10px] ${
                              countdown.urgency === 'soon'
                                ? 'text-[var(--color-accent)] font-medium'
                                : countdown.urgency === 'past'
                                ? 'text-[var(--color-text-secondary)]/60'
                                : 'text-[var(--color-text-secondary)]'
                            }`}
                          >
                            {countdown.text}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-secondary)]/50">
                            {new Date(item.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-[10px] p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-[10px] p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
}
