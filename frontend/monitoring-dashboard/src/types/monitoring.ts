export interface MonitoringData {
  id: string;
  timestamp: string;
  status: 'online' | 'offline' | 'warning';
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  details?: string;
}

export interface MonitoringResponse {
  data: MonitoringData[];
  total: number;
  page: number;
  pageSize: number;
} 