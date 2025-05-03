import React, { useEffect, useState } from 'react';
import { getPortState, getPortTraffic, PortStateResponse, PortTrafficResponse } from '../services/networkService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, TooltipProps } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

interface PortDetailPanelProps {
  switchId: string;
  portNumber: string;
  onClose: () => void;
}

// Helper to convert s3-eth1 -> openflow:3:1
const toOpenflowSwitchId = (id: string) => {
  if (id.startsWith('openflow:')) return id;
  const match = id.match(/^s(\d+)/);
  return match ? `openflow:${match[1]}` : id;
};
const toOpenflowPortNumber = (switchId: string, port: string) => {
  if (port.startsWith('openflow:')) return port;
  // port có thể là eth1 hoặc s3-eth1
  const portNumMatch = port.match(/eth(\d+)/);
  const switchNumMatch = switchId.match(/^s(\d+)/) || switchId.match(/openflow:(\d+)/);
  if (portNumMatch && switchNumMatch) {
    return `openflow:${switchNumMatch[1]}:${portNumMatch[1]}`;
  }
  return port;
};

const PortDetailPanel: React.FC<PortDetailPanelProps> = ({ switchId, portNumber, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setPortState] = useState<PortStateResponse | null>(null);
  const [portTraffic, setPortTraffic] = useState<PortTrafficResponse | null>(null);

  const apiSwitchId = toOpenflowSwitchId(switchId);
  const apiPortNumber = toOpenflowPortNumber(switchId, portNumber);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stateRes, trafficRes] = await Promise.all([
        getPortState(apiSwitchId, apiPortNumber),
        getPortTraffic(apiSwitchId, apiPortNumber),
      ]);
      setPortState(stateRes);
      setPortTraffic(trafficRes);
    } catch (err) {
      setError('Cannot fetch port data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [switchId, portNumber]);

  const traffic = portTraffic?.['opendaylight-port-statistics:flow-capable-node-connector-statistics'];

  // Card data
  const totalBytes = traffic ? Number(traffic.bytes.received) + Number(traffic.bytes.transmitted) : 0;
  const totalPackets = traffic ? Number(traffic.packets.received) + Number(traffic.packets.transmitted) : 0;
  const totalErrors = traffic ? Number(traffic['receive-errors']) + Number(traffic['transmit-errors']) : 0;
  const totalDrops = traffic ? Number(traffic['receive-drops']) + Number(traffic['transmit-drops']) : 0;

  // Chart data
  const bytesData = traffic
    ? [
        { name: 'Received', value: Number(traffic.bytes.received) },
        { name: 'Transmitted', value: Number(traffic.bytes.transmitted) },
      ]
    : [];
  const packetsData = traffic
    ? [
        { name: 'Received', value: Number(traffic.packets.received) },
        { name: 'Transmitted', value: Number(traffic.packets.transmitted) },
      ]
    : [];

  // Table data
  const detailRows = [
    { label: 'Bytes Received', value: traffic?.bytes.received, unit: 'bytes' },
    { label: 'Bytes Transmitted', value: traffic?.bytes.transmitted, unit: 'bytes' },
    { label: 'Packets Received', value: traffic?.packets.received, unit: 'packets' },
    { label: 'Packets Transmitted', value: traffic?.packets.transmitted, unit: 'packets' },
    { label: 'Receive Errors', value: traffic?.['receive-errors'], unit: 'errors' },
    { label: 'Transmit Errors', value: traffic?.['transmit-errors'], unit: 'errors' },
    { label: 'Receive Drops', value: traffic?.['receive-drops'], unit: 'drops' },
    { label: 'Transmit Drops', value: traffic?.['transmit-drops'], unit: 'drops' },
  ];

  // Format large numbers with commas
  const formatNumber = (num: number | string | undefined): string => {
    if (num === undefined) return '-';
    const numberValue = typeof num === 'string' ? Number(num) : num;
    return isNaN(numberValue) ? '-' : numberValue.toLocaleString();
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length && payload[0].value !== undefined) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-md">
          <p className="font-medium text-gray-700">{`${label}`}</p>
          <p className="text-blue-600 font-semibold">{`${formatNumber(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <aside className="fixed top-0 right-0 h-full w-[480px] bg-gradient-to-br from-blue-50 via-slate-50 to-white shadow-2xl border-l-4 border-blue-300 z-50 flex flex-col rounded-l-2xl transition-transform duration-300 overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100">
        <div>
          <div className="text-blue-700 font-bold text-lg">Port Detail</div>
          <div className="text-xs text-gray-500 mt-1">Switch: <span className="text-blue-600 font-semibold">{switchId}</span> | Port: <span className="text-blue-600 font-semibold">{portNumber}</span></div>
        </div>
        <button
          className="text-gray-500 hover:text-blue-600 p-1 rounded focus:outline-none"
          aria-label="Close panel"
          onClick={onClose}
        >
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-12">{error}</div>
        ) : (
          <>
            {/* Card tổng quan */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
                <div className="text-xs text-blue-600 font-medium">Total Bytes</div>
                <div className="text-xl font-bold text-blue-800">{formatNumber(totalBytes)}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-100 shadow-sm">
                <div className="text-xs text-green-600 font-medium">Total Packets</div>
                <div className="text-xl font-bold text-green-800">{formatNumber(totalPackets)}</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 shadow-sm">
                <div className="text-xs text-yellow-600 font-medium">Total Errors</div>
                <div className="text-xl font-bold text-yellow-800">{formatNumber(totalErrors)}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 shadow-sm">
                <div className="text-xs text-red-600 font-medium">Total Drops</div>
                <div className="text-xl font-bold text-red-800">{formatNumber(totalDrops)}</div>
              </div>
            </div>
            {/* Chart */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="font-semibold text-gray-700 mb-2 text-base">Bytes Transferred</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={bytesData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="Bytes" radius={[4, 4, 0, 0]}>
                      {bytesData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? COLORS[0] : COLORS[1]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="font-semibold text-gray-700 mb-2 text-base">Packets Transferred</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={packetsData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="Packets" radius={[4, 4, 0, 0]}>
                      {packetsData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? COLORS[2] : COLORS[3]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Table chi tiết */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
              <div className="font-semibold text-gray-700 mb-2 text-base">Detail Table</div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                      <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Metric</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-blue-700 uppercase tracking-wider">Value</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-blue-700 uppercase tracking-wider">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detailRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{row.label}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center font-mono text-gray-700">{formatNumber(row.value)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-500">{row.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="p-4 border-t border-blue-100 flex justify-end bg-white/70 rounded-b-2xl">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
          onClick={fetchData}
        >
          Refresh
        </button>
        <button
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </aside>
  );
};

export default PortDetailPanel; 