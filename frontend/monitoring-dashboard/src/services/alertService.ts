export interface AlertMetadata {
  confidence: string[];
  created_at: string[];
  signature_severity: string[];
  updated_at: string[];
}

export interface AlertInfo {
  action: string;
  gid: number;
  signature_id: number;
  rev: number;
  signature: string;
  category: string;
  severity: number;
  metadata: AlertMetadata;
}

export interface FlowInfo {
  pkts_toserver: number;
  pkts_toclient: number;
  bytes_toserver: number;
  bytes_toclient: number;
  start: string;
  src_ip: string;
  dest_ip: string;
}

export interface AlertData {
  timestamp: string;
  flow_id: number;
  in_iface: string;
  event_type: string;
  src_ip: string;
  dest_ip: string;
  proto: string;
  icmp_type: number;
  icmp_code: number;
  pkt_src: string;
  alert: AlertInfo;
  direction: string;
  flow: FlowInfo;
  host: string;
}

export const fetchAlerts = async (): Promise<AlertData[]> => {
  const res = await fetch('http://127.0.0.1:5000/api/alerts/get_all_alert');
  if (!res.ok) throw new Error('Failed to fetch alerts');
  const data = await res.json();
  console.log('ALERT API RESPONSE:', data);
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) return [data];
  return [];
};

export const subscribeToAlerts = (onAlert: (data: AlertData) => void) => {
  const eventSource = new EventSource('http://127.0.0.1:5000/api/alerts/get_all_alert');
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('ALERT SSE DATA:', data);
      onAlert(data);
    } catch (e) {
      console.error('Error parsing SSE alert:', e, event.data);
    }
  };
  eventSource.onerror = (err) => {
    console.error('SSE error:', err);
    eventSource.close();
  };
  return () => eventSource.close();
};