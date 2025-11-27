import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Battery,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronRight,
  QrCode,
  Search
} from 'lucide-react';
import { useAuthStore, useNotificationStore } from '../store';

const DashboardLayout = ({ 
  children, 
  title, 
  icon: Icon,
  gradient,
  showNotifications = false,
  navItems = []
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (showNotifications) {
      fetchUnreadCount();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [showNotifications, fetchUnreadCount]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card mx-4 mt-4 mb-6 rounded-2xl"
      >
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left - Logo & Title */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden glass-button p-2"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg">{title}</h1>
                <p className="text-xs text-slate-400">Battery Passport</p>
              </div>
            </div>
          </div>

          {/* Center - Navigation (Desktop) */}
          <nav className="hidden lg:flex items-center gap-2">
            {navItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  item.active 
                    ? 'bg-white/10 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            {showNotifications && (
              <button 
                onClick={() => navigate('/proprietaire/notifications')}
                className="relative glass-button p-2"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>
            )}

            <div className="hidden sm:flex items-center gap-3 px-3 py-2 bg-white/5 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-sm font-bold">{user?.username?.[0]?.toUpperCase()}</span>
              </div>
              <span className="text-sm font-medium">{user?.username}</span>
            </div>

            <button 
              onClick={handleLogout}
              className="glass-button p-2 hover:bg-red-500/20"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden border-t border-white/10 overflow-hidden"
            >
              <div className="p-4 space-y-2">
                {navItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      item.onClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      item.active 
                        ? 'bg-white/10 text-white' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Main Content */}
      <main className="px-4 pb-8">
        {children}
      </main>
    </div>
  );
};

// Battery Scanner Component
export const BatteryScanner = ({ onBatteryFound, placeholder = "Entrez l'ID de la batterie..." }) => {
  const [batteryId, setBatteryId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (batteryId.trim()) {
      onBatteryFound(batteryId.trim());
    }
  };

  const handleScan = async () => {
    setShowScanner(true);
    setIsScanning(true);
    
    // Vérifier si l'API de la caméra est disponible
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // Dans un vrai cas, on utiliserait une bibliothèque de scan QR
      // Pour ce PoC, on simule avec une entrée manuelle
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Camera access denied:', error);
    }
    
    setIsScanning(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-cyan-500/20">
          <QrCode className="w-5 h-5 text-cyan-400" />
        </div>
        <h2 className="text-lg font-semibold">Scanner une batterie</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={batteryId}
            onChange={(e) => setBatteryId(e.target.value)}
            placeholder={placeholder}
            className="glass-input pl-12 pr-24"
          />
          <button
            type="button"
            onClick={handleScan}
            className="absolute right-2 top-1/2 -translate-y-1/2 glass-button py-2 px-3 text-sm"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>

        <button type="submit" className="glass-button primary w-full py-3">
          <Search className="w-4 h-4 mr-2" />
          Rechercher
        </button>
      </form>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowScanner(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Scanner QR Code</h3>
                <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="aspect-square bg-black/40 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                {/* Scanning animation */}
                <motion.div
                  className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                  animate={{ y: [-150, 150] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-4 border-2 border-dashed border-white/20 rounded-lg" />
                <p className="text-slate-400 text-sm">Positionnez le QR code</p>
              </div>

              <p className="text-center text-sm text-slate-400 mb-4">
                Ou entrez l'ID manuellement :
              </p>
              
              <input
                type="text"
                value={batteryId}
                onChange={(e) => setBatteryId(e.target.value)}
                placeholder="BP-2024-..."
                className="glass-input mb-4"
                autoFocus
              />
              
              <button 
                onClick={() => {
                  if (batteryId.trim()) {
                    onBatteryFound(batteryId.trim());
                    setShowScanner(false);
                  }
                }}
                className="glass-button primary w-full py-3"
              >
                Valider
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Battery Info Card Component
export const BatteryInfoCard = ({ battery, showModules = false }) => {
  if (!battery) return null;

  const statusColors = {
    Original: 'original',
    Waste: 'waste',
    Reused: 'reused',
    Repurposed: 'repurposed'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
            <Battery className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{battery.batteryId}</h3>
            <p className="text-sm text-slate-400">{battery.batteryPassportId}</p>
          </div>
        </div>
        <span className={`status-badge ${statusColors[battery.status] || 'original'}`}>
          {battery.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-white/5 rounded-xl">
          <p className="text-xs text-slate-400 mb-1">Modèle</p>
          <p className="font-semibold text-sm">{battery.modelName || 'N/A'}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-xl">
          <p className="text-xs text-slate-400 mb-1">Fabricant</p>
          <p className="font-semibold text-sm">{battery.manufacturer || 'N/A'}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-xl">
          <p className="text-xs text-slate-400 mb-1">Chimie</p>
          <p className="font-semibold text-sm">{battery.composition || 'N/A'}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-xl">
          <p className="text-xs text-slate-400 mb-1">Masse</p>
          <p className="font-semibold text-sm">{battery.massKg ? `${battery.massKg} kg` : 'N/A'}</p>
        </div>
      </div>

      {showModules && battery.modules && battery.modules.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <span>Modules ({battery.modules.length})</span>
            {battery.hasDefectiveModule && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                {battery.defectiveModulesCount} défaillant(s)
              </span>
            )}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {battery.modules.map((module) => (
              <ModuleCard key={module.moduleId} module={module} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Module Card Component
export const ModuleCard = ({ module }) => {
  const ratio = (module.internalResistance / module.maxResistance) * 100;
  let status = 'ok';
  if (module.isDefective) status = 'critical';
  else if (ratio > 80) status = 'warning';

  const statusConfig = {
    ok: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'OK' },
    warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Attention' },
    critical: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Critique' }
  };

  const config = statusConfig[status];

  return (
    <div className={`p-4 rounded-xl border ${
      status === 'critical' 
        ? 'border-red-500/50 bg-red-500/10' 
        : status === 'warning'
        ? 'border-yellow-500/50 bg-yellow-500/10'
        : 'border-white/10 bg-white/5'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold">{module.moduleId}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
          {config.label}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Résistance</span>
          <span className={config.color}>{module.internalResistance?.toFixed(3)}Ω</span>
        </div>
        <div className="module-indicator">
          <div 
            className={`module-indicator-fill ${status}`}
            style={{ width: `${Math.min(ratio, 100)}%` }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">SOH</span>
          <span>{module.soh}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Temp</span>
          <span>{module.temperature}°C</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Voltage</span>
          <span>{module.voltage}V</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;