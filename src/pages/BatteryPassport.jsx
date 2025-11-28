import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Battery, AlertTriangle, CheckCircle, ArrowLeft, RefreshCw,
  Thermometer, Zap, Gauge, Activity, Building2, Calendar, Weight
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
  async getDiagnostic(batteryId) {
    const res = await fetch(`${API_BASE_URL}/modules/battery/${batteryId}/diagnostic`);
    if (!res.ok) throw new Error('Failed to fetch diagnostic');
    return res.json();
  }
};

// ==================== STYLES (Light Mode) ====================
const styles = {
  card: "bg-white border border-slate-200 rounded-2xl shadow-sm",
  button: "px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium transition-all hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center gap-2",
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
    <span className={`px-4 py-2 rounded-full text-sm font-bold border ${colors[status] || colors.Original}`}>
      {status}
    </span>
  );
};

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

// ==================== MAIN COMPONENT ====================
const BatteryPassport = () => {
  const { batteryId } = useParams();
  const navigate = useNavigate();
  const [battery, setBattery] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (batteryId) {
      loadBattery();
    }
  }, [batteryId]);

  const loadBattery = async () => {
    setLoading(true);
    setError(null);
    try {
      const bat = await api.getBatteryFull(batteryId);
      setBattery(bat);
      
      const diag = await api.getDiagnostic(batteryId);
      setDiagnostic(diag);
    } catch (err) {
      setError('Batterie non trouvée');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Chargement du passeport...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4">
        <div className={`${styles.card} p-8 text-center max-w-md`}>
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-slate-800">Batterie non trouvée</h1>
          <p className="text-slate-500 mb-6">L'ID "{batteryId}" ne correspond à aucune batterie enregistrée.</p>
          <button onClick={() => navigate('/')} className={styles.button}>
            <ArrowLeft className="w-5 h-5" /> Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4">
      {/* Header */}
      <div className={`${styles.card} p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20">
              <Battery className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">Battery Passport</h1>
              <p className="text-xs text-slate-500">Passeport numérique de batterie</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img 
              src="/logo-equipe73.png" 
              alt="Équipe 73"
              className="h-10 w-auto hidden sm:block"
            />
            <button onClick={() => navigate('/')} className={styles.button}>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Battery ID & Status */}
        <div className={`${styles.card} p-6`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Identifiant Batterie</p>
              <h2 className="text-2xl font-bold text-blue-600">{battery.batteryId}</h2>
              <p className="text-sm text-slate-400">{battery.batteryPassportId}</p>
            </div>
            <StatusBadge status={battery.status} />
          </div>
        </div>

        {/* Battery Info */}
        <div className={`${styles.card} p-6`}>
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800">
            <Battery className="w-5 h-5 text-blue-600" />
            Informations Générales
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <Building2 className="w-6 h-6 text-purple-500 mb-2" />
              <p className="text-xs text-slate-500 mb-1">Fabricant</p>
              <p className="font-semibold text-slate-800">{battery.manufacturer || 'N/A'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <Battery className="w-6 h-6 text-blue-500 mb-2" />
              <p className="text-xs text-slate-500 mb-1">Modèle</p>
              <p className="font-semibold text-slate-800">{battery.modelName || 'N/A'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <Zap className="w-6 h-6 text-amber-500 mb-2" />
              <p className="text-xs text-slate-500 mb-1">Chimie</p>
              <p className="font-semibold text-slate-800">{battery.composition || 'N/A'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <Weight className="w-6 h-6 text-green-500 mb-2" />
              <p className="text-xs text-slate-500 mb-1">Masse</p>
              <p className="font-semibold text-slate-800">{battery.massKg ? `${battery.massKg} kg` : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Diagnostic */}
        {diagnostic && (
          <div className={`${styles.card} p-6`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800">
              <Activity className="w-5 h-5 text-blue-600" />
              État de Santé
            </h3>
            
            <div className={`p-4 rounded-xl mb-4 ${
              diagnostic.diagnostic?.healthStatus === 'CRITICAL' ? 'bg-red-50 border border-red-200' :
              diagnostic.diagnostic?.healthStatus === 'WARNING' ? 'bg-amber-50 border border-amber-200' :
              'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center gap-3">
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
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <Gauge className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">SOH Moyen</p>
                <p className="text-xl font-bold text-slate-800">{diagnostic.diagnostic?.avgSoh?.toFixed(1)}%</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Modules Défaillants</p>
                <p className="text-xl font-bold text-slate-800">{diagnostic.diagnostic?.defectiveModules}/{diagnostic.diagnostic?.totalModules}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <Thermometer className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Température</p>
                <p className="text-xl font-bold text-slate-800">{diagnostic.diagnostic?.avgTemperature?.toFixed(1)}°C</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <Zap className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Voltage</p>
                <p className="text-xl font-bold text-slate-800">{diagnostic.diagnostic?.avgVoltage?.toFixed(2)}V</p>
              </div>
            </div>
          </div>
        )}

        {/* Modules */}
        {battery.modules?.length > 0 && (
          <div className={`${styles.card} p-6`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800">
              Modules ({battery.modules.length})
              {battery.hasDefectiveModule && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                  {battery.defectiveModulesCount || battery.modules.filter(m => m.isDefective).length} défaillant(s)
                </span>
              )}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {battery.modules.map((module) => <ModuleCard key={module.moduleId} module={module} />)}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 py-4">
          <p>Battery Passport - Règlement UE 2023/1542</p>
          <p className="text-xs mt-1 text-slate-400">Hackathon ESILV × Capgemini Engineering</p>
        </div>
      </div>
    </div>
  );
};

export default BatteryPassport;