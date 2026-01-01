import type { ReactNode } from 'react';
import { useTranslation, type TranslationKey } from '../../i18n';

interface WidgetWrapperProps {
  titleKey?: TranslationKey;
  title?: string;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function WidgetWrapper({ titleKey, title, children, className = '', noPadding = false }: WidgetWrapperProps) {
  const { t } = useTranslation();
  const resolvedTitle = titleKey ? t(titleKey) : title ?? '';

  return (
    <div
      className={`h-full flex flex-col rounded-lg border border-[var(--color-widget-border)] bg-[var(--color-widget-bg)] overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-widget-border)]">
        <h2 className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
          {resolvedTitle}
        </h2>
      </div>
      <div className={`flex-1 overflow-auto ${noPadding ? '' : 'p-4'}`}>{children}</div>
    </div>
  );
}
