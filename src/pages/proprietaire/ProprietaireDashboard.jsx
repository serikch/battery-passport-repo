import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Building2, Battery, Bell, LogOut, RefreshCw, CheckCircle, 
  AlertTriangle, Clock, Mail, Filter, LayoutDashboard, List,
  TrendingUp, Package, Activity, Eye, X, Camera, QrCode, Search,
  ArrowRight
} from 'lucide-react';

// ==================== CONFIGURATION ====================
const API_BASE_URL = 'https://battery-passport-api.onrender.com';

// ==================== API ====================
const api = {
  async getAllBatteries() {
    const res = await fetch(`${API_BASE_URL}/battery/`);
    if (!res.ok) throw new Error('Failed to fetch batteries');
    return res.json();
  },
  async getBatteryFull(batteryId) {
    const res = await fetch(`${API_BASE_URL}/battery/${batteryId}/full`);
    if (!res.ok) throw new Error('Battery not found');
    return res.json();
  },
  async getNotifications() {
    const res = await fetch(`${API_BASE_URL}/notifications/`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },
  async getAlerts() {
    const res = await fetch(`${API_BASE_URL}/modules/alerts`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },
  async updateStatus(batteryId, newStatus) {
    const res = await fetch(`${API_BASE_URL}/battery/${batteryId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newStatus })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  }
};

// ==================== STYLES ====================
const styles = {
  glassCard: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl",
  glassButton: "px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white font-medium transition-all hover:bg-white/10 hover:border-white/20 flex items-center justify-center gap-2",
  glassInput: "w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all",
  primaryButton: "px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2",
  dangerButton: "px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-red-500/25 flex items-center justify-center gap-2",
  successButton: "px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2",
};

// ==================== STATUS BADGE ====================
const StatusBadge = ({ status }) => {
  const colors = {
    'Original': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Signaled As Waste': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Waste': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Reused': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Repurposed': 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[status] || colors.Original}`}>
      {status}
    </span>
  );
};

// ==================== TOAST ====================
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl backdrop-blur-xl border ${
    type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
    type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
    type === 'warning' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
    'bg-white/10 border-white/20 text-white'
  }`}>
    <div className="flex items-center gap-3">
      {type === 'success' && <CheckCircle className="w-5 h-5" />}
      {type === 'error' && <AlertTriangle className="w-5 h-5" />}
      {type === 'warning' && <AlertTriangle className="w-5 h-5" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">×</button>
    </div>
  </div>
);

// ==================== MODULE CARD ====================
const ModuleCard = ({ module }) => {
  const ratio = (module.internalResistance / module.maxResistance) * 100;
  const status = module.isDefective ? 'critical' : ratio > 80 ? 'warning' : 'ok';
  
  return (
    <div className={`p-4 rounded-xl border ${
      status === 'critical' ? 'border-red-500/50 bg-red-500/10' :
      status === 'warning' ? 'border-yellow-500/50 bg-yellow-500/10' :
      'border-white/10 bg-white/5'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold">{module.moduleId}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          status === 'critical' ? 'bg-red-500/20 text-red-400' :
          status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-green-500/20 text-green-400'
        }`}>
          {status === 'critical' ? 'Critique' : status === 'warning' ? 'Attention' : 'OK'}
        </span>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Résistance</span>
          <span className={status === 'critical' ? 'text-red-400' : ''}>{module.internalResistance?.toFixed(3)}Ω</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${
              status === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-400' :
              status === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
              'bg-gradient-to-r from-green-500 to-green-400'
            }`}
            style={{ width: `${Math.min(ratio, 100)}%` }}
          />
        </div>
        <div className="flex justify-between"><span className="text-gray-400">SOH</span><span>{module.soh}%</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Temp</span><span>{module.temperature}°C</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Voltage</span><span>{module.voltage}V</span></div>
      </div>
    </div>
  );
};

// ==================== BATTERY INFO CARD ====================
const BatteryInfoCard = ({ battery, showModules = true }) => (
  <div className={`${styles.glassCard} p-6`}>
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
          <Battery className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-lg">{battery.batteryId}</h3>
          <p className="text-sm text-gray-400">{battery.batteryPassportId}</p>
        </div>
      </div>
      <StatusBadge status={battery.status} />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="p-3 bg-white/5 rounded-xl">
        <p className="text-xs text-gray-400 mb-1">Modèle</p>
        <p className="font-semibold text-sm">{battery.modelName || 'N/A'}</p>
      </div>
      <div className="p-3 bg-white/5 rounded-xl">
        <p className="text-xs text-gray-400 mb-1">Fabricant</p>
        <p className="font-semibold text-sm">{battery.manufacturer || 'N/A'}</p>
      </div>
      <div className="p-3 bg-white/5 rounded-xl">
        <p className="text-xs text-gray-400 mb-1">Chimie</p>
        <p className="font-semibold text-sm">{battery.composition || 'N/A'}</p>
      </div>
      <div className="p-3 bg-white/5 rounded-xl">
        <p className="text-xs text-gray-400 mb-1">Masse</p>
        <p className="font-semibold text-sm">{battery.massKg ? `${battery.massKg} kg` : 'N/A'}</p>
      </div>
    </div>
    {showModules && battery.modules?.length > 0 && (
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          Modules ({battery.modules.length})
          {battery.hasDefectiveModule && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
              {battery.defectiveModulesCount || battery.modules.filter(m => m.isDefective).length} défaillant(s)
            </span>
          )}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {battery.modules.map((module) => <ModuleCard key={module.moduleId} module={module} />)}
        </div>
      </div>
    )}
  </div>
);

// ==================== QR SCANNER MODAL ====================
const QRScannerModal = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState('initializing');
  const [manualId, setManualId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraState('initializing');
    setErrorMessage('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unavailable');
      setErrorMessage('Votre navigateur ne supporte pas l\'accès à la caméra');
      return;
    }

    try {
      let constraints = {
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        constraints = { video: true, audio: false };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => setCameraState('active'))
            .catch(err => {
              setCameraState('unavailable');
              setErrorMessage('Impossible de démarrer la vidéo');
            });
        };
      }
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setErrorMessage('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres.');
      } else if (err.name === 'NotFoundError') {
        setCameraState('unavailable');
        setErrorMessage('Aucune caméra détectée.');
      } else {
        setCameraState('unavailable');
        setErrorMessage(`Erreur: ${err.message || 'Inconnue'}`);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCameraState('initializing');
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const handleManualSubmit = () => {
    if (manualId.trim()) {
      stopCamera();
      onScan(manualId.trim());
      setManualId('');
      onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setManualId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${styles.glassCard} p-6 max-w-md w-full max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-400" />
            Scanner QR Code
          </h3>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="aspect-square bg-black/60 rounded-xl mb-4 relative overflow-hidden">
          {cameraState === 'initializing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <RefreshCw className="w-12 h-12 animate-spin mb-4" />
              <p className="text-sm">Initialisation de la caméra...</p>
            </div>
          )}
          
          {cameraState === 'active' && (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-purple-400 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-purple-400 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-purple-400 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-purple-400 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-purple-400 rounded-br-lg"></div>
                </div>
              </div>
            </>
          )}

          {(cameraState === 'denied' || cameraState === 'unavailable') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4">
              <Camera className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-sm text-center mb-2">{cameraState === 'denied' ? 'Caméra non autorisée' : 'Caméra non disponible'}</p>
              <p className="text-xs text-center text-gray-500">{errorMessage}</p>
              <button onClick={startCamera} className={`${styles.glassButton} mt-4 text-sm`}>
                <RefreshCw className="w-4 h-4" /> Réessayer
              </button>
            </div>
          )}
          
          {cameraState === 'initializing' && (
            <video ref={videoRef} autoPlay playsInline muted className="hidden" />
          )}
        </div>

        <div className="space-y-3">
          <p className="text-center text-sm text-gray-400">Ou entrez l'ID manuellement :</p>
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="BP-2024-LG-002"
            className={styles.glassInput}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
          <button onClick={handleManualSubmit} disabled={!manualId.trim()} className={`${styles.primaryButton} w-full disabled:opacity-50`}>
            <Search className="w-5 h-5" /> Rechercher
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-400 mb-2">Batteries de test :</p>
          <div className="flex flex-wrap gap-2">
            {['BP-2024-CATL-001', 'BP-2024-LG-002', 'BP-2024-BYD-003'].map(id => (
              <button key={id} onClick={() => { stopCamera(); onScan(id); setManualId(''); onClose(); }} className={`${styles.glassButton} text-xs`}>
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD ====================
const ProprietaireDashboard = ({ onLogout }) => {
  const [batteries, setBatteries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [selectedBatteryDetails, setSelectedBatteryDetails] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [bats, notifs, alts] = await Promise.all([
        api.getAllBatteries(),
        api.getNotifications(),
        api.getAlerts()
      ]);
      setBatteries(bats);
      setNotifications(notifs);
      setAlerts(alts);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleNotificationClick = async (notif) => {
    setSelectedNotification(notif);
    try {
      const bat = await api.getBatteryFull(notif.batteryId);
      setSelectedBatteryDetails(bat);
    } catch (err) {
      showToast('Erreur lors du chargement de la batterie', 'error');
    }
  };

  const handleConfirmWaste = async () => {
    if (!selectedNotification) return;
    setLoading(true);
    try {
      await api.updateStatus(selectedNotification.batteryId, 'Waste');
      showToast(`Batterie ${selectedNotification.batteryId} confirmée comme Waste`, 'success');
      setSelectedNotification(null);
      setSelectedBatteryDetails(null);
      loadData();
    } catch (err) {
      showToast('Erreur lors de la confirmation', 'error');
    }
    setLoading(false);
  };

  const handleConfirmWasteFromList = async (batteryId) => {
    setLoading(true);
    try {
      await api.updateStatus(batteryId, 'Waste');
      showToast(`Batterie ${batteryId} confirmée comme Waste`, 'success');
      loadData();
    } catch (err) {
      showToast('Erreur lors de la confirmation', 'error');
    }
    setLoading(false);
  };

  const handleScanResult = async (batteryId) => {
    try {
      const bat = await api.getBatteryFull(batteryId);
      setSelectedBatteryDetails(bat);
      setSelectedNotification({ batteryId, message: 'Recherche manuelle', senderRole: 'Scanner' });
      setActiveTab('notifications');
    } catch (err) {
      showToast('Batterie non trouvée', 'error');
    }
  };

  const stats = {
    total: batteries.length,
    original: batteries.filter(b => b.status === 'Original').length,
    signaledAsWaste: batteries.filter(b => b.status === 'Signaled As Waste').length,
    waste: batteries.filter(b => b.status === 'Waste').length,
    reused: batteries.filter(b => b.status === 'Reused').length,
    repurposed: batteries.filter(b => b.status === 'Repurposed').length,
  };

  const pendingNotifications = notifications.filter(n => n.status === 'pending' || !n.read);

  return (
    <div className="min-h-screen p-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <QRScannerModal 
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanResult}
      />
      
      {/* Header */}
      <div className={`${styles.glassCard} p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-400">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Propriétaire BP</h1>
              <p className="text-xs text-gray-400">Battery Passport</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowScanner(true)} className={styles.glassButton} title="Scanner">
              <Camera className="w-5 h-5" />
            </button>
            <button onClick={loadData} className={styles.glassButton} title="Rafraîchir">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative">
              <button onClick={() => setActiveTab('notifications')} className={styles.glassButton}>
                <Bell className="w-5 h-5" />
              </button>
              {pendingNotifications.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center animate-pulse">
                  {pendingNotifications.length}
                </span>
              )}
            </div>
            <button onClick={() => window.location.reload()} className={styles.glassButton} title="Recharger la page">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={onLogout} className={styles.glassButton}><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'notifications', label: `Notifications (${pendingNotifications.length})`, icon: Bell },
            { id: 'batteries', label: 'Batteries', icon: Battery },
            { id: 'alerts', label: `Alertes (${alerts.length})`, icon: AlertTriangle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedNotification(null); setSelectedBatteryDetails(null); }}
              className={`${styles.glassButton} ${activeTab === tab.id ? 'bg-purple-500/20 border-purple-500/50' : ''}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ===== DASHBOARD TAB ===== */}
        {activeTab === 'dashboard' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className={`${styles.glassCard} p-4`}>
                <Battery className="w-8 h-8 text-cyan-400 mb-2" />
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-400">Total</p>
              </div>
              <div className={`${styles.glassCard} p-4`}>
                <CheckCircle className="w-8 h-8 text-blue-400 mb-2" />
                <p className="text-2xl font-bold">{stats.original}</p>
                <p className="text-sm text-gray-400">Original</p>
              </div>
              <div className={`${styles.glassCard} p-4`}>
                <AlertTriangle className="w-8 h-8 text-yellow-400 mb-2" />
                <p className="text-2xl font-bold">{stats.signaledAsWaste}</p>
                <p className="text-sm text-gray-400">Signalées</p>
              </div>
              <div className={`${styles.glassCard} p-4`}>
                <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                <p className="text-2xl font-bold">{stats.waste}</p>
                <p className="text-sm text-gray-400">Waste</p>
              </div>
              <div className={`${styles.glassCard} p-4`}>
                <RefreshCw className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-2xl font-bold">{stats.reused}</p>
                <p className="text-sm text-gray-400">Reused</p>
              </div>
              <div className={`${styles.glassCard} p-4`}>
                <TrendingUp className="w-8 h-8 text-purple-400 mb-2" />
                <p className="text-2xl font-bold">{stats.repurposed}</p>
                <p className="text-sm text-gray-400">Repurposed</p>
              </div>
            </div>

            {/* Notifications Preview */}
            <div className={`${styles.glassCard} p-6`}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-400" /> 
                Notifications {pendingNotifications.length > 0 && `(${pendingNotifications.length} en attente)`}
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {notifications.length > 0 ? notifications.slice(0, 5).map((notif, i) => (
                  <div 
                    key={i} 
                    onClick={() => { setActiveTab('notifications'); handleNotificationClick(notif); }}
                    className={`p-4 rounded-xl border cursor-pointer hover:bg-white/5 transition-all ${
                      notif.urgency === 'high' ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'
                    } ${!notif.read || notif.status === 'pending' ? 'border-l-4 border-l-purple-500' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{notif.batteryId}</p>
                          {notif.status === 'pending' && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">En attente</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">De: {notif.senderRole}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-gray-400 py-4">Aucune notification</p>
                )}
              </div>
              {notifications.length > 5 && (
                <button onClick={() => setActiveTab('notifications')} className={`${styles.glassButton} w-full mt-4`}>
                  Voir toutes les notifications
                </button>
              )}
            </div>

            {/* Batteries Preview */}
            <div className={`${styles.glassCard} p-6`}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Battery className="w-5 h-5 text-cyan-400" /> Batteries ({batteries.length})
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {batteries.map((bat) => (
                  <div key={bat.batteryId} className="p-4 bg-white/5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Battery className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="font-semibold">{bat.batteryId}</p>
                        <p className="text-sm text-gray-400">{bat.modelName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={bat.status} />
                      {bat.status === 'Signaled As Waste' && (
                        <button onClick={() => handleConfirmWasteFromList(bat.batteryId)} className={`${styles.dangerButton} text-xs py-2 px-3`}>
                          Confirmer Waste
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts Preview */}
            {alerts.length > 0 && (
              <div className={`${styles.glassCard} p-6`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" /> Alertes Actives ({alerts.length})
                </h3>
                <div className="space-y-3">
                  {alerts.slice(0, 3).map((alert, i) => (
                    <div key={i} className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <p className="font-semibold">{alert.batteryId} - Module {alert.moduleId}</p>
                      <p className="text-sm text-gray-300">Résistance: {alert.resistance}Ω / max {alert.maxResistance}Ω ({alert.overloadPercent?.toFixed(0)}% surcharge)</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== NOTIFICATIONS TAB ===== */}
        {activeTab === 'notifications' && (
          <>
            {/* Notification Detail */}
            {selectedNotification && selectedBatteryDetails && (
              <div className={`${styles.glassCard} p-6 border-2 border-purple-500/50`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5 text-purple-400" />
                    Détails de la notification
                  </h3>
                  <button onClick={() => { setSelectedNotification(null); setSelectedBatteryDetails(null); }} className={styles.glassButton}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-4">
                  <p className="font-semibold text-yellow-400">Signalement de: {selectedNotification.senderRole}</p>
                  <p className="text-gray-300 mt-1">{selectedNotification.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{selectedNotification.timestamp || 'Récent'}</p>
                </div>

                <BatteryInfoCard battery={selectedBatteryDetails} showModules />

                {(selectedBatteryDetails.status === 'Signaled As Waste' || selectedBatteryDetails.status === 'Original') && (
                  <div className="mt-6 p-4 bg-white/5 rounded-xl">
                    <p className="text-sm text-gray-400 mb-4">
                      En confirmant, le statut passera à "Waste". La batterie pourra ensuite être envoyée au Centre de Tri.
                    </p>
                    <button onClick={handleConfirmWaste} disabled={loading} className={`${styles.dangerButton} w-full`}>
                      {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Confirmer le statut Waste</>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Notifications List */}
            {!selectedNotification && (
              <div className={`${styles.glassCard} p-6`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-400" /> Toutes les Notifications ({notifications.length})
                </h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {notifications.length > 0 ? notifications.map((notif, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 rounded-xl border cursor-pointer hover:bg-white/10 transition-all ${
                        notif.urgency === 'high' ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'
                      } ${!notif.read || notif.status === 'pending' ? 'border-l-4 border-l-purple-500' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{notif.batteryId}</p>
                            {notif.status === 'pending' && (
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">En attente</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-300">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">De: {notif.senderRole} • {notif.timestamp || 'Récent'}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-gray-400 py-8">Aucune notification</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== BATTERIES TAB ===== */}
        {activeTab === 'batteries' && (
          <div className={`${styles.glassCard} p-6`}>
            <h3 className="font-semibold mb-4">Gestion des Batteries ({batteries.length})</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {batteries.map((bat) => (
                <div key={bat.batteryId} className="p-4 bg-white/5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Battery className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="font-semibold">{bat.batteryId}</p>
                      <p className="text-sm text-gray-400">{bat.modelName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={bat.status} />
                    {bat.status === 'Signaled As Waste' && (
                      <button onClick={() => handleConfirmWasteFromList(bat.batteryId)} className={`${styles.dangerButton} text-sm py-2`}>
                        Confirmer Waste
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== ALERTS TAB ===== */}
        {activeTab === 'alerts' && (
          <div className={`${styles.glassCard} p-6`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" /> Alertes Actives ({alerts.length})
            </h3>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <div key={i} className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="font-semibold">{alert.batteryId} - Module {alert.moduleId}</p>
                    <p className="text-sm text-gray-300">
                      Résistance: {alert.resistance}Ω / max {alert.maxResistance}Ω ({alert.overloadPercent?.toFixed(0)}% surcharge)
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500/50 mx-auto mb-4" />
                <p className="text-gray-400">Aucune alerte active</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProprietaireDashboard;