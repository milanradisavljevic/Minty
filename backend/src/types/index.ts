// System metrics types
export interface CpuMetrics {
  overall: number;
  cores: number[];
  model: string;
  speed: number;
  cores_count: number;
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  percent: number;
}

export interface DiskMetrics {
  filesystem: string;
  size: number;
  used: number;
  available: number;
  percent: number;
  mount: string;
}

export interface NetworkMetrics {
  interface: string;
  rx_sec: number;
  tx_sec: number;
  rx_bytes: number;
  tx_bytes: number;
}

export interface GpuMetrics {
  model: string;
  temp: number;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
}

export interface SystemMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disks: DiskMetrics[];
  network: NetworkMetrics[];
  gpu?: GpuMetrics;
  uptime: number;
  timestamp: number;
  temperature?: number;
}
