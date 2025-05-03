import { MonitoringResponse } from '../types/monitoring';

const API_BASE_URL = 'http://localhost:8080/api'; // Update this with your Java backend URL

export const fetchMonitoringData = async (page: number = 1, pageSize: number = 10): Promise<MonitoringResponse> => {
  const response = await fetch(`${API_BASE_URL}/monitoring?page=${page}&size=${pageSize}`);
  if (!response.ok) {
    throw new Error('Failed to fetch monitoring data');
  }
  return response.json();
};

export const fetchMonitoringDataById = async (id: string): Promise<MonitoringResponse> => {
  const response = await fetch(`${API_BASE_URL}/monitoring/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch monitoring data');
  }
  return response.json();
}; 