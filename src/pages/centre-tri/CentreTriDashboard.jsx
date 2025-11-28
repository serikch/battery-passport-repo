import React, { useState, useEffect, useRef } from 'react';
import { 
  Recycle, Battery, QrCode, Search, AlertTriangle, CheckCircle, 
  RefreshCw, LogOut, Sparkles, TrendingUp, Package, Camera, X, Upload
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

// ==================== STYLES (Light Mode) ====================
const styles = {
  card: "bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow",
  button: "px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium transition-all hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center gap-2",
  input: "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all",
  primaryButton: "px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2",
  successButton: "px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2",
};

// ==================== STATUS BADGE ====================
const StatusBadge = ({ status }) => {
  const colors = {
    'Original': 'bg-blue-50 text-blue-600 border-blue-200',
    'Signaled As Waste': 'bg-amber-50 text-amber-600 border-amber-200',
    'Waste': 'bg-red-50 text-red-600 border-red-200',
    'Reused': 'bg-green-50 text-green-600 border-green-200',
    'Repurposed': 'bg-purple-50 text-purple-600 border-purple-200'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[status] || colors.Original}`}>
      {status}
    </span>
  );
};

// ==================== TOAST ====================
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg border ${
    type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
    type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
    'bg-white border-slate-200 text-slate-700'
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
      status === 'critical' ? 'border-red-300 bg-red-50' :
      status === 'warning' ? 'border-amber-300 bg-amber-50' :
      'border-slate-200 bg-slate-50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-slate-800">{module.moduleId}</span>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          status === 'critical' ? 'bg-red-100 text-red-600' :
          status === 'warning' ? 'bg-amber-100 text-amber-600' :
          'bg-green-100 text-green-600'
        }`}>
          {status === 'critical' ? 'Critique' : status === 'warning' ? 'Attention' : 'OK'}
        </span>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Résistance</span>
          <span className="text-slate-700">{module.internalResistance?.toFixed(3)}Ω</span>
        </div>
        <div className="flex justify-between"><span className="text-slate-500">SOH</span><span className="text-slate-700">{module.soh}%</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Temp</span><span className="text-slate-700">{module.temperature}°C</span></div>
      </div>
    </div>
  );
};

// ==================== QR SCANNER MODAL ====================
const QRScannerModal = ({ isOpen, onClose, onScan }) => {
  const [manualId, setManualId] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [error, setError] = useState('');
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [isOpen]);

  const startScanner = async () => {
    setError('');
    
    if (!window.Html5Qrcode) {
      setError('Chargement du scanner... Réessayez dans 2 secondes.');
      return;
    }

    try {
      html5QrCodeRef.current = new window.Html5Qrcode("qr-reader-centre");
      
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          let batteryId = decodedText;
          if (decodedText.includes('/battery/')) {
            const match = decodedText.match(/battery\/([^\/]+)/);
            if (match) batteryId = match[1];
          } else if (decodedText.includes('BP-')) {
            const match = decodedText.match(/(BP-[\w-]+)/);
            if (match) batteryId = match[1];
          }
          
          stopScanner();
          onScan(batteryId);
          onClose();
        },
        () => {}
      );
      
      setScannerActive(true);
    } catch (err) {
      setError(`Impossible d'accéder à la caméra: ${err.message || 'Vérifiez les permissions'}`);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && scannerActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Erreur arrêt scanner:', err);
      }
    }
    setScannerActive(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !window.Html5Qrcode) return;

    setError('');

    try {
      const html5QrCode = new window.Html5Qrcode("qr-reader-file-centre");
      const result = await html5QrCode.scanFile(file, true);
      
      let batteryId = result;
      if (result.includes('/battery/')) {
        const match = result.match(/battery\/([^\/]+)/);
        if (match) batteryId = match[1];
      } else if (result.includes('BP-')) {
        const match = result.match(/(BP-[\w-]+)/);
        if (match) batteryId = match[1];
      }
      
      onScan(batteryId);
      onClose();
    } catch (err) {
      setError('Aucun QR code trouvé dans l\'image');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setManualId('');
      setError('');
    }
  }, [isOpen]);

  const handleManualSubmit = () => {
    if (manualId.trim()) {
      stopScanner();
      onScan(manualId.trim());
      setManualId('');
      onClose();
    }
  };

  const handleClose = () => {
    stopScanner();
    setManualId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Camera className="w-5 h-5 text-green-600" />
            Scanner QR Code
          </h3>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="mb-4">
          <div 
            id="qr-reader-centre" 
            className="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden"
            style={{ display: scannerActive ? 'block' : 'none' }}
          />
          <div id="qr-reader-file-centre" style={{ display: 'none' }} />
          
          {!scannerActive && (
            <div className="w-full aspect-square bg-slate-100 rounded-xl flex flex-col items-center justify-center gap-4">
              <QrCode className="w-16 h-16 text-slate-300" />
              <p className="text-slate-500 text-sm text-center">
                Cliquez sur "Activer Caméra" pour scanner
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button
            onClick={scannerActive ? stopScanner : startScanner}
            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              scannerActive 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Camera className="w-5 h-5" />
            {scannerActive ? 'Arrêter' : 'Activer Caméra'}
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-3 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Importer Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-sm text-slate-400">ou</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Entrez l'ID manuellement"
            className={styles.input}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
          <button 
            onClick={handleManualSubmit} 
            disabled={!manualId.trim()} 
            className={`${styles.primaryButton} w-full disabled:opacity-50`}
          >
            <Search className="w-5 h-5" /> Rechercher
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-400 mb-2">Batteries de test :</p>
          <div className="flex flex-wrap gap-2">
            {['BP-2024-CATL-001', 'BP-2024-LG-002', 'BP-2024-BYD-003'].map(id => (
              <button 
                key={id} 
                onClick={() => { stopScanner(); onScan(id); setManualId(''); onClose(); }} 
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-600 transition-colors"
              >
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
  <div className={`${styles.card} p-6`}>
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 shadow-lg shadow-green-500/20">
          <Battery className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-800">{battery.batteryId}</h3>
          <p className="text-sm text-slate-500">{battery.batteryPassportId}</p>
        </div>
      </div>
      <StatusBadge status={battery.status} />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="p-3 bg-slate-50 rounded-xl">
        <p className="text-xs text-slate-500 mb-1">Modèle</p>
        <p className="font-semibold text-sm text-slate-800">{battery.modelName || 'N/A'}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-xl">
        <p className="text-xs text-slate-500 mb-1">Fabricant</p>
        <p className="font-semibold text-sm text-slate-800">{battery.manufacturer || 'N/A'}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-xl">
        <p className="text-xs text-slate-500 mb-1">Chimie</p>
        <p className="font-semibold text-sm text-slate-800">{battery.composition || 'N/A'}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-xl">
        <p className="text-xs text-slate-500 mb-1">Masse</p>
        <p className="font-semibold text-sm text-slate-800">{battery.massKg ? `${battery.massKg} kg` : 'N/A'}</p>
      </div>
    </div>
    {battery.modules?.length > 0 && (
      <div>
        <h4 className="font-semibold mb-3 text-slate-800">Modules ({battery.modules.length})</h4>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <QRScannerModal 
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanResult}
      />
      
      {/* Header */}
      <div className={`${styles.card} p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 shadow-lg shadow-green-500/20">
              <Recycle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">Centre de Tri</h1>
              <p className="text-xs text-slate-500">Battery Passport - Décision</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <img 
              src="/logo-equipe73.png" 
              alt="Équipe 73"
              className="h-10 w-auto hidden sm:block"
            />
            <div className="flex gap-2">
              <button onClick={() => window.location.reload()} className={styles.button} title="Recharger">
                <RefreshCw className="w-5 h-5" />
              </button>
              <button onClick={onLogout} className={styles.button}>
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Scanner */}
        <div className={`${styles.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-100">
              <QrCode className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Scanner une batterie</h2>
          </div>
          <div className="flex gap-3 mb-4">
            <input 
              type="text" 
              value={batteryId} 
              onChange={(e) => setBatteryId(e.target.value)} 
              placeholder="BP-2024-LG-002" 
              className={`${styles.input} flex-1`}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={() => setShowScanner(true)} className={styles.button}>
              <Camera className="w-5 h-5" />
            </button>
            <button onClick={() => handleSearch()} disabled={loading} className={styles.primaryButton}>
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
          
          {wasteBatteries.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-slate-500 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Batteries en attente ({wasteBatteries.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {wasteBatteries.map(b => (
                  <button 
                    key={b.batteryId} 
                    onClick={() => handleSearch(b.batteryId)} 
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-600 transition-colors"
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
            <div className={`${styles.card} p-6 ${battery.status === 'Waste' ? 'border-2 border-green-300' : 'border-2 border-amber-300'}`}>
              <div className="flex items-center gap-4">
                {battery.status === 'Waste' ? (
                  <>
                    <div className="p-4 bg-green-100 rounded-full">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-green-700">Statut Confirmé: WASTE</h3>
                      <p className="text-slate-600">La batterie peut être traitée</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-amber-100 rounded-full">
                      <AlertTriangle className="w-8 h-8 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-amber-700">Statut Incorrect: {battery.status}</h3>
                      <p className="text-slate-600">Attendu: Waste</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <BatteryInfoCard battery={battery} />

            {/* Reception & Decision Flow */}
            {battery.status === 'Waste' && !receptionConfirmed && (
              <div className={`${styles.card} p-6 text-center`}>
                <button onClick={handleConfirmReception} disabled={loading} className={`${styles.successButton} px-8`}>
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Confirmer la Réception</>}
                </button>
              </div>
            )}

            {receptionConfirmed && !decision && (
              <div className={`${styles.card} p-6`}>
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-700">Réception Confirmée</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-slate-500 mb-2">Demande du marché</p>
                  <div className="flex gap-2">
                    {['low', 'normal', 'high'].map(level => (
                      <button 
                        key={level} 
                        onClick={() => setMarketDemand(level)}
                        className={`flex-1 py-3 rounded-xl transition-all font-medium ${
                          marketDemand === level 
                            ? 'bg-green-100 border-2 border-green-500 text-green-700' 
                            : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
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
                <div className={`${styles.card} p-8 text-center ${
                  decision.recommendation === 'Recycle' ? 'bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200' :
                  decision.recommendation === 'Reuse' ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200' :
                  decision.recommendation === 'Remanufacture' ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200' :
                  'bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200'
                }`}>
                  <div className="text-6xl mb-4">
                    {decision.recommendation === 'Recycle' ? '♻️' : decision.recommendation === 'Reuse' ? '🔄' : decision.recommendation === 'Remanufacture' ? '🔧' : '🔀'}
                  </div>
                  <h2 className={`text-3xl font-bold mb-2 ${
                    decision.recommendation === 'Recycle' ? 'text-red-700' :
                    decision.recommendation === 'Reuse' ? 'text-green-700' :
                    decision.recommendation === 'Remanufacture' ? 'text-blue-700' :
                    'text-purple-700'
                  }`}>{decision.recommendation?.toUpperCase()}</h2>
                  <p className="text-xl text-slate-600">Confiance: {decision.confidence?.toFixed(0)}%</p>
                </div>

                {/* Scores */}
                <div className={`${styles.card} p-6`}>
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Scores Détaillés
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(decision.scores || {}).sort(([,a],[,b]) => b - a).map(([opt, score]) => (
                      <div key={opt}>
                        <div className="flex justify-between mb-1">
                          <span className={opt === decision.recommendation ? 'text-green-600 font-semibold' : 'text-slate-700'}>
                            {opt} {opt === decision.recommendation && '★'}
                          </span>
                          <span className="text-slate-500">{score?.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              opt === 'Recycle' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                              opt === 'Reuse' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              opt === 'Remanufacture' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                              'bg-gradient-to-r from-purple-500 to-pink-500'
                            }`} 
                            style={{ width: `${score}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-slate-600"><strong>Justification:</strong> {decision.reasoning}</p>
                </div>

                {/* Final Decision */}
                <div className={`${styles.card} p-6`}>
                  <h3 className="font-semibold mb-4 text-slate-800">Décision Finale</h3>
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {['Recycle', 'Reuse', 'Remanufacture', 'Repurpose'].map(opt => (
                      <button 
                        key={opt} 
                        onClick={() => setFinalDecision(opt)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          finalDecision === opt ? 'border-green-500 bg-green-50' :
                          opt === decision.recommendation ? 'border-blue-300 bg-blue-50' :
                          'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-2xl block mb-2">
                          {opt === 'Recycle' ? '♻️' : opt === 'Reuse' ? '🔄' : opt === 'Remanufacture' ? '🔧' : '🔀'}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">{opt}</span>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={handleFinalDecision} 
                    disabled={!finalDecision || loading} 
                    className={`${styles.successButton} w-full disabled:opacity-50`}
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Confirmer: {finalDecision || '...'}</>}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 mt-8 pb-4">
        Hackathon ESILV × Capgemini Engineering • Battery Passport PoC
      </div>
    </div>
  );
};

export default CentreTriDashboard;