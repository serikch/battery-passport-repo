import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, Battery, QrCode, Search, AlertTriangle, CheckCircle, 
  Activity, Send, Thermometer, Zap, Gauge, RefreshCw, LogOut,
  Camera, X, ExternalLink, Upload
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

// ==================== STYLES (Light Mode) ====================
const styles = {
  card: "bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow",
  button: "px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium transition-all hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center gap-2",
  input: "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
  primaryButton: "px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2",
  dangerButton: "px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-red-500/25 flex items-center justify-center gap-2",
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
    type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
    'bg-white border-slate-200 text-slate-700'
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
          <span className={status === 'critical' ? 'text-red-600 font-medium' : 'text-slate-700'}>{module.internalResistance?.toFixed(3)}Ω</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${
              status === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-400' :
              status === 'warning' ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
              'bg-gradient-to-r from-green-500 to-green-400'
            }`}
            style={{ width: `${Math.min(ratio, 100)}%` }}
          />
        </div>
        <div className="flex justify-between"><span className="text-slate-500">SOH</span><span className="text-slate-700">{module.soh}%</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Temp</span><span className="text-slate-700">{module.temperature}°C</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Voltage</span><span className="text-slate-700">{module.voltage}V</span></div>
      </div>
    </div>
  );
};

// ==================== QR SCANNER MODAL (avec html5-qrcode) ====================
const QRScannerModal = ({ isOpen, onClose, onScan }) => {
  const [manualId, setManualId] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [error, setError] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);

  // Charger le script html5-qrcode dynamiquement
  useEffect(() => {
    if (window.Html5Qrcode) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.async = true;
    script.onload = () => {
      console.log('html5-qrcode loaded');
      setScriptLoaded(true);
    };
    script.onerror = () => {
      setError('Erreur de chargement du scanner');
    };
    document.body.appendChild(script);

    return () => {
      // Ne pas supprimer le script, il peut être réutilisé
    };
  }, []);

  // Extraire l'ID de batterie d'une URL ou texte
  const extractBatteryId = (text) => {
    // Format: https://xxx/passport/BP-2024-XXX-001
    if (text.includes('/passport/')) {
      const match = text.match(/\/passport\/(BP-[\w-]+)/);
      if (match) return match[1];
    }
    // Format: https://xxx/battery/BP-2024-XXX-001/full
    if (text.includes('/battery/')) {
      const match = text.match(/\/battery\/(BP-[\w-]+)/);
      if (match) return match[1];
    }
    // Format direct: BP-2024-XXX-001
    if (text.includes('BP-')) {
      const match = text.match(/(BP-[\w-]+)/);
      if (match) return match[1];
    }
    return text;
  };

  // Démarrer le scanner
  const startScanner = async () => {
    setError('');
    
    if (!window.Html5Qrcode) {
      setError('Scanner en cours de chargement... Réessayez.');
      return;
    }

    // S'assurer qu'il n'y a pas de scanner actif
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {}
    }

    try {
      html5QrCodeRef.current = new window.Html5Qrcode("qr-reader-garagiste");
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2
      };

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          console.log('QR Code détecté:', decodedText);
          const batteryId = extractBatteryId(decodedText);
          stopScanner();
          onScan(batteryId);
          onClose();
        },
        (errorMessage) => {
          // Ignorer les erreurs de scan normales (pas de QR détecté)
        }
      );
      
      setScannerActive(true);
    } catch (err) {
      console.error('Erreur démarrage scanner:', err);
      if (err.message?.includes('Permission')) {
        setError('Accès caméra refusé. Autorisez l\'accès dans les paramètres de votre navigateur.');
      } else if (err.message?.includes('NotFound')) {
        setError('Aucune caméra trouvée sur cet appareil.');
      } else {
        setError(`Erreur: ${err.message || 'Impossible d\'accéder à la caméra'}`);
      }
    }
  };

  // Arrêter le scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        if (state === 2) { // SCANNING
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Erreur arrêt scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setScannerActive(false);
  };

  // Scanner depuis une image uploadée
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError('');
    
    if (!window.Html5Qrcode) {
      setError('Scanner non chargé. Réessayez.');
      return;
    }

    try {
      const html5QrCode = new window.Html5Qrcode("qr-reader-file-garagiste");
      const result = await html5QrCode.scanFile(file, true);
      
      const batteryId = extractBatteryId(result);
      onScan(batteryId);
      onClose();
    } catch (err) {
      setError('Aucun QR code trouvé dans l\'image. Assurez-vous que l\'image est nette.');
    }
    
    // Reset le input file
    event.target.value = '';
  };

  // Cleanup à la fermeture
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
            <Camera className="w-5 h-5 text-blue-600" />
            Scanner QR Code
          </h3>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Zone de scan */}
        <div className="mb-4">
          <div 
            id="qr-reader-garagiste" 
            className="w-full bg-slate-100 rounded-xl overflow-hidden"
            style={{ 
              minHeight: scannerActive ? '300px' : '0px',
              display: scannerActive ? 'block' : 'none' 
            }}
          />
          <div id="qr-reader-file-garagiste" style={{ display: 'none' }} />
          
          {!scannerActive && (
            <div className="w-full aspect-square bg-slate-100 rounded-xl flex flex-col items-center justify-center gap-4 p-8">
              <QrCode className="w-20 h-20 text-slate-300" />
              <div className="text-center">
                <p className="text-slate-600 font-medium mb-1">
                  {scriptLoaded ? 'Prêt à scanner' : 'Chargement...'}
                </p>
                <p className="text-slate-400 text-sm">
                  Cliquez sur "Activer Caméra" ou importez une image
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Boutons de scan */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={scannerActive ? stopScanner : startScanner}
            disabled={!scriptLoaded}
            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              scannerActive 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Camera className="w-5 h-5" />
            {scannerActive ? 'Arrêter' : 'Activer Caméra'}
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!scriptLoaded}
            className="flex-1 py-3 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            Importer Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Séparateur */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-sm text-slate-400">ou</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Entrée manuelle */}
        <div className="space-y-3">
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Entrez l'ID (ex: BP-2024-LG-002)"
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

        {/* Batteries de test */}
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
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-500/20">
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
        <h4 className="font-semibold mb-3 flex items-center gap-2 text-slate-800">
          Modules ({battery.modules.length})
          {battery.hasDefectiveModule && (
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
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
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-500/20">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">Interface Garagiste</h1>
              <p className="text-xs text-slate-500">Battery Passport - Diagnostic</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Logo */}
            <img 
              src="/logo-equipe73.png"
              alt="Équipe 73"
              className="h-12 w-auto"
              onError={(e) => { e.target.style.display = 'none'; }}
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
        {/* Scanner Section */}
        <div className={`${styles.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <QrCode className="w-5 h-5 text-blue-600" />
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
            <button onClick={() => setShowScanner(true)} className={styles.button} title="Scanner QR Code">
              <Camera className="w-5 h-5" />
            </button>
            <button onClick={() => handleSearch()} disabled={loading} className={styles.primaryButton}>
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> Rechercher</>}
            </button>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-slate-500 self-center">Batteries de test :</span>
            {['BP-2024-CATL-001', 'BP-2024-LG-002', 'BP-2024-BYD-003'].map(id => (
              <button key={id} onClick={() => handleSearch(id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-600 transition-colors">
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
              <div className={`${styles.card} p-6`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Diagnostic
                </h3>
                
                <div className={`p-4 rounded-xl mb-4 ${
                  diagnostic.diagnostic?.healthStatus === 'CRITICAL' ? 'bg-red-50 border border-red-200' :
                  diagnostic.diagnostic?.healthStatus === 'WARNING' ? 'bg-amber-50 border border-amber-200' :
                  'bg-green-50 border border-green-200'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {diagnostic.diagnostic?.healthStatus === 'CRITICAL' ? 
                      <AlertTriangle className="w-6 h-6 text-red-600" /> : 
                      diagnostic.diagnostic?.healthStatus === 'WARNING' ?
                      <AlertTriangle className="w-6 h-6 text-amber-600" /> :
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    }
                    <span className={`font-bold text-lg ${
                      diagnostic.diagnostic?.healthStatus === 'CRITICAL' ? 'text-red-700' :
                      diagnostic.diagnostic?.healthStatus === 'WARNING' ? 'text-amber-700' :
                      'text-green-700'
                    }`}>État: {diagnostic.diagnostic?.healthStatus}</span>
                  </div>
                  <p className="text-slate-600">{diagnostic.recommendation}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <Gauge className="w-8 h-8 text-blue-600 mb-2" />
                    <p className="text-xs text-slate-500">SOH Moyen</p>
                    <p className="text-xl font-bold text-slate-800">{diagnostic.diagnostic?.avgSoh?.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                    <p className="text-xs text-slate-500">Défaillants</p>
                    <p className="text-xl font-bold text-slate-800">{diagnostic.diagnostic?.defectiveModules}/{diagnostic.diagnostic?.totalModules}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <Thermometer className="w-8 h-8 text-orange-500 mb-2" />
                    <p className="text-xs text-slate-500">Temp Moyenne</p>
                    <p className="text-xl font-bold text-slate-800">{diagnostic.diagnostic?.avgTemperature?.toFixed(1)}°C</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <Zap className="w-8 h-8 text-amber-500 mb-2" />
                    <p className="text-xs text-slate-500">Voltage Moyen</p>
                    <p className="text-xl font-bold text-slate-800">{diagnostic.diagnostic?.avgVoltage?.toFixed(2)}V</p>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code Display */}
            <div className={`${styles.card} p-6`}>
              <h3 className="font-semibold mb-4 text-slate-800">QR Code Batterie</h3>
              <div className="flex items-center gap-6">
                <img 
                  src={api.getQRCodeImage(currentBattery.batteryId)} 
                  alt="QR Code"
                  className="w-32 h-32 rounded-xl bg-white p-2 border border-slate-200"
                />
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-2">Scannez pour accéder au passeport</p>
                  <code className="text-xs bg-slate-100 px-3 py-1 rounded-lg block mb-3 text-slate-700">
                    {currentBattery.batteryId}
                  </code>
                  <a 
                    href={api.getBatteryPassportUrl(currentBattery.batteryId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.button} text-sm inline-flex`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir le passeport
                  </a>
                </div>
              </div>
            </div>

            {/* Report Section */}
            {currentBattery.hasDefectiveModule && !isAlreadySignaled && (
              <div className={`${styles.card} p-6 border-2 border-red-200`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Signaler comme Waste
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Cette action enverra une notification au Propriétaire BP qui devra confirmer le changement de statut.
                </p>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Raison du signalement..."
                  className={`${styles.input} min-h-[100px] resize-none mb-4`}
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
              <div className={`${styles.card} p-6 ${
                currentBattery.status === 'Signaled As Waste' ? 'border-2 border-amber-200' : 'border border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  {currentBattery.status === 'Signaled As Waste' ? (
                    <>
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                      <div>
                        <h3 className="font-semibold text-amber-700">Batterie signalée - En attente de confirmation</h3>
                        <p className="text-sm text-slate-600">Le Propriétaire BP doit confirmer le changement vers "Waste".</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6 text-slate-500" />
                      <div>
                        <h3 className="font-semibold text-slate-700">Batterie déjà traitée</h3>
                        <p className="text-sm text-slate-500">Statut actuel: {currentBattery.status}</p>
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
          <div className={`${styles.card} p-12 text-center`}>
            <QrCode className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg mb-2">Aucune batterie sélectionnée</p>
            <p className="text-slate-400 text-sm">Scannez un QR code ou entrez un ID pour commencer le diagnostic</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 mt-8 pb-4">
        Hackathon ESILV × Capgemini Engineering • Battery Passport PoC
      </div>
    </div>
  );
};

export default GaragisteDashboard;