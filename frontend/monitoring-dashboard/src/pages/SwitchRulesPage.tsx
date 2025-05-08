"use client"
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSwitchRules, SwitchRule, blockIpTraffic, addForwardingRule, arpFlood, deleteRule } from '../services/networkService';
import { ArrowLeft, RefreshCw, Trash2, AlertCircle } from 'react-feather';

const badgeColor = (priority: number) => {
  if (priority >= 100) return 'bg-green-500';
  if (priority >= 50) return 'bg-yellow-400';
  return 'bg-gray-400';
};

const outputColor = (output: string) => {
  if (output === 'CONTROLLER') return 'bg-purple-500';
  if (output === 'FLOOD') return 'bg-red-500';
  return 'bg-blue-500';
};

const SwitchRulesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rules, setRules] = useState<SwitchRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [srcIp, setSrcIp] = useState('');
  const [dstIp, setDstIp] = useState('');
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockMsg, setBlockMsg] = useState<string | null>(null);
  const [dstForwardIp, setDstForwardIp] = useState('');
  const [fwPort, setFwPort] = useState('');
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<string | null>(null);
  const [arpLoading, setArpLoading] = useState(false);
  const [arpMsg, setArpMsg] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const fetchRules = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getSwitchRules(id!);
      setRules(data);
    } catch (err) {
      setError('Cannot fetch rules. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRules();
    // eslint-disable-next-line
  }, [id]);

  const handleRefresh = () => fetchRules(true);

  const handleBlockIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srcIp && !dstIp) {
      setBlockMsg('Please enter at least one IP address.');
      return;
    }
    setBlockLoading(true);
    setBlockMsg(null);
    try {
      await blockIpTraffic({ switch_id: id!, src_ip: srcIp || undefined, dst_ip: dstIp || undefined });
      setBlockMsg('Block IP rule added successfully!');
      setSrcIp('');
      setDstIp('');
      fetchRules();
    } catch (err) {
      setBlockMsg('Failed to block IP.');
    } finally {
      setBlockLoading(false);
    }
  };

  const handleAddForward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dstForwardIp || !fwPort) {
      setForwardMsg('Please enter both Destination IP and Forward Port.');
      return;
    }
    setForwardLoading(true);
    setForwardMsg(null);
    try {
      await addForwardingRule({ switch_id: id!, dst_ip: dstForwardIp, fw_port: fwPort });
      setForwardMsg('Forwarding rule added successfully!');
      setDstForwardIp('');
      setFwPort('');
      fetchRules();
    } catch (err) {
      setForwardMsg('Failed to add forwarding rule.');
    } finally {
      setForwardLoading(false);
    }
  };

  const handleArpFlood = async () => {
    if (!window.confirm('Are you sure you want to send an ARP Flood rule to this switch?')) return;
    setArpLoading(true);
    setArpMsg(null);
    try {
      await arpFlood({ switch_id: id! });
      setArpMsg('ARP Flood rule added successfully!');
      fetchRules();
    } catch (err) {
      setArpMsg('Failed to add ARP Flood rule.');
    } finally {
      setArpLoading(false);
    }
  };

  const handleDeleteRule = async (flowId: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    
    setDeletingRuleId(flowId);
    setDeleteMsg(null);
    
    try {
      const response = await deleteRule({ switch_id: id!, flow_id: flowId });
      console.log('Delete rule response:', response);
      
      if (response && response.status === 'success') {
        setDeleteMsg('Rule deleted successfully!');
        // Fetch new data immediately
        await fetchRules(true);
        // Clear success message after 1 second
        setTimeout(() => {
          setDeleteMsg(null);
        }, 1000);
      } else {
        throw new Error(response?.message || 'Failed to delete rule');
      }
    } catch (err: any) {
      console.error('Error deleting rule:', err);
      setDeleteMsg(err?.response?.data?.message || err?.message || 'Failed to delete rule. Please try again.');
    } finally {
      setDeletingRuleId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-100 mt-8 mb-12 transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <button
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 shadow-md"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Topology</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-700">Switch: <span className="text-blue-600">{id}</span></span>
          <button
            className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing && <span className="sr-only">Refreshing...</span>}
          </button>
        </div>
      </div>
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4 text-blue-800">Flow Rules</h2>
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        {deleteMsg && (
          <div className={`flex items-center gap-2 ${deleteMsg.includes('success') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'} border rounded p-3 mb-4`}>
            <AlertCircle className="w-4 h-4" />
            <span>{deleteMsg}</span>
          </div>
        )}
        {loading ? (
          <RulesTableSkeleton />
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
            No rules found for this switch.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Flow ID</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">Output Port</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {rules.map((rule, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-slate-800">{rule.flow_id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-block px-2 py-1 rounded text-white text-xs font-semibold ${outputColor(rule["output-node-connector"] || "")}`}>{rule["output-node-connector"]}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-block px-2 py-1 rounded text-white text-xs font-semibold ${badgeColor(rule.priority)}`}>{rule.priority}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        className={`p-1 text-red-600 hover:bg-red-50 rounded transition-colors duration-200 ${deletingRuleId === rule.flow_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => handleDeleteRule(rule.flow_id)}
                        disabled={deletingRuleId === rule.flow_id}
                        aria-label="Delete rule"
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleDeleteRule(rule.flow_id); }}
                      >
                        <Trash2 className={`w-4 h-4 ${deletingRuleId === rule.flow_id ? 'animate-spin' : ''}`} />
                        <span className="sr-only">Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <form onSubmit={handleBlockIp} className="mb-8 bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label htmlFor="srcIp" className="text-xs font-medium text-blue-700">Source IP</label>
          <input id="srcIp" type="text" value={srcIp} onChange={e => setSrcIp(e.target.value)} placeholder="e.g. 10.0.0.1" className="px-3 py-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
        </div>
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label htmlFor="dstIp" className="text-xs font-medium text-blue-700">Destination IP</label>
          <input id="dstIp" type="text" value={dstIp} onChange={e => setDstIp(e.target.value)} placeholder="e.g. 10.0.0.2" className="px-3 py-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
        </div>
        <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold shadow-md disabled:opacity-60" disabled={blockLoading}>
          {blockLoading ? 'Blocking...' : 'Block IP'}
        </button>
        {blockMsg && <span className={`text-sm ${blockMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{blockMsg}</span>}
      </form>
      <form onSubmit={handleAddForward} className="mb-8 bg-green-50 border border-green-100 rounded-lg p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label htmlFor="dstForwardIp" className="text-xs font-medium text-green-700">Destination IP</label>
          <input id="dstForwardIp" type="text" value={dstForwardIp} onChange={e => setDstForwardIp(e.target.value)} placeholder="e.g. 10.0.0.1" className="px-3 py-2 border border-green-200 rounded focus:outline-none focus:ring-2 focus:ring-green-400 text-sm" />
        </div>
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label htmlFor="fwPort" className="text-xs font-medium text-green-700">Forward Port</label>
          <input id="fwPort" type="text" value={fwPort} onChange={e => setFwPort(e.target.value)} placeholder="e.g. openflow:2:2" className="px-3 py-2 border border-green-200 rounded focus:outline-none focus:ring-2 focus:ring-green-400 text-sm" />
        </div>
        <button type="submit" className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-semibold shadow-md disabled:opacity-60" disabled={forwardLoading}>
          {forwardLoading ? 'Adding...' : 'Add Forwarding Rule'}
        </button>
        {forwardMsg && <span className={`text-sm ${forwardMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{forwardMsg}</span>}
      </form>
      <div className="mb-8 flex flex-col md:flex-row items-center gap-4 bg-yellow-50 border border-yellow-100 rounded-lg p-4 shadow-sm">
        <button
          type="button"
          className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200 font-semibold shadow-md disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          onClick={handleArpFlood}
          disabled={arpLoading}
          aria-label="Send ARP Flood rule"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleArpFlood(); }}
        >
          {arpLoading ? 'Sending ARP Flood...' : 'Send ARP Flood Rule'}
        </button>
        {arpMsg && <span className={`text-sm ${arpMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{arpMsg}</span>}
      </div>
    </div>
  );
}

function RulesTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full divide-y divide-slate-200">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Flow ID</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">Output Port</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">Priority</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {[...Array(5)].map((_, idx) => (
              <tr key={idx}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="h-6 w-20 mx-auto bg-slate-200 rounded animate-pulse" />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="h-6 w-12 mx-auto bg-slate-200 rounded animate-pulse" />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="h-8 w-8 rounded-full mx-auto bg-slate-200 animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SwitchRulesPage;
 