import React from 'react';
import { Server, AlertTriangle, Grid, Clock } from 'react-feather';
import { useNavigate } from 'react-router-dom';

type HeaderNavProps = {
  current: string;
  onNavigate: (page: string) => void;
};

const NAVS = [
  { key: 'topology', label: 'Edit Rules', icon: Server, path: '/' },
  { key: 'new-topology', label: 'Topology', icon: Grid, path: '/new-topology' },
  { key: 'alert', label: 'Alert', icon: AlertTriangle, path: '/alert' },
  { key: 'response-time', label: 'Response Time', icon: Clock, path: '/response-time' },
];

const HeaderNav: React.FC<HeaderNavProps> = ({ current, onNavigate }) => {
  const navigate = useNavigate();

  const handleNavClick = (key: string, path: string) => {
    onNavigate(key);
    navigate(path);
  };

  return (
    <nav className="bg-white shadow-md rounded-lg mb-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex space-x-2">
            {NAVS.map((nav) => {
              const isActive = current === nav.key;
              const Icon = nav.icon;
              
              return (
                <button
                  key={nav.key}
                  className={`
                    px-5 py-2.5 rounded-lg font-medium focus:outline-none focus-visible:ring-2 
                    focus-visible:ring-blue-500 transition-all duration-200 ease-in-out
                    flex items-center gap-2 hover:shadow-sm
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-blue-50'}
                  `}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={nav.label}
                  tabIndex={0}
                  onClick={() => handleNavClick(nav.key, nav.path)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNavClick(nav.key, nav.path)}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-blue-500'}`} />
                  <span>{nav.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default HeaderNav;