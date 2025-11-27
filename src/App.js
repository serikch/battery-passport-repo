import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';

// Pages
import LoginPage from './pages/LoginPage';
import GaragisteDashboard from './pages/garagiste/GaragisteDashboard';
import ProprietaireDashboard from './pages/proprietaire/ProprietaireDashboard';
import CentreTriDashboard from './pages/centre-tri/CentreTriDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-slate-900">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
      </div>
      
      <div className="relative z-10 min-h-screen text-white">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          
          <Route 
            path="/garagiste/*" 
            element={
              <ProtectedRoute allowedRoles={['garagiste']}>
                <GaragisteDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/proprietaire/*" 
            element={
              <ProtectedRoute allowedRoles={['proprietaire']}>
                <ProprietaireDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/centre-tri/*" 
            element={
              <ProtectedRoute allowedRoles={['centre-tri']}>
                <CentreTriDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;