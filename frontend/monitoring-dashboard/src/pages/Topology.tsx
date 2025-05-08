import React, { useMemo, useState, useRef, useEffect } from 'react';
import { getNetworkTopology, TopologyResponse } from '../services/networkService';
import PortDetailPanel from '../components/PortDetailPanel';
import { useNavigate } from 'react-router-dom';

const NODE_WIDTH = 80;
const NODE_HEIGHT = 80;
const SVG_WIDTH = window.innerWidth;
const SVG_HEIGHT = window.innerHeight - 80; // trừ header
const NODE_Y = 200;
const COLORS = ['#2563eb', '#059669', '#f59e42'];
const SWITCH_IMG = '/network-switch.svg';
const ARROW_IMG = '/right-arrow.svg';

const getSwitchLabel = (nodeId: string) => {
  const match = nodeId.match(/openflow:(\d+)/);
  return match ? `Switch ${match[1]}` : nodeId;
};

const parseSwitchPort = (tp: string) => {
  const match = tp.match(/openflow:(\d+):(\d+)/);
  return match ? { sw: match[1], port: match[2] } : { sw: '?', port: '?' };
};

const parseTopology = (data: TopologyResponse) => {
  const topo = data['network-topology:network-topology'].topology[0];
  const nodes = topo.node.map((n, idx) => ({
    id: n['node-id'],
    label: getSwitchLabel(n['node-id']),
    x: 150 + idx * 400,
    y: NODE_Y,
    color: COLORS[idx % COLORS.length],
  }));
  // Tạo map cặp switch (có hướng)
  const linkMap: Record<string, { src: string; dst: string; srcTp: string; dstTp: string }> = {};
  topo.link.forEach((l) => {
    const src = l.source['source-node'];
    const dst = l.destination['dest-node'];
    const srcTp = l.source['source-tp'];
    const dstTp = l.destination['dest-tp'];
    const key = `${src}__${srcTp}__${dst}__${dstTp}`;
    linkMap[key] = { src, dst, srcTp, dstTp };
  });
  const links = Object.values(linkMap);

  // Sửa: Hiển thị tất cả termination-point (tất cả port) của switch
  const portDetailMap: Record<string, { port: string; fromSwitch?: string; fromPort?: string; allow?: boolean; deny?: boolean; connected?: boolean }[]> = {};
  nodes.forEach((n) => {
    // Lấy toàn bộ termination-point (tức là tất cả port)
    const allPorts = topo.node.find((node) => node['node-id'] === n.id)?.['termination-point'] || [];
    portDetailMap[n.id] = allPorts.map((tp: any) => {
      // Tìm link nào có đích là port này
      const link = topo.link.find((l) => l.destination['dest-node'] === n.id && l.destination['dest-tp'] === tp['tp-id']);
      let fromSwitch = '', fromPort = '', connected = false;
      if (link) {
        const src = parseSwitchPort(link.source['source-tp']);
        fromSwitch = src.sw;
        fromPort = src.port;
        connected = true;
      }
        return {
        port: tp['tp-id'].split(':').pop() ?? tp['tp-id'],
        fromSwitch,
        fromPort,
        allow: connected ? true : undefined,
        deny: false,
        connected,
        };
      });
  });

  return { nodes, links, portDetailMap };
};

interface NodeType {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
}

// SidebarSwitchInfo component
const SidebarSwitchInfo: React.FC<{
  nodes: NodeType[];
  portDetailMap: Record<string, { port: string; fromSwitch?: string; fromPort?: string; allow?: boolean; deny?: boolean; connected?: boolean }[]>;
  selectedSwitch: string | null;
  onSelect: (id: string) => void;
  open: boolean;
  onClose: () => void;
}> = ({ nodes, portDetailMap, selectedSwitch, onSelect, open, onClose }) => (
  <aside
    className={`fixed top-0 right-0 h-full w-80 bg-white shadow-lg border-l border-blue-200 z-40 transform transition-transform duration-300
      ${open ? 'translate-x-0' : 'translate-x-full'}`}
    style={{ minWidth: 320 }}
  >
    <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100">
      <span className="font-bold text-lg text-blue-700">Switch Info</span>
      <button
        className="text-gray-500 hover:text-blue-600 p-1 rounded focus:outline-none"
        aria-label="Close sidebar"
        onClick={onClose}
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div className="overflow-y-auto h-[calc(100%-56px)] p-4 space-y-4">
      {nodes.map((n) => {
        const connectedPorts = (portDetailMap[n.id] || []).filter((p) => p.connected);
        return (
        <div
          key={n.id}
          className={`rounded-lg border p-3 shadow-sm cursor-pointer transition-all
            ${selectedSwitch === n.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-blue-50'}`}
          onClick={() => onSelect(n.id)}
          tabIndex={0}
          aria-label={`Switch ${n.label}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <img src={SWITCH_IMG} alt="Switch" className="w-7 h-7" />
            <span className="font-semibold text-blue-700">{n.label}</span>
          </div>
          <div className="text-xs text-gray-500 mb-1">ID: {n.id}</div>
            <div className="text-xs text-gray-500 mb-1">Ports: {connectedPorts.length}</div>
          <div className="text-xs text-gray-700 font-medium mb-1">Port List:</div>
          <ul className="text-xs text-gray-600 ml-2 list-disc">
              {connectedPorts.length > 0 ? connectedPorts.map((p, idx) => (
              <li key={idx}>
                Port <span className="font-semibold text-blue-700">{p.port}</span> ← Switch {p.fromSwitch} port {p.fromPort}
              </li>
              )) : <li className="text-gray-400">No ports connected</li>}
          </ul>
        </div>
        );
      })}
    </div>
  </aside>
);

const DetailSwitch: React.FC = () => {
  const [topologyData, setTopologyData] = useState<TopologyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { links, portDetailMap } = useMemo(() => topologyData ? parseTopology(topologyData) : { links: [], portDetailMap: {} }, [topologyData]);
  const [nodes, setNodes] = useState<NodeType[]>(() => topologyData ? parseTopology(topologyData).nodes : []);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [selectedSwitch, setSelectedSwitch] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedPort, setSelectedPort] = useState<{switchId: string, portNumber: string} | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopology = async () => {
      try {
        setLoading(true);
        const data = await getNetworkTopology();
        setTopologyData(data);
        setNodes(parseTopology(data).nodes);
        setError(null);
      } catch (err) {
        setError('Failed to fetch network topology');
        console.error('Error fetching topology:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopology();
  }, []);

  // Tạo map nodeId -> node để lấy vị trí
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === id);
    if (!node || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setDragging({ id, offsetX: mouseX - node.x, offsetY: mouseY - node.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === dragging.id
          ? {
              ...n,
              x: Math.max(0, Math.min(mouseX - dragging.offsetX, SVG_WIDTH - NODE_WIDTH)),
              y: Math.max(0, Math.min(mouseY - dragging.offsetY, SVG_HEIGHT - NODE_HEIGHT)),
            }
          : n
      )
    );
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  // Click node để hiện bảng, click SVG để ẩn
  const handleNodeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedSwitch(id);
  };
  const handleSvgClick = () => setSelectedSwitch(null);

  // Helper: Tính góc xoay mũi tên SVG
  const getArrowAngle = (x1: number, y1: number, x2: number, y2: number) => {
    return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  };

  if (loading && !topologyData) {
    return (
      <div className="w-full min-h-[100vh] bg-gray-100 rounded-lg shadow p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading network topology...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-[100vh] bg-gray-100 rounded-lg shadow p-4 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="mb-2">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100vh] bg-gray-100 rounded-lg shadow p-0 flex flex-col items-center relative">
      <h1 className="text-2xl font-bold mb-4">Network Topology </h1>
      <button
        className="fixed top-5 right-5 z-50 bg-blue-600 text-white px-3 py-1.5 rounded shadow hover:bg-blue-700 focus:outline-none"
        onClick={() => setSidebarOpen(true)}
        style={{ display: sidebarOpen ? 'none' : 'block' }}
        aria-label="Open sidebar"
      >
        Switch Info
      </button>
      <SidebarSwitchInfo
        nodes={nodes}
        portDetailMap={portDetailMap}
        selectedSwitch={selectedSwitch}
        onSelect={(id) => navigate(`/switch/${id}/rules`)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <svg
        ref={svgRef}
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        className="bg-gray-50 rounded shadow cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleSvgClick}
      >
        <defs>
          {/* Đổi màu edge thành đen */}
        </defs>
        {/* Vẽ links (mỗi cặp switch 1 đường) */}
        {links.map((link) => {
          const src = nodeMap[link.src];
          const dst = nodeMap[link.dst];
          if (!src || !dst) return null;
          const x1 = src.x + NODE_WIDTH / 2;
          const y1 = src.y + NODE_HEIGHT / 2;
          const x2 = dst.x + NODE_WIDTH / 2;
          const y2 = dst.y + NODE_HEIGHT / 2;
          // Vị trí mũi tên SVG, dịch ra xa node đích
          const arrowOffset = 120; // dịch ra xa hơn nữa
          const angle = getArrowAngle(x1, y1, x2, y2);
          const ax = x2 - (arrowOffset / 2) * Math.cos((angle * Math.PI) / 180);
          const ay = y2 - (arrowOffset / 2) * Math.sin((angle * Math.PI) / 180);
          return (
            <g key={link.src + '_' + link.dst}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={selectedSwitch === link.src || selectedSwitch === link.dst ? '#2563eb' : '#222'}
                strokeWidth={4}
                style={{ filter: 'drop-shadow(0px 2px 2px #2228)' }}
              />
              <image
                href={ARROW_IMG}
                x={ax - 16}
                y={ay - 16}
                width={32}
                height={32}
                transform={`rotate(${angle} ${ax} ${ay})`}
                style={{ pointerEvents: 'none', filter: 'drop-shadow(0px 2px 2px #2228)' }}
              />
            </g>
          );
        })}
        {/* Vẽ nodes là ảnh switch */}
        {nodes.map((n) => (
          <g key={n.id} style={{ cursor: 'move' }} onMouseDown={(e) => handleMouseDown(e, n.id)} onClick={(e) => handleNodeClick(e, n.id)}>
            <image
              href={SWITCH_IMG}
              x={n.x}
              y={n.y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              style={{ filter: 'drop-shadow(0px 2px 2px #60a5fa88)', outline: selectedSwitch === n.id ? '3px solid #2563eb' : 'none' }}
            />
            <text
              x={n.x + NODE_WIDTH / 2}
              y={n.y + NODE_HEIGHT + 22}
              textAnchor="middle"
              fontWeight={900}
              fontSize={22}
              fill={n.color}
              pointerEvents="none"
            >
              {n.label}
            </text>
            {/* Hiện bảng nhỏ nếu được chọn */}
            {selectedSwitch === n.id && (
              <foreignObject
                x={n.x + NODE_WIDTH + 10}
                y={n.y}
                width={340}
                height={160}
                style={{ zIndex: 10 }}
              >
                <div className="bg-gradient-to-br from-blue-50 via-slate-50 to-white rounded-xl shadow-xl border border-blue-400 p-5 text-sm min-w-[280px]">
                  <div className="font-semibold text-blue-700 mb-1">{n.label} - Ports Connected</div>
                  <table className="min-w-full text-left">
                    <thead>
                      <tr>
                        <th className="pr-2">Port</th>
                        <th className="pr-2">From</th>
                        <th className="pr-2 text-green-600">Allow</th>
                        <th className="pr-2 text-red-600">Deny</th>
                        <th className="pr-2">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((portDetailMap as Record<string, { port: string; fromSwitch?: string; fromPort?: string; allow?: boolean; deny?: boolean; connected?: boolean }[]>)[n.id]?.filter((p) => p.connected)?.length ?? 0) > 0 ? (
                        (portDetailMap as Record<string, { port: string; fromSwitch?: string; fromPort?: string; allow?: boolean; deny?: boolean; connected?: boolean }[]>)[n.id]
                          .filter((p) => p.connected)
                          .map((p, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-blue-700">{p.port}</td>
                            <td>Switch <span className="font-semibold text-blue-700">{p.fromSwitch}</span> port <span className="font-semibold text-blue-700">{p.fromPort}</span></td>
                            <td className="text-center">
                              {p.allow ? <span className="inline-block w-4 h-4 rounded-full bg-green-500" title="Allow"></span> : ''}
                            </td>
                            <td className="text-center">
                              {p.deny ? <span className="inline-block w-4 h-4 rounded-full bg-red-500" title="Deny"></span> : ''}
                            </td>
                              <td>
                                <button
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPort({ switchId: n.id, portNumber: `openflow:${n.id.split(':')[1]}:${p.port}` });
                                  }}
                                >
                                  Xem
                                </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={5} className="text-gray-400">No ports connected</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </foreignObject>
            )}
          </g>
        ))}
      </svg>
      {/* Panel chi tiết port */}
      {selectedPort && (
        <PortDetailPanel
          switchId={selectedPort.switchId}
          portNumber={selectedPort.portNumber}
          onClose={() => setSelectedPort(null)}
        />
      )}
    </div>
  );
};

export default DetailSwitch; 