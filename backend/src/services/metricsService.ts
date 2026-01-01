import si from 'systeminformation';
import type { SystemMetrics, CpuMetrics, MemoryMetrics, DiskMetrics, NetworkMetrics } from '../types/index.js';

// Store previous network stats for calculating speed
let previousNetworkStats: Map<string, { rx: number; tx: number; timestamp: number }> = new Map();

// History for sparklines (5 minutes at 2 second intervals = 150 data points)
const HISTORY_SIZE = 150;

export interface MetricsHistory {
  cpu: number[];
  memory: number[];
  networkRx: number[];
  networkTx: number[];
  timestamps: number[];
}

const history: MetricsHistory = {
  cpu: [],
  memory: [],
  networkRx: [],
  networkTx: [],
  timestamps: [],
};

function addToHistory(metrics: SystemMetrics) {
  // Add new values
  history.cpu.push(metrics.cpu.overall);
  history.memory.push(metrics.memory.percent);

  // Get primary network interface speeds
  const primaryNetwork = metrics.network.find((n) => n.rx_sec > 0 || n.tx_sec > 0) || metrics.network[0];
  history.networkRx.push(primaryNetwork?.rx_sec || 0);
  history.networkTx.push(primaryNetwork?.tx_sec || 0);
  history.timestamps.push(metrics.timestamp);

  // Trim to max size
  if (history.cpu.length > HISTORY_SIZE) {
    history.cpu.shift();
    history.memory.shift();
    history.networkRx.shift();
    history.networkTx.shift();
    history.timestamps.shift();
  }
}

export function getMetricsHistory(): MetricsHistory {
  return { ...history };
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  const [cpuData, cpuLoad, memory, fsSize, networkStats, time, cpuTemp] = await Promise.all([
    si.cpu(),
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.time(),
    si.cpuTemperature(),
  ]);

  // CPU metrics
  const cpu: CpuMetrics = {
    overall: cpuLoad.currentLoad,
    cores: cpuLoad.cpus.map((core) => core.load),
    model: cpuData.brand,
    speed: cpuData.speed,
    cores_count: cpuData.cores,
  };

  // Memory metrics
  const memoryMetrics: MemoryMetrics = {
    total: memory.total,
    used: memory.used,
    free: memory.free,
    percent: (memory.used / memory.total) * 100,
  };

  // Disk metrics (filter to physical disks)
  const disks: DiskMetrics[] = fsSize
    .filter((disk) => disk.type !== 'squashfs' && !disk.fs.startsWith('/dev/loop'))
    .map((disk) => ({
      filesystem: disk.fs,
      size: disk.size,
      used: disk.used,
      available: disk.available,
      percent: disk.use,
      mount: disk.mount,
    }));

  // Network metrics with speed calculation
  const now = Date.now();
  const network: NetworkMetrics[] = networkStats
    .filter((iface) => iface.iface !== 'lo' && iface.operstate === 'up')
    .map((iface) => {
      const prev = previousNetworkStats.get(iface.iface);
      let rx_sec = 0;
      let tx_sec = 0;

      if (prev) {
        const timeDiff = (now - prev.timestamp) / 1000; // seconds
        if (timeDiff > 0) {
          rx_sec = (iface.rx_bytes - prev.rx) / timeDiff;
          tx_sec = (iface.tx_bytes - prev.tx) / timeDiff;
        }
      }

      // Store current values for next calculation
      previousNetworkStats.set(iface.iface, {
        rx: iface.rx_bytes,
        tx: iface.tx_bytes,
        timestamp: now,
      });

      return {
        interface: iface.iface,
        rx_sec: Math.max(0, rx_sec),
        tx_sec: Math.max(0, tx_sec),
        rx_bytes: iface.rx_bytes,
        tx_bytes: iface.tx_bytes,
      };
    });

  const metrics: SystemMetrics = {
    cpu,
    memory: memoryMetrics,
    disks,
    network,
    uptime: time.uptime,
    timestamp: now,
    temperature: cpuTemp.main || undefined,
  };

  // Add to history for sparklines
  addToHistory(metrics);

  return metrics;
}
