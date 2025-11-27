import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
      <div className="animated-bg" />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(30, 41, 59, 0.95)',
            color: '#f8fafc',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#f8fafc'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f8fafc'
            }
          }
        }}
      />
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
    </Router>
  );
}

export default App;