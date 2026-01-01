import { useDashboardStore } from '../../stores/dashboardStore';
import { WidgetWrapper } from './WidgetWrapper';
import { Sparkline } from '../Sparkline';
import { formatBytes, formatSpeed, formatPercent, formatUptime } from '../../utils/format';
import { useTranslation } from '../../i18n';

// Metric row with sparkline
function MetricWithSparkline({
  label,
  value,
  subValue,
  percent,
  history,
  color,
  max = 100,
}: {
  label: string;
  value: string;
  subValue?: string;
  percent: number;
  history?: number[];
  color?: string;
  max?: number;
}) {
  const barColor =
    color || (percent > 90 ? 'var(--color-error)' : percent > 70 ? 'var(--color-warning)' : 'var(--color-accent)');

  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
        <div className="text-right">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{value}</span>
          {subValue && (
            <span className="text-xs text-[var(--color-text-secondary)] ml-1">{subValue}</span>
          )}
        </div>
      </div>
      {/* Sparkline with progress overlay */}
      <div className="relative">
        <Sparkline
          data={history || [percent]}
          width={280}
          height={24}
          color={barColor}
          fillColor={barColor}
          max={max}
          min={0}
        />
      </div>
    </div>
  );
}

// CPU cores visualization (compact)
function CpuCores({ cores }: { cores: number[] }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-8 gap-0.5 mb-3">
      {cores.slice(0, 16).map((usage, index) => (
        <div
          key={index}
          className="h-3 rounded-sm transition-all duration-300"
          style={{
            backgroundColor:
              usage > 90
                ? 'var(--color-error)'
                : usage > 70
                ? 'var(--color-warning)'
                : 'var(--color-accent)',
            opacity: 0.3 + (usage / 100) * 0.7,
          }}
          title={`${t('system_core')} ${index + 1}: ${usage.toFixed(0)}%`}
        />
      ))}
    </div>
  );
}

// Network with sparklines
function NetworkWithSparkline({
  rxSpeed,
  txSpeed,
  rxHistory,
  txHistory,
}: {
  rxSpeed: number;
  txSpeed: number;
  rxHistory?: number[];
  txHistory?: number[];
}) {
  const { t } = useTranslation();

  // Calculate max for network sparklines
  const allValues = [...(rxHistory || []), ...(txHistory || [])];
  const maxSpeed = Math.max(...allValues, rxSpeed, txSpeed, 1024); // At least 1KB/s

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3 text-[var(--color-success)]" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs text-[var(--color-text-secondary)]">{t('system_download')}</span>
        </div>
        <span className="text-xs font-medium text-[var(--color-text-primary)]">{formatSpeed(rxSpeed)}</span>
      </div>
      <Sparkline
        data={rxHistory || [rxSpeed]}
        width={280}
        height={20}
        color="var(--color-success)"
        fillColor="var(--color-success)"
        max={maxSpeed}
        min={0}
      />

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3 text-[var(--color-accent)]" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs text-[var(--color-text-secondary)]">{t('system_upload')}</span>
        </div>
        <span className="text-xs font-medium text-[var(--color-text-primary)]">{formatSpeed(txSpeed)}</span>
      </div>
      <Sparkline
        data={txHistory || [txSpeed]}
        width={280}
        height={20}
        color="var(--color-accent)"
        fillColor="var(--color-accent)"
        max={maxSpeed}
        min={0}
      />
    </div>
  );
}

export function SystemWidget() {
  const metrics = useDashboardStore((state) => state.metrics);
  const isConnected = useDashboardStore((state) => state.isConnected);
  const { t } = useTranslation();

  if (!metrics) {
    return (
      <WidgetWrapper titleKey="widget_system">
        <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)]">
          {isConnected ? (
            <>
              <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full mb-4" />
              <p className="text-sm">{t('system_loading')}</p>
            </>
          ) : (
            <>
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 110-1.414"
                />
              </svg>
              <p className="text-sm">{t('system_connecting')}</p>
            </>
          )}
        </div>
      </WidgetWrapper>
    );
  }

  const { cpu, memory, disks, network, uptime, history } = metrics;
  const primaryDisk = disks[0];
  const primaryNetwork = network.find((n) => n.rx_sec > 0 || n.tx_sec > 0) || network[0];

  return (
    <WidgetWrapper titleKey="widget_system">
      <div className="space-y-3">
        {/* CPU */}
        <div>
          <MetricWithSparkline
            label={t('system_cpu')}
            value={formatPercent(cpu.overall)}
            subValue={cpu.model.split(' ').slice(0, 3).join(' ')}
            percent={cpu.overall}
            history={history?.cpu}
          />
          <CpuCores cores={cpu.cores} />
        </div>

        {/* Memory */}
        <MetricWithSparkline
          label={t('system_memory')}
          value={formatBytes(memory.used)}
          subValue={`/ ${formatBytes(memory.total)}`}
          percent={memory.percent}
          history={history?.memory}
        />

        {/* Disk */}
        {primaryDisk && (
          <div className="mb-3">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm text-[var(--color-text-secondary)]">
                {t('system_disk')} ({primaryDisk.mount})
              </span>
              <div className="text-right">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {formatBytes(primaryDisk.used)}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)] ml-1">
                  / {formatBytes(primaryDisk.size)}
                </span>
              </div>
            </div>
            <div className="h-2 bg-[var(--color-widget-border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${primaryDisk.percent}%`,
                  backgroundColor:
                    primaryDisk.percent > 90
                      ? 'var(--color-error)'
                      : primaryDisk.percent > 70
                      ? 'var(--color-warning)'
                      : 'var(--color-accent)',
                }}
              />
            </div>
          </div>
        )}

        {/* Network */}
        {primaryNetwork && (
          <div>
            <div className="text-sm text-[var(--color-text-secondary)] mb-2">
              {t('system_network')} ({primaryNetwork.interface})
            </div>
            <NetworkWithSparkline
              rxSpeed={primaryNetwork.rx_sec}
              txSpeed={primaryNetwork.tx_sec}
              rxHistory={history?.networkRx}
              txHistory={history?.networkTx}
            />
          </div>
        )}

        {/* Uptime */}
        <div className="pt-2 border-t border-[var(--color-widget-border)]">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">{t('system_uptime')}</span>
            <span className="text-[var(--color-text-primary)]">{formatUptime(uptime)}</span>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}
