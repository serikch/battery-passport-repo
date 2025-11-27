import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, Battery, QrCode, Search, AlertTriangle, CheckCircle, 
  Activity, Send, Thermometer, Zap, Gauge, RefreshCw, LogOut,
  Camera, X, Eye
} from 'lucide-react';
import { useAuthStore, useBatteryStore, useNotificationStore } from '../../store';
import api from '../../services/api';

// Styles
const styles = {
  glassCard: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl",
  glassButton: "px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white font-medium transition-all hover:bg-white/10 hover:border-white/20 flex items-center justify-center gap-2",
  glassInput: "w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all",
  primaryButton: "px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2",
  dangerButton: "px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-red-500/25 flex items-center justify-center gap-2",
  successButton: "px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2",
};

// Status Badge
const StatusBadge = ({ status }) => {
  const colors = {
    Original: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Waste: 'bg-red-500/20 text-red-400 border-red-500/30',
    Reused: 'bg-green-500/20 text-green-400 border-green-500/30',
    Repurposed: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[status] || colors.Original}`}>
      {status}
    </span>
  );
};

// Toast
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl backdrop-blur-xl border ${
    type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
    type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
    'bg-white/10 border-white/20 text-white'
  } animate-pulse`}>
    <div className="flex items-center gap-3">
      {type === 'success' && <CheckCircle className="w-5 h-5" />}
      {type === 'error' && <AlertTriangle className="w-5 h-5" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">×</button>
    </div>
  </div>
);

// Module Card
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

// QR Scanner Modal Component
const QRScannerModal = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [manualId, setManualId] = useState('');
  const [stream, setStream] = useState(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setHasCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleManualSubmit = () => {
    if (manualId.trim()) {
      stopCamera();
      onScan(manualId.trim());
      onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${styles.glassCard} p-6 max-w-md w-full`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            Scanner QR Code
          </h3>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Camera View */}
        <div className="aspect-square bg-black/40 rounded-xl mb-4 relative overflow-hidden">
          {hasCamera ? (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover rounded-xl"
              />
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-cyan-400 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
                  {/* Scanning line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"
                       style={{ animation: 'scan 2s infinite', top: '50%' }} />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <Camera className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-sm">Caméra non disponible</p>
              <p className="text-xs mt-1">Utilisez la saisie manuelle ci-dessous</p>
            </div>
          )}
        </div>

        {/* Manual Entry */}
        <div className="space-y-3">
          <p className="text-center text-sm text-gray-400">
            {hasCamera ? 'Ou entrez l\'ID manuellement :' : 'Entrez l\'ID de la batterie :'}
          </p>
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="BP-2024-LG-002"
            className={styles.glassInput}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
          <button 
            onClick={handleManualSubmit} 
            className={`${styles.primaryButton} w-full`}
          >
            <Search className="w-5 h-5" />
            Rechercher
          </button>
        </div>

        {/* Quick Select */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-400 mb-2">Batteries de test :</p>
          <div className="flex flex-wrap gap-2">
            {['BP-2024-CATL-001', 'BP-2024-LG-002', 'BP-2024-BYD-003'].map(id => (
              <button 
                key={id}
                onClick={() => {
                  stopCamera();
                  onScan(id);
                  onClose();
                }}
                className={`${styles.glassButton} text-xs`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-50px); }
          50% { transform: translateY(50px); }
        }
      `}</style>
    </div>
  );
};

// Battery Info Card
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

// Main Dashboard Component
const GaragisteDashboard = () => {
  const { logout } = useAuthStore();
  const { currentBattery, fetchBattery, clearBattery } = useBatteryStore();
  const { reportWaste } = useNotificationStore();
  
  const [batteryId, setBatteryId] = useState('');
  const [diagnostic, setDiagnostic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearch = async (id = batteryId) => {
    const searchId = id || batteryId;
    if (!searchId.trim()) return;
    
    setLoading(true);
    try {
      const bat = await fetchBattery(searchId);
      const diag = await api.getDiagnostic(searchId);
      setDiagnostic(diag);
      
      if (bat.hasDefectiveModule) {
        const defectiveModules = bat.modules?.filter(m => m.isDefective) || [];
        setReportReason(`Module(s) défaillant(s): ${defectiveModules.map(m => m.moduleId).join(', ')} - Résistance interne critique`);
      }
      showToast('Batterie trouvée !', 'success');
    } catch (err) {
      showToast('Batterie non trouvée', 'error');
    }
    setLoading(false);
  };

  const handleReport = async () => {
    if (!currentBattery || !reportReason) return;
    setLoading(true);
    try {
      await reportWaste(currentBattery.batteryId, reportReason, 'Garage Auto Plus');
      showToast('Notification envoyée au Propriétaire BP !', 'success');
    } catch (err) {
      showToast('Erreur lors de l\'envoi', 'error');
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
      
      {/* QR Scanner Modal */}
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
          <button onClick={logout} className={styles.glassButton}>
            <LogOut className="w-5 h-5" />
          </button>
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
            <button 
              onClick={() => setShowScanner(true)} 
              className={styles.glassButton}
              title="Scanner QR Code"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button onClick={() => handleSearch()} disabled={loading} className={styles.primaryButton}>
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> Rechercher</>}
            </button>
          </div>
          
          {/* Quick Access Batteries */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-gray-400 self-center">Batteries de test :</span>
            {['BP-2024-CATL-001', 'BP-2024-LG-002', 'BP-2024-BYD-003'].map(id => (
              <button 
                key={id} 
                onClick={() => { setBatteryId(id); handleSearch(id); }} 
                className={`${styles.glassButton} text-xs`}
              >
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
                
                {/* Health Status Banner */}
                <div className={`p-4 rounded-xl mb-4 ${
                  diagnostic.diagnostic?.healthStatus === 'CRITICAL' ? 'bg-red-500/20 border border-red-500/30' :
                  diagnostic.diagnostic?.healthStatus === 'WARNING' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                  'bg-green-500/20 border border-green-500/30'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {diagnostic.diagnostic?.healthStatus === 'CRITICAL' ? 
                      <AlertTriangle className="w-6 h-6 text-red-400" /> : 
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    }
                    <span className="font-bold text-lg">État: {diagnostic.diagnostic?.healthStatus}</span>
                  </div>
                  <p className="text-gray-300">{diagnostic.recommendation}</p>
                </div>
                
                {/* Metrics Grid */}
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
                  src={api.getQRCode(currentBattery.batteryId)} 
                  alt="QR Code"
                  className="w-32 h-32 rounded-xl bg-white p-2"
                />
                <div>
                  <p className="text-sm text-gray-400 mb-2">Scannez pour accéder au passeport</p>
                  <code className="text-xs bg-white/10 px-3 py-1 rounded-lg">
                    {currentBattery.batteryId}
                  </code>
                </div>
              </div>
            </div>

            {/* Report Section - Only show if defective */}
            {currentBattery.hasDefectiveModule && (
              <div className={`${styles.glassCard} p-6 border border-red-500/30`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Signaler comme Waste
                </h3>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Raison du signalement..."
                  className={`${styles.glassInput} min-h-[100px] resize-none mb-4`}
                />
                <button onClick={handleReport} disabled={loading} className={`${styles.dangerButton} w-full`}>
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Envoyer au Propriétaire BP</>}
                </button>
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