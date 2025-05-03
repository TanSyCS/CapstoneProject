import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export interface TopologyResponse {
  'network-topology:network-topology': {
    topology: Array<{
      link: Array<{
        destination: {
          'dest-node': string;
          'dest-tp': string;
        };
        'link-id': string;
        source: {
          'source-node': string;
          'source-tp': string;
        };
      }>;
      node: Array<{
        'node-id': string;
        'opendaylight-topology-inventory:inventory-node-ref': string;
        'termination-point': Array<{
          'opendaylight-topology-inventory:inventory-node-connector-ref': string;
          'tp-id': string;
        }>;
      }>;
      'topology-id': string;
    }>;
  };
}

export interface PortStateResponse {
  'flow-node-inventory:state': {
    blocked: boolean;
    'link-down': boolean;
    live: boolean;
  };
}

export interface PortTrafficResponse {
  'opendaylight-port-statistics:flow-capable-node-connector-statistics': {
    bytes: {
      received: string;
      transmitted: string;
    };
    packets: {
      received: string;
      transmitted: string;
    };
    'receive-drops': string;
    'transmit-drops': string;
    'receive-errors': string;
    'transmit-errors': string;
  };
}

export interface SwitchRule {
  flow_id: string;
  priority: number;
  'output-node-connector'?: string;
}

export interface BlockIpRequest {
  switch_id: string;
  src_ip?: string;
  dst_ip?: string;
}

export interface AddForwardingRuleRequest {
  switch_id: string;
  dst_ip: string;
  fw_port: string;
}

export interface ArpFloodRequest {
  switch_id: string;
}

export interface DeleteRuleRequest {
  switch_id: string;
  flow_id: string;
}

// Types for mininet_info API
export interface MininetHost {
  ip: string;
  interfaces: {
    [key: string]: {
      'output-node-connector': number;
      s2?: string;
      s3?: string;
    }
  }
}

export interface MininetSwitch {
  interfaces: {
    [key: string]: {
      'output-node-connector': number;
      s1?: string;
      s2?: string;
      s3?: string;
      h1?: string;
      h2?: string;
      h3?: string;
      h4?: string;
    }
  }
}

export interface MininetInfo {
  hosts: {
    [key: string]: MininetHost;
  };
  switches: {
    [key: string]: MininetSwitch;
  };
  controllers: string[];
}

// Combined Network Node Type
export interface NetworkNode {
  id: string;
  type: 'switch' | 'host' | 'controller';
  label: string;
  x: number;
  y: number;
  color: string;
  ip?: string;
  interfaces?: {
    [key: string]: {
      'output-node-connector': number;
      connectedTo?: string;
      connectedType?: 'switch' | 'host';
    }
  }
}

export interface CombinedNetworkInfo {
  topology: TopologyResponse;
  mininet: MininetInfo;
}

export const getNetworkTopology = async (): Promise<TopologyResponse> => {
  const response = await axios.get(`${API_BASE_URL}/network/topology`);
  return response.data;
};

export const getPortState = async (switchId: string, portNumber: string): Promise<PortStateResponse> => {
  const response = await axios.get(`${API_BASE_URL}/network/topology/port_state`, {
    params: { switch_id: switchId, port_number: portNumber },
  });
  return response.data;
};

export const getPortTraffic = async (switchId: string, portNumber: string): Promise<PortTrafficResponse> => {
  const response = await axios.get(`${API_BASE_URL}/network/topology/traffic_stastistic`, {
    params: { switch_id: switchId, port_number: portNumber },
  });
  return response.data;
};

export const getSwitchRules = async (switchId: string): Promise<SwitchRule[]> => {
  const response = await axios.get(`${API_BASE_URL}/rules/list_node_rules`, {
    params: { switch_id: switchId },
  });
  return response.data;
};

export const blockIpTraffic = async (data: BlockIpRequest): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/rules/block`, data);
  return response.data;
};

export const addForwardingRule = async (data: AddForwardingRuleRequest): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/rules/add_forwarding_rule`, data);
  return response.data;
};

export const arpFlood = async (data: ArpFloodRequest): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/rules/arp_flood`, data);
  return response.data;
};

export const deleteRule = async (data: DeleteRuleRequest): Promise<any> => {
  const response = await axios.delete(`${API_BASE_URL}/rules/delete_rule`, {
    params: {
      switch_id: data.switch_id,
      flow_id: data.flow_id
    }
  });
  return response.data;
};

export const getMininetInfo = async (): Promise<MininetInfo> => {
  const response = await axios.get(`${API_BASE_URL}/netinfo/fetch_netinfor`);
  return response.data;
};

export const getCombinedNetworkInfo = async (): Promise<CombinedNetworkInfo> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/netinfo/fetch_netinfor`);
    return response.data;
  } catch (error) {
    console.error('Error fetching combined network info:', error);
    throw error;
  }
}; 