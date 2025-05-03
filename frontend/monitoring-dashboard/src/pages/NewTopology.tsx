import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getNetworkTopology, getMininetInfo, NetworkNode, TopologyResponse, MininetInfo } from '../services/networkService';
import PortDetailPanel from '../components/PortDetailPanel';

// Constants
const NODE_WIDTH = 80;
const NODE_HEIGHT = 80;
const SVG_WIDTH = window.innerWidth;
const SVG_HEIGHT = window.innerHeight - 80;
const NODE_Y = 200;
const COLORS = {
  switch: '#2563eb',
  host: '#059669',
  controller: '#f59e42'
};

// Icons
const SWITCH_IMG = '/network-switch.svg';
const HOST_IMG = '/computer.svg';
const CONTROLLER_IMG = '/server.svg';
const ARROW_IMG = '/right-arrow.svg';

// Helper Functions
const mapTopoIdToMininetId = (id: string) => {
  const match = id.match(/openflow:(\d+)/);
  if (match) return `s${match[1]}`;
  return id;
};

const parseCombinedTopology = (_topologyData: TopologyResponse, mininetData: MininetInfo) => {
  const nodes: NetworkNode[] = [];
  const connections: { from: string; to: string; fromPort: string; toPort: string }[] = [];
  
  // Add switches
  Object.entries(mininetData.switches).forEach(([switchId, switchInfo], idx) => {
    nodes.push({
      id: switchId,
      type: 'switch',
      label: `Switch ${switchId.slice(1)}`,
      x: 150 + idx * 400,
      y: NODE_Y,
      color: COLORS.switch,
      interfaces: switchInfo.interfaces
    });
  });

  // Add hosts
  Object.entries(mininetData.hosts).forEach(([hostId, hostInfo], idx) => {
    nodes.push({
      id: hostId,
      type: 'host',
      label: hostId,
      x: 150 + idx * 400,
      y: NODE_Y + 200,
      color: COLORS.host,
      ip: hostInfo.ip,
      interfaces: hostInfo.interfaces
    });
  });

  // Add controller
  mininetData.controllers.forEach((controllerId, idx) => {
    nodes.push({
      id: controllerId,
      type: 'controller',
      label: controllerId,
      x: 150 + idx * 400,
      y: NODE_Y - 200,
      color: COLORS.controller
    });
  });

  // Host → Switch (hiển thị đúng tên interface ở cả hai đầu)
  Object.entries(mininetData.hosts).forEach(([hostId, hostInfo]) => {
    Object.entries(hostInfo.interfaces).forEach(([ifaceName, iface]) => {
      Object.entries(iface).forEach(([key, value]) => {
        if (key.startsWith('s') && typeof value === 'string' && value.startsWith('openflow:')) {
          const switchId = mapTopoIdToMininetId(value);
          // Tìm tên interface phía switch (nếu có)
          let switchIfaceName = '';
          const switchInfo = mininetData.switches[switchId];
          if (switchInfo) {
            Object.entries(switchInfo.interfaces).forEach(([swIfaceName, swIface]) => {
              if ((swIface as any)[key] === hostId) switchIfaceName = swIfaceName;
            });
          }
          if (!connections.some(c => c.from === hostId && c.to === switchId && c.fromPort === ifaceName)) {
            connections.push({
              from: hostId,
              to: switchId,
              fromPort: ifaceName,
              toPort: switchIfaceName,
            });
          }
        }
      });
    });
  });

  // Switch → Host (hiển thị đúng tên interface ở cả hai đầu)
  Object.entries(mininetData.switches).forEach(([switchId, switchInfo]) => {
    Object.entries(switchInfo.interfaces).forEach(([ifaceName, iface]) => {
      Object.entries(iface).forEach(([key, value]) => {
        if (key.startsWith('h') && value === 'host') {
          // Tìm tên interface phía host (nếu có)
          let hostIfaceName = '';
          const hostInfo = mininetData.hosts[key];
          if (hostInfo) {
            Object.entries(hostInfo.interfaces).forEach(([hIfaceName, hIface]) => {
              if ((hIface as any)[switchId]) hostIfaceName = hIfaceName;
            });
          }
          if (!connections.some(c => c.from === switchId && c.to === key && c.fromPort === ifaceName)) {
            connections.push({
              from: switchId,
              to: key,
              fromPort: ifaceName,
              toPort: hostIfaceName,
            });
          }
        }
        // Switch → Switch (giữ nguyên logic cũ nếu cần)
        if (key.startsWith('s') && typeof value === 'string' && value.startsWith('openflow:')) {
          const targetSwitch = mapTopoIdToMininetId(value);
          if (!connections.some(c => c.from === switchId && c.to === targetSwitch && c.fromPort === ifaceName)) {
            connections.push({
              from: switchId,
              to: targetSwitch,
              fromPort: ifaceName,
              toPort: '',
            });
          }
        }
      });
    });
  });

  return { nodes, connections };
};

// Helper: Calculate arrow angle
const getArrowAngle = (x1: number, y1: number, x2: number, y2: number) => {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
};


const Topology: React.FC = () => {
  const [topologyData, setTopologyData] = useState<TopologyResponse | null>(null);
  const [mininetData, setMininetData] = useState<MininetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [connections, setConnections] = useState<{ from: string; to: string; fromPort: string; toPort: string }[]>([]);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState<{ switchId: string, portNumber: string } | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [topo, mininet] = await Promise.all([
          getNetworkTopology(),
          getMininetInfo()
        ]);
        setTopologyData(topo);
        setMininetData(mininet);
        setError(null);
      } catch (err) {
        setError('Failed to fetch network data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Parse combined data
  useEffect(() => {
    if (!topologyData || !mininetData) return;
    const { nodes: parsedNodes, connections: parsedConnections } = parseCombinedTopology(topologyData, mininetData);
    setNodes(parsedNodes);
    setConnections(parsedConnections);
  }, [topologyData, mininetData]);

  // Create node map for easy lookup
  const nodeMap = useMemo(() =>
    Object.fromEntries(nodes.map(node => [node.id, node])),
    [nodes]
  );

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
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
    setNodes(prev =>
      prev.map(n =>
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

  const handleMouseUp = () => setDragging(null);

  // Click node để hiện panel, click SVG để ẩn
  const handleNodeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedNode(id);
  };
  const handleSvgClick = () => setSelectedNode(null);

  if (loading) {
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
      <h1 className="text-2xl font-bold mb-4">Network Topology</h1>
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
        {/* Draw connections */}
        {connections.map((conn, idx) => {
          const fromNode = nodeMap[conn.from];
          const toNode = nodeMap[conn.to];
          if (!fromNode || !toNode) return null;
          const x1 = fromNode.x + NODE_WIDTH / 2;
          const y1 = fromNode.y + NODE_HEIGHT / 2;
          const x2 = toNode.x + NODE_WIDTH / 2;
          const y2 = toNode.y + NODE_HEIGHT / 2;
          const arrowOffset = 40;
          const angle = getArrowAngle(x1, y1, x2, y2);
          const ax = x2 - (arrowOffset * Math.cos((angle * Math.PI) / 180));
          const ay = y2 - (arrowOffset * Math.sin((angle * Math.PI) / 180));
          return (
            <g key={`${conn.from}-${conn.to}-${idx}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#666"
                strokeWidth={2}
                style={{ filter: 'drop-shadow(0px 2px 2px #2228)' }}
              />
              <image
                href={ARROW_IMG}
                x={ax - 8}
                y={ay - 8}
                width={16}
                height={16}
                transform={`rotate(${angle} ${ax} ${ay})`}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          );
        })}
        {/* Draw nodes */}
        {nodes.map((node) => (
          <g
            key={node.id}
            style={{ cursor: 'move' }}
            onMouseDown={e => handleMouseDown(e, node.id)}
            onClick={e => handleNodeClick(e, node.id)}
          >
            <image
              href={node.type === 'switch' ? SWITCH_IMG : node.type === 'host' ? HOST_IMG : CONTROLLER_IMG}
              x={node.x}
              y={node.y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              style={{
                filter: 'drop-shadow(0px 2px 2px #60a5fa88)',
                outline: selectedNode === node.id ? '3px solid #2563eb' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
            <text
              x={node.x + NODE_WIDTH / 2}
              y={node.y + NODE_HEIGHT + 20}
              textAnchor="middle"
              fill="#333"
              fontSize={14}
              fontWeight="bold"
            >
              {node.label}
            </text>
            {node.ip && (
              <text
                x={node.x + NODE_WIDTH / 2}
                y={node.y + NODE_HEIGHT + 40}
                textAnchor="middle"
                fill="#666"
                fontSize={12}
              >
                {node.ip}
              </text>
            )}
            {/* Hiện panel chi tiết nếu được chọn */}
            {selectedNode === node.id && node.type === 'switch' && mininetData && mininetData.switches[node.id] && (
              <foreignObject
                x={node.x + NODE_WIDTH + 10}
                y={node.y}
                width={360}
                height={200}
                style={{ zIndex: 10 }}
              >
                <div className="bg-gradient-to-br from-blue-50 via-slate-50 to-white rounded-xl shadow-xl border border-blue-400 p-5 text-sm min-w-[280px]">
                  <div className="font-semibold text-blue-700 mb-1">{node.label} - Ports Connected</div>
                  <table className="min-w-full text-left">
                    <thead>
                      <tr>
                        <th className="pr-2">Port</th>
                        <th className="pr-2">To</th>
                        <th className="pr-2">Type</th>
                        <th className="pr-2">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(mininetData.switches[node.id].interfaces).length > 0 ? (
                        Object.entries(mininetData.switches[node.id].interfaces).map(([ifaceName, iface], idx) => {
                          let to = '', type = '';
                          Object.entries(iface).forEach(([k, v]) => {
                            if (k.startsWith('h') && v === 'host') {
                              to = k;
                              type = 'host';
                            } else if (k.startsWith('s') && typeof v === 'string' && v.startsWith('openflow:')) {
                              to = `s${v.split(':')[1]}`;
                              type = 'switch';
                            }
                          });
                          return (
                            <tr key={idx}>
                              <td className="font-semibold text-blue-700">{ifaceName}</td>
                              <td>{to}</td>
                              <td>{type}</td>
                              <td>
                                <button
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedPort({ switchId: node.id, portNumber: ifaceName });
                                  }}
                                >
                                  Xem
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={4} className="text-gray-400">No ports</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </foreignObject>
            )}
          </g>
        ))}
      </svg>
      {/* Port detail panel */}
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

export default Topology; 