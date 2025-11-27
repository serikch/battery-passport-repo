import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Wrench, Battery, QrCode, Search, AlertTriangle, CheckCircle, 
  Activity, Send, Thermometer, Zap, Gauge, RefreshCw, LogOut,
  Camera, X, ExternalLink
} from 'lucide-react';

// ==================== CONFIGURATION ====================
const API_BASE_URL = 'https://battery-passport-api.onrender.com';
const FRONTEND_BASE_URL = 'https://battery-passport-repo.onrender.com';

// ==================== API ====================
const api = {
  async getBatteryFull(batteryId) {
    const res = await fetch(`${API_BASE_URL}/battery/${batteryId}/full`);
    if (!res.ok) throw new Error('Battery not found');
    return res.json();
  },
  async getDiagnostic(batteryId) {
    const res = await fetch(`${API_BASE_URL}/modules/battery/${batteryId}/diagnostic`);
    if (!res.ok) throw new Error('Failed to fetch diagnostic');
    return res.json();
  },
  async reportWaste(batteryId, reason, garageName) {
    const res = await fetch(`${API_BASE_URL}/notifications/report-waste/${batteryId}?reason=${encodeURIComponent(reason)}&garage_name=${encodeURIComponent(garageName)}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to report waste');
    return res.json();
  },
  getQRCodeImage(batteryId, size = 10) {
    return `${API_BASE_URL}/battery/${batteryId}/qrcode?size=${size}`;
  },
  getBatteryPassportUrl(batteryId) {
    return `${FRONTEND_BASE_URL}/passport/${batteryId}`;
  }
};

// ==================== STYLES ====================
const styles = {
  glassCard: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl",
  glassButton: "px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white font-medium transition-all hover:bg-white/10 hover:border-white/20 flex items-center justify-center gap-2",
  glassInput: "w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all",
  primaryButton: "px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2",
  dangerButton: "px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-red-500/25 flex items-center justify-center gap-2",
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
            <Camera className="w-5 h-5 text-cyan-400" />
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
                <div className="w-48 h-48 border-2 border-cyan-400 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>
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

// ==================== BATTERY INFO CARD ====================
const BatteryInfoCard = ({ battery }) => (
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
    {battery.modules?.length > 0 && (
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

// ==================== MAIN DASHBOARD ====================
const GaragisteDashboard = ({ onLogout }) => {
  const [currentBattery, setCurrentBattery] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [batteryId, setBatteryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSearch = async (id = null) => {
    const searchId = id || batteryId;
    if (!searchId.trim()) return;
    
    setLoading(true);
    setReportSent(false);
    
    try {
      const bat = await api.getBatteryFull(searchId);
      setCurrentBattery(bat);
      setBatteryId(searchId);
      
      const diag = await api.getDiagnostic(searchId);
      setDiagnostic(diag);
      
      if (bat.hasDefectiveModule) {
        const defectiveModules = bat.modules?.filter(m => m.isDefective) || [];
        setReportReason(`Module(s) défaillant(s): ${defectiveModules.map(m => m.moduleId).join(', ')} - Résistance interne critique`);
      } else {
        setReportReason('');
      }
      
      showToast('Batterie trouvée !', 'success');
    } catch (err) {
      console.error('Search error:', err);
      showToast('Batterie non trouvée', 'error');
      setCurrentBattery(null);
      setDiagnostic(null);
    }
    setLoading(false);
  };

  const handleReport = async () => {
    if (!currentBattery || !reportReason.trim()) {
      showToast('Veuillez entrer une raison', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      await api.reportWaste(currentBattery.batteryId, reportReason, 'Garage Auto Plus');
      
      setCurrentBattery(prev => ({
        ...prev,
        status: 'Signaled As Waste'
      }));
      
      setReportSent(true);
      showToast('Notification envoyée ! Le Propriétaire BP doit confirmer.', 'success');
      
    } catch (err) {
      console.error('Report error:', err);
      showToast('Erreur lors de l\'envoi de la notification', 'error');
    }
    setLoading(false);
  };

  const handleScanResult = (scannedId) => {
    setBatteryId(scannedId);
    handleSearch(scannedId);
  };

  const isAlreadySignaled = currentBattery?.status === 'Signaled As Waste' || 
                           currentBattery?.status === 'Waste' ||
                           currentBattery?.status === 'Reused' ||
                           currentBattery?.status === 'Repurposed';

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
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Interface Garagiste</h1>
              <p className="text-xs text-gray-400">Battery Passport - Diagnostic</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className={styles.glassButton} title="Recharger">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={onLogout} className={styles.glassButton}>
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Scanner Section */}
        <div className={`${styles.glassCard} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <QrCode className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold">Scanner une batterie</h2>
          </div>
          
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={batteryId}
              onChange={(e) => setBatteryId(e.target.value)}
              placeholder="BP-2024-LG-002"
              className={`${styles.glassInput} flex-1`}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={() => setShowScanner(true)} className={styles.glassButton} title="Scanner QR Code">
              <Camera className="w-5 h-5" />
            </button>
            <button onClick={() => handleSearch()} disabled={loading} className={styles.primaryButton}>
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> Rechercher</>}
            </button>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-gray-400 self-center">Batteries de test :</span>
            {['BP-2024-CATL-001', 'BP-2024-LG-002', 'BP-2024-BYD-003'].map(id => (
              <button key={id} onClick={() => handleSearch(id)} className={`${styles.glassButton} text-xs`}>
                {id}
              </button>
            ))}
          </div>
        </div>

        {/* Battery Info & Diagnostic */}
        {currentBattery && (
          <>
            <BatteryInfoCard battery={currentBattery} />

            {/* Diagnostic Summary */}
            {diagnostic && (
              <div className={`${styles.glassCard} p-6`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  Diagnostic
                </h3>
                
                <div className={`p-4 rounded-xl mb-4 ${
                  diagnostic.diagnostic?.healthStatus === 'CRITICAL' ? 'bg-red-500/20 border border-red-500/30' :
                  diagnostic.diagnostic?.healthStatus === 'WARNING' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                  'bg-green-500/20 border border-green-500/30'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {diagnostic.diagnostic?.healthStatus === 'CRITICAL' ? 
                      <AlertTriangle className="w-6 h-6 text-red-400" /> : 
                      diagnostic.diagnostic?.healthStatus === 'WARNING' ?
                      <AlertTriangle className="w-6 h-6 text-yellow-400" /> :
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    }
                    <span className="font-bold text-lg">État: {diagnostic.diagnostic?.healthStatus}</span>
                  </div>
                  <p className="text-gray-300">{diagnostic.recommendation}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl">
                    <Gauge className="w-8 h-8 text-cyan-400 mb-2" />
                    <p className="text-xs text-gray-400">SOH Moyen</p>
                    <p className="text-xl font-bold">{diagnostic.diagnostic?.avgSoh?.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                    <p className="text-xs text-gray-400">Défaillants</p>
                    <p className="text-xl font-bold">{diagnostic.diagnostic?.defectiveModules}/{diagnostic.diagnostic?.totalModules}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <Thermometer className="w-8 h-8 text-orange-400 mb-2" />
                    <p className="text-xs text-gray-400">Temp Moyenne</p>
                    <p className="text-xl font-bold">{diagnostic.diagnostic?.avgTemperature?.toFixed(1)}°C</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <Zap className="w-8 h-8 text-yellow-400 mb-2" />
                    <p className="text-xs text-gray-400">Voltage Moyen</p>
                    <p className="text-xl font-bold">{diagnostic.diagnostic?.avgVoltage?.toFixed(2)}V</p>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code Display */}
            <div className={`${styles.glassCard} p-6`}>
              <h3 className="font-semibold mb-4">QR Code Batterie</h3>
              <div className="flex items-center gap-6">
                <img 
                  src={api.getQRCodeImage(currentBattery.batteryId)} 
                  alt="QR Code"
                  className="w-32 h-32 rounded-xl bg-white p-2"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-2">Scannez pour accéder au passeport</p>
                  <code className="text-xs bg-white/10 px-3 py-1 rounded-lg block mb-3">
                    {currentBattery.batteryId}
                  </code>
                  <a 
                    href={api.getBatteryPassportUrl(currentBattery.batteryId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.glassButton} text-sm inline-flex`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir le passeport
                  </a>
                </div>
              </div>
            </div>

            {/* Report Section */}
            {currentBattery.hasDefectiveModule && !isAlreadySignaled && (
              <div className={`${styles.glassCard} p-6 border border-red-500/30`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Signaler comme Waste
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Cette action enverra une notification au Propriétaire BP qui devra confirmer le changement de statut.
                </p>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Raison du signalement..."
                  className={`${styles.glassInput} min-h-[100px] resize-none mb-4`}
                />
                <button 
                  onClick={handleReport} 
                  disabled={loading || reportSent} 
                  className={`${styles.dangerButton} w-full disabled:opacity-50`}
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : reportSent ? (
                    <><CheckCircle className="w-5 h-5" /> Notification envoyée</>
                  ) : (
                    <><Send className="w-5 h-5" /> Envoyer au Propriétaire BP</>
                  )}
                </button>
              </div>
            )}

            {/* Status info for already signaled batteries */}
            {isAlreadySignaled && (
              <div className={`${styles.glassCard} p-6 border ${
                currentBattery.status === 'Signaled As Waste' ? 'border-yellow-500/30' : 'border-gray-500/30'
              }`}>
                <div className="flex items-center gap-3">
                  {currentBattery.status === 'Signaled As Waste' ? (
                    <>
                      <AlertTriangle className="w-6 h-6 text-yellow-400" />
                      <div>
                        <h3 className="font-semibold text-yellow-400">Batterie signalée - En attente de confirmation</h3>
                        <p className="text-sm text-gray-400">Le Propriétaire BP doit confirmer le changement vers "Waste".</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6 text-gray-400" />
                      <div>
                        <h3 className="font-semibold">Batterie déjà traitée</h3>
                        <p className="text-sm text-gray-400">Statut actuel: {currentBattery.status}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!currentBattery && !loading && (
          <div className={`${styles.glassCard} p-12 text-center`}>
            <QrCode className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">Aucune batterie sélectionnée</p>
            <p className="text-gray-500 text-sm">Scannez un QR code ou entrez un ID pour commencer le diagnostic</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GaragisteDashboard;