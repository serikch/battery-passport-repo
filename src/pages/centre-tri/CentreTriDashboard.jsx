import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Recycle, Battery, QrCode, Search, AlertTriangle, CheckCircle, 
  RefreshCw, LogOut, Sparkles, TrendingUp, Package, Camera, X
} from 'lucide-react';

// ==================== CONFIGURATION ====================
const API_BASE_URL = 'https://battery-passport-api.onrender.com';

// ==================== API ====================
const api = {
  async getBatteryFull(batteryId) {
    const res = await fetch(`${API_BASE_URL}/battery/${batteryId}/full`);
    if (!res.ok) throw new Error('Battery not found');
    return res.json();
  },
  async getAllBatteries() {
    const res = await fetch(`${API_BASE_URL}/battery/`);
    if (!res.ok) throw new Error('Failed to fetch batteries');
    return res.json();
  },
  async getDecision(batteryId, marketDemand) {
    const res = await fetch(`${API_BASE_URL}/modules/battery/${batteryId}/decision?market_demand=${marketDemand}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to get decision');
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
  },
  async confirmReception(batteryId, centerName) {
    const res = await fetch(`${API_BASE_URL}/notifications/confirm-reception/${batteryId}?center_name=${encodeURIComponent(centerName)}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to confirm reception');
    return res.json();
  }
};

// ==================== STYLES ====================
const styles = {
  glassCard: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl",
  glassButton: "px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white font-medium transition-all hover:bg-white/10 hover:border-white/20 flex items-center justify-center gap-2",
  glassInput: "w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all",
  primaryButton: "px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2",
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
    'bg-white/10 border-white/20 text-white'
  }`}>
    <div className="flex items-center gap-3">
      {type === 'success' && <CheckCircle className="w-5 h-5" />}
      {type === 'error' && <AlertTriangle className="w-5 h-5" />}
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
          <span>{module.internalResistance?.toFixed(3)}Ω</span>
        </div>
        <div className="flex justify-between"><span className="text-gray-400">SOH</span><span>{module.soh}%</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Temp</span><span>{module.temperature}°C</span></div>
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
            <Camera className="w-5 h-5 text-green-400" />
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
                <div className="w-48 h-48 border-2 border-green-400 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
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
        <h4 className="font-semibold mb-3">Modules ({battery.modules.length})</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {battery.modules.map((module) => <ModuleCard key={module.moduleId} module={module} />)}
        </div>
      </div>
    )}
  </div>
);

// ==================== MAIN DASHBOARD ====================
const CentreTriDashboard = ({ onLogout }) => {
  const [battery, setBattery] = useState(null);
  const [decision, setDecision] = useState(null);
  const [batteryId, setBatteryId] = useState('');
  const [marketDemand, setMarketDemand] = useState('normal');
  const [receptionConfirmed, setReceptionConfirmed] = useState(false);
  const [finalDecision, setFinalDecision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [wasteBatteries, setWasteBatteries] = useState([]);
  const [showScanner, setShowScanner] = useState(false);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadWasteBatteries();
  }, []);

  const loadWasteBatteries = async () => {
    try {
      const bats = await api.getAllBatteries();
      setWasteBatteries(bats.filter(b => b.status === 'Waste'));
    } catch (err) {
      console.error('Error loading waste batteries:', err);
    }
  };

  const handleSearch = async (id = null) => {
    const searchId = id || batteryId;
    if (!searchId.trim()) return;
    setLoading(true);
    try {
      const bat = await api.getBatteryFull(searchId);
      setBattery(bat);
      setBatteryId(searchId);
      setReceptionConfirmed(false);
      setDecision(null);
      setFinalDecision(null);
      showToast('Batterie trouvée !', 'success');
    } catch (err) {
      showToast('Batterie non trouvée', 'error');
    }
    setLoading(false);
  };

  const handleConfirmReception = async () => {
    setLoading(true);
    try {
      await api.confirmReception(battery.batteryId, 'Centre de Tri EcoRecycle');
      setReceptionConfirmed(true);
      showToast('Réception confirmée !', 'success');
    } catch (err) {
      showToast('Erreur', 'error');
    }
    setLoading(false);
  };

  const handleGetDecision = async () => {
    setLoading(true);
    try {
      const dec = await api.getDecision(battery.batteryId, marketDemand);
      setDecision(dec);
      setFinalDecision(dec.recommendation);
    } catch (err) {
      showToast('Erreur', 'error');
    }
    setLoading(false);
  };

  const handleFinalDecision = async () => {
    if (!finalDecision) return;
    setLoading(true);
    try {
      const statusMap = { Recycle: 'Waste', Reuse: 'Reused', Remanufacture: 'Reused', Repurpose: 'Repurposed' };
      await api.updateStatus(battery.batteryId, statusMap[finalDecision]);
      showToast(`Décision validée: ${finalDecision}`, 'success');
      setBattery(null);
      setDecision(null);
      setReceptionConfirmed(false);
      setFinalDecision(null);
      setBatteryId('');
      loadWasteBatteries();
    } catch (err) {
      showToast('Erreur', 'error');
    }
    setLoading(false);
  };

  const handleScanResult = (scannedId) => {
    setBatteryId(scannedId);
    handleSearch(scannedId);
  };

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
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400">
              <Recycle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Centre de Tri</h1>
              <p className="text-xs text-gray-400">Battery Passport - Décision</p>
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
        {/* Scanner */}
        <div className={`${styles.glassCard} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <QrCode className="w-5 h-5 text-green-400" />
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
            <button onClick={() => setShowScanner(true)} className={styles.glassButton}>
              <Camera className="w-5 h-5" />
            </button>
            <button onClick={() => handleSearch()} disabled={loading} className={styles.primaryButton}>
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Waste batteries queue */}
          {wasteBatteries.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Batteries en attente ({wasteBatteries.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {wasteBatteries.map(b => (
                  <button 
                    key={b.batteryId} 
                    onClick={() => handleSearch(b.batteryId)} 
                    className={`${styles.glassButton} text-xs`}
                  >
                    {b.batteryId}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {battery && (
          <>
            {/* Status Verification */}
            <div className={`${styles.glassCard} p-6 ${battery.status === 'Waste' ? 'border border-green-500/30' : 'border border-yellow-500/30'}`}>
              <div className="flex items-center gap-4">
                {battery.status === 'Waste' ? (
                  <>
                    <div className="p-4 bg-green-500/20 rounded-full">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-green-400">Statut Confirmé: WASTE</h3>
                      <p className="text-gray-300">La batterie peut être traitée</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-yellow-500/20 rounded-full">
                      <AlertTriangle className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-yellow-400">Statut Incorrect: {battery.status}</h3>
                      <p className="text-gray-300">Attendu: Waste</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <BatteryInfoCard battery={battery} />

            {/* Reception & Decision Flow */}
            {battery.status === 'Waste' && !receptionConfirmed && (
              <div className={`${styles.glassCard} p-6 text-center`}>
                <button onClick={handleConfirmReception} disabled={loading} className={`${styles.successButton} px-8`}>
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Confirmer la Réception</>}
                </button>
              </div>
            )}

            {receptionConfirmed && !decision && (
              <div className={`${styles.glassCard} p-6`}>
                <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-center mb-4">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <p className="font-semibold text-green-400">Réception Confirmée</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">Demande du marché</p>
                  <div className="flex gap-2">
                    {['low', 'normal', 'high'].map(level => (
                      <button 
                        key={level} 
                        onClick={() => setMarketDemand(level)}
                        className={`flex-1 py-3 rounded-xl transition-all ${marketDemand === level ? 'bg-green-500/20 border border-green-500/50' : 'bg-white/5 border border-white/10'}`}
                      >
                        {level === 'low' ? '📉 Faible' : level === 'normal' ? '📊 Normal' : '📈 Forte'}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleGetDecision} disabled={loading} className={`${styles.primaryButton} w-full`}>
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5" /> Obtenir la Recommandation</>}
                </button>
              </div>
            )}

            {decision && (
              <>
                {/* Decision Card */}
                <div className={`${styles.glassCard} p-8 text-center bg-gradient-to-br ${
                  decision.recommendation === 'Recycle' ? 'from-red-500/20 to-orange-500/20' :
                  decision.recommendation === 'Reuse' ? 'from-green-500/20 to-emerald-500/20' :
                  decision.recommendation === 'Remanufacture' ? 'from-blue-500/20 to-cyan-500/20' :
                  'from-purple-500/20 to-pink-500/20'
                }`}>
                  <div className="text-6xl mb-4">
                    {decision.recommendation === 'Recycle' ? '♻️' : decision.recommendation === 'Reuse' ? '🔄' : decision.recommendation === 'Remanufacture' ? '🔧' : '🔀'}
                  </div>
                  <h2 className="text-3xl font-bold mb-2">{decision.recommendation?.toUpperCase()}</h2>
                  <p className="text-xl text-white/80">Confiance: {decision.confidence?.toFixed(0)}%</p>
                </div>

                {/* Scores */}
                <div className={`${styles.glassCard} p-6`}>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Scores Détaillés
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(decision.scores || {}).sort(([,a],[,b]) => b - a).map(([opt, score]) => (
                      <div key={opt}>
                        <div className="flex justify-between mb-1">
                          <span className={opt === decision.recommendation ? 'text-cyan-400 font-semibold' : ''}>
                            {opt} {opt === decision.recommendation && '★'}
                          </span>
                          <span className="text-gray-400">{score?.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${
                              opt === 'Recycle' ? 'from-red-500 to-orange-500' :
                              opt === 'Reuse' ? 'from-green-500 to-emerald-500' :
                              opt === 'Remanufacture' ? 'from-blue-500 to-cyan-500' :
                              'from-purple-500 to-pink-500'
                            }`} 
                            style={{ width: `${score}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-gray-300"><strong>Justification:</strong> {decision.reasoning}</p>
                </div>

                {/* Final Decision */}
                <div className={`${styles.glassCard} p-6`}>
                  <h3 className="font-semibold mb-4">Décision Finale</h3>
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {['Recycle', 'Reuse', 'Remanufacture', 'Repurpose'].map(opt => (
                      <button 
                        key={opt} 
                        onClick={() => setFinalDecision(opt)}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          finalDecision === opt ? 'border-green-500 bg-green-500/20' :
                          opt === decision.recommendation ? 'border-cyan-500/50 bg-cyan-500/10' :
                          'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="text-2xl block mb-2">
                          {opt === 'Recycle' ? '♻️' : opt === 'Reuse' ? '🔄' : opt === 'Remanufacture' ? '🔧' : '🔀'}
                        </span>
                        <span className="text-sm font-semibold">{opt}</span>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={handleFinalDecision} 
                    disabled={!finalDecision || loading} 
                    className={`${styles.successButton} w-full`}
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Confirmer: {finalDecision || '...'}</>}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CentreTriDashboard;