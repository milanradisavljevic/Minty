import { useEffect, useRef } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import { useTranslation } from '../i18n';

interface WidgetContextMenuProps {
  widgetId: string | null;
  x: number;
  y: number;
  onClose: () => void;
}

export function WidgetContextMenu({ widgetId, x, y, onClose }: WidgetContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const layouts = useDashboardStore((s) => s.layouts);
  const toggleWidgetPin = useDashboardStore((s) => s.toggleWidgetPin);

  const layout = layouts.find((l) => l.i === widgetId);
  const isPinned = layout?.static ?? false;

  // Close on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!widgetId) return null;

  const handlePin = () => {
    toggleWidgetPin(widgetId);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      <button
        onClick={handlePin}
        className="w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-widget-border)] flex items-center gap-2 transition-colors"
      >
        <span className="text-base">{isPinned ? '🔓' : '📌'}</span>
        <span>{isPinned ? t('widget_unpin') : t('widget_pin')}</span>
      </button>
    </div>
  );
}
