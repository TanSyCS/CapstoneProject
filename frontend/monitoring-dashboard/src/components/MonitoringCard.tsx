import { MonitoringData } from '../types/monitoring';

interface MonitoringCardProps {
  data: MonitoringData;
}

const getStatusColor = (status: MonitoringData['status']) => {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'offline':
      return 'bg-red-500';
    case 'warning':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
};

export const MonitoringCard = ({ data }: MonitoringCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">ID: {data.id}</h3>
        <span className={`px-2 py-1 rounded-full text-white text-sm ${getStatusColor(data.status)}`}>
          {data.status}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">CPU Usage:</span>
          <span className="font-medium">{data.metrics.cpu}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Memory Usage:</span>
          <span className="font-medium">{data.metrics.memory}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Disk Usage:</span>
          <span className="font-medium">{data.metrics.disk}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Network Usage:</span>
          <span className="font-medium">{data.metrics.network}%</span>
        </div>
      </div>

      {data.details && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">{data.details}</p>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
}; 