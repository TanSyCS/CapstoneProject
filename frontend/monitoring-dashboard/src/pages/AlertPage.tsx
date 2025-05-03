import React, { useEffect, useState } from "react";
import { AlertData, subscribeToAlerts } from "../services/alertService";
import { format } from "date-fns";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AlertDetailModal: React.FC<{ alert: AlertData; onClose: () => void }> = ({ alert, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" tabIndex={0} aria-modal="true" role="dialog" onClick={onClose}>
    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
      <button className="absolute top-2 right-2 text-gray-500 hover:text-blue-600" aria-label="Close" onClick={onClose}>
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <h2 className="text-xl font-bold mb-2 text-blue-700">Alert Details</h2>
      <div className="space-y-2 text-sm">
        <div><span className="font-semibold">Time:</span> {format(new Date(alert.timestamp), 'yyyy-MM-dd HH:mm:ss')}</div>
        <div><span className="font-semibold">Source IP:</span> {alert.src_ip}</div>
        <div><span className="font-semibold">Destination IP:</span> {alert.dest_ip}</div>
        <div><span className="font-semibold">Protocol:</span> {alert.proto}</div>
        <div><span className="font-semibold">Signature:</span> {alert.alert.signature}</div>
        <div><span className="font-semibold">Category:</span> {alert.alert.category}</div>
        <div><span className="font-semibold">Severity:</span> {alert.alert.severity}</div>
        <div><span className="font-semibold">Action:</span> {alert.alert.action}</div>
        <div><span className="font-semibold">Direction:</span> {alert.direction}</div>
        <div><span className="font-semibold">Host:</span> {alert.host}</div>
        <div><span className="font-semibold">Flow:</span> pkts_toserver: {alert.flow.pkts_toserver}, pkts_toclient: {alert.flow.pkts_toclient}, bytes_toserver: {alert.flow.bytes_toserver}, bytes_toclient: {alert.flow.bytes_toclient}</div>
        <div><span className="font-semibold">Metadata:</span> {JSON.stringify(alert.alert.metadata)}</div>
      </div>
    </div>
  </div>
);

const AlertPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAlerts((data) => {
      setAlerts((prev) => [data, ...prev].slice(0, 100));
    });
    return () => unsubscribe();
  }, []);

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return "bg-red-100 text-red-800";
      case 2: return "bg-orange-100 text-orange-800";
      case 3: return "bg-yellow-100 text-yellow-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const getActionColor = (action: string) => {
    return action === "allowed" ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Network Alerts (Real-time)</h1>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source IP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination IP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {alerts.map((alert, index) => (
                <tr key={`${alert.flow_id}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(alert.timestamp), 'HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{alert.src_ip}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{alert.dest_ip}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{alert.proto}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.alert.severity)}`}>
                      {alert.alert.signature}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{alert.alert.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${getActionColor(alert.alert.action)}`}>
                      {alert.alert.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => setSelectedAlert(alert)}
                      className="text-blue-600 hover:text-blue-900"
                      aria-label="View alert details"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Waiting for alerts...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedAlert && (
        <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
      <ToastContainer />
    </div>
  );
};

export default AlertPage;