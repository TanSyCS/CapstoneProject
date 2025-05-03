import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HeaderNav from './components/HeaderNav';
import DetailSwitch from './pages/Topology';
import Topology from './pages/NewTopology';
import SwitchRulesPage from './pages/SwitchRulesPage';
import AlertPage from './pages/AlertPage';

const App = () => {
  const [page, setPage] = useState('topology');

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <HeaderNav current={page} onNavigate={setPage} />
        <main className="max-w-7xl mx-auto px-4">
          <Routes>
            <Route path="/" element={<DetailSwitch />} />
            <Route path="/new-topology" element={<Topology />} />
            <Route path="/switch/:id/rules" element={<SwitchRulesPage />} />
            <Route path="/alert" element={<AlertPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
