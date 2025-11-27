import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';

// Import des pages
import LoginPage from './pages/LoginPage';
import GaragisteDashboard from './pages/garagiste/GaragisteDashboard';
import ProprietaireDashboard from './pages/proprietaire/ProprietaireDashboard';
import CentreTriDashboard from './pages/centre-tri/CentreTriDashboard';
import BatteryPassport from './pages/BatteryPassport';

// ==================== AUTH STORE ====================
// Simple store sans Zustand pour éviter les dépendances
const useAuth = () => {
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem('battery-passport-auth');
    return stored ? JSON.parse(stored) : { isAuthenticated: false, role: null, username: null };
  });

  const login = (role, username) => {
    const newAuth = { isAuthenticated: true, role, username };
    localStorage.setItem('battery-passport-auth', JSON.stringify(newAuth));
    setAuth(newAuth);
  };

  const logout = () => {
    localStorage.removeItem('battery-passport-auth');
    setAuth({ isAuthenticated: false, role: null, username: null });
  };

  return { ...auth, login, logout };
};

// ==================== PROTECTED ROUTE ====================
const ProtectedRoute = ({ children, allowedRoles, auth }) => {
  if (!auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// ==================== PASSPORT ROUTE WRAPPER ====================
const PassportWrapper = () => {
  const { batteryId } = useParams();
  return <BatteryPassport batteryId={batteryId} />;
};

// ==================== MAIN APP ====================
function AppContent() {
  const auth = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role, username) => {
    auth.login(role, username);
    // Rediriger vers le dashboard approprié
    const paths = {
      'garagiste': '/garagiste',
      'proprietaire': '/proprietaire',
      'centre-tri': '/centre-tri'
    };
    navigate(paths[role] || '/');
  };

  const handleLogout = () => {
    auth.logout();
    navigate('/');
  };

  return (
    <>
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
          {/* Page de login */}
          <Route path="/" element={
            auth.isAuthenticated ? (
              <Navigate to={`/${auth.role}`} replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          } />
          
          {/* Page passeport publique (accessible sans login) */}
          <Route path="/passport/:batteryId" element={<PassportWrapper />} />
          
          {/* Dashboard Garagiste */}
          <Route 
            path="/garagiste" 
            element={
              <ProtectedRoute allowedRoles={['garagiste']} auth={auth}>
                <GaragisteDashboard onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          {/* Dashboard Propriétaire */}
          <Route 
            path="/proprietaire" 
            element={
              <ProtectedRoute allowedRoles={['proprietaire']} auth={auth}>
                <ProprietaireDashboard onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          {/* Dashboard Centre de Tri */}
          <Route 
            path="/centre-tri" 
            element={
              <ProtectedRoute allowedRoles={['centre-tri']} auth={auth}>
                <CentreTriDashboard onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;