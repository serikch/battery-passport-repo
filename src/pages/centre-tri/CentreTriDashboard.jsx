import React, { useState, useEffect, useRef } from 'react';
import { 
  Recycle, Battery, QrCode, Search, AlertTriangle, CheckCircle, 
  RefreshCw, LogOut, Sparkles, TrendingUp, Package, Camera, X
} from 'lucide-react';
import { useAuthStore, useBatteryStore, useDecisionStore } from '../../store';
import api from '../../services/api';

// Styles
const styles = {
  glassCard: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl",
  glassButton: "px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white font-medium transition-all hover:bg-white/10 hover:border-white/20 flex items-center justify-center gap-2",
  glassInput: "w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all",
  primaryButton: "px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2",
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
          <span>{module.internalResistance?.toFixed(3)}Ω</span>
        </div>
        <div className="flex justify-between"><span className="text-gray-400">SOH</span><span>{module.soh}%</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Temp</span><span>{module.temperature}°C</span></div>
      </div>
    </div>
  );
};

// QR Scanner Modal
const QRScannerModal = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [manualId, setManualId] = useState('');
  const [stream, setStream] = useState(null);

  useEffect(() => {
    if (isOpen) startCamera();
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setHasCamera(true);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${styles.glassCard} p-6 max-w-md w-full`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5 text-green-400" />
            Scanner QR Code
          </h3>
          <button onClick={() => { stopCamera(); onClose(); }} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="aspect-square bg-black/40 rounded-xl mb-4 relative overflow-hidden">
          {hasCamera ? (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover rounded-xl" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <Camera className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-sm">Caméra non disponible</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="BP-2024-LG-002"
            className={styles.glassInput}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
          <button onClick={handleManualSubmit} className={`${styles.primaryButton} w-full`}>
            <Search className="w-5 h-5" /> Rechercher
          </button>
        </div>
      </div>
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
        <h4 className="font-semibold mb-3">Modules ({battery.modules.length})</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {battery.modules.map((module) => <ModuleCard key={module.moduleId} module={module} />)}
        </div>
      </div>
    )}
  </div>
);

// Main Component
const CentreTriDashboard = () => {
  const { logout } = useAuthStore();
  const { currentBattery, fetchBattery, updateStatus, clearBattery } = useBatteryStore();
  const { decision, getDecision, confirmReception, clearDecision } = useDecisionStore();
  
  const [batteryId, setBatteryId] = useState('');
  const [wasteBatteries, setWasteBatteries] = useState([]);
  const [receptionConfirmed, setReceptionConfirmed] = useState(false);
  const [marketDemand, setMarketDemand] = useState('normal');
  const [finalDecision, setFinalDecision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
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

  const handleSearch = async (id = batteryId) => {
    const searchId = id || batteryId;
    if (!searchId.trim()) return;
    setLoading(true);
    try {
      await fetchBattery(searchId);
      setReceptionConfirmed(false);
      clearDecision();
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
      await confirmReception(currentBattery.batteryId, 'Centre de Tri EcoRecycle');
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
      const dec = await getDecision(currentBattery.batteryId, marketDemand);
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
      await updateStatus(currentBattery.batteryId, statusMap[finalDecision]);
      showToast(`Décision validée: ${finalDecision}`, 'success');
      clearBattery();
      clearDecision();
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
          <button onClick={logout} className={styles.glassButton}>
            <LogOut className="w-5 h-5" />
          </button>
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
                    onClick={() => { setBatteryId(b.batteryId); handleSearch(b.batteryId); }} 
                    className={`${styles.glassButton} text-xs`}
                  >
                    {b.batteryId}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {currentBattery && (
          <>
            {/* Status Verification */}
            <div className={`${styles.glassCard} p-6 ${currentBattery.status === 'Waste' ? 'border border-green-500/30' : 'border border-yellow-500/30'}`}>
              <div className="flex items-center gap-4">
                {currentBattery.status === 'Waste' ? (
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
                      <h3 className="text-xl font-bold text-yellow-400">Statut Incorrect: {currentBattery.status}</h3>
                      <p className="text-gray-300">Attendu: Waste</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <BatteryInfoCard battery={currentBattery} />

            {/* Reception & Decision Flow */}
            {currentBattery.status === 'Waste' && !receptionConfirmed && (
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