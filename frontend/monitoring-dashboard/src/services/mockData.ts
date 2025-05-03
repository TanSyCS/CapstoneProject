import { MonitoringData, MonitoringResponse } from '../types/monitoring';

const generateMockData = (): MonitoringData[] => {
  const statuses: MonitoringData['status'][] = ['online', 'offline', 'warning'];
  const mockData: MonitoringData[] = [];

  for (let i = 1; i <= 20; i++) {
    mockData.push({
      id: `monitor-${i}`,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      metrics: {
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        disk: Math.floor(Math.random() * 100),
        network: Math.floor(Math.random() * 100),
      },
      details: Math.random() > 0.5 ? 'System running normally' : 'Performance issues detected',
    });
  }

  return mockData;
};

export const mockMonitoringData = generateMockData();

export const getMockMonitoringData = (page: number = 1, pageSize: number = 10): MonitoringResponse => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const data = mockMonitoringData.slice(start, end);

  return {
    data,
    total: mockMonitoringData.length,
    page,
    pageSize,
  };
}; 