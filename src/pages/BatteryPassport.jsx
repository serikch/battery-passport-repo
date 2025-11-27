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

// ==================== STYLES ====================
const styles = {
  glassCard: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl",
  glassButton: "px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white font-medium transition-all hover:bg-white/10 hover:border-white/20 flex items-center justify-center gap-2",
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement du passeport...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className={`${styles.glassCard} p-8 text-center max-w-md`}>
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Batterie non trouvée</h1>
          <p className="text-gray-400 mb-6">L'ID "{batteryId}" ne correspond à aucune batterie enregistrée.</p>
          <button onClick={() => navigate('/')} className={styles.glassButton}>
            <ArrowLeft className="w-5 h-5" /> Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className={`${styles.glassCard} p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500">
              <Battery className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Battery Passport</h1>
              <p className="text-xs text-gray-400">Passeport numérique de batterie</p>
            </div>
          </div>
          <button onClick={() => navigate('/')} className={styles.glassButton}>
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Battery ID & Status */}
        <div className={`${styles.glassCard} p-6`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Identifiant Batterie</p>
              <h2 className="text-2xl font-bold text-cyan-400">{battery.batteryId}</h2>
              <p className="text-sm text-gray-500">{battery.batteryPassportId}</p>
            </div>
            <StatusBadge status={battery.status} />
          </div>
        </div>

        {/* Battery Info */}
        <div className={`${styles.glassCard} p-6`}>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Battery className="w-5 h-5 text-cyan-400" />
            Informations Générales
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white/5 rounded-xl">
              <Building2 className="w-6 h-6 text-purple-400 mb-2" />
              <p className="text-xs text-gray-400 mb-1">Fabricant</p>
              <p className="font-semibold">{battery.manufacturer || 'N/A'}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <Battery className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-xs text-gray-400 mb-1">Modèle</p>
              <p className="font-semibold">{battery.modelName || 'N/A'}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <Zap className="w-6 h-6 text-yellow-400 mb-2" />
              <p className="text-xs text-gray-400 mb-1">Chimie</p>
              <p className="font-semibold">{battery.composition || 'N/A'}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <Weight className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-xs text-gray-400 mb-1">Masse</p>
              <p className="font-semibold">{battery.massKg ? `${battery.massKg} kg` : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Diagnostic */}
        {diagnostic && (
          <div className={`${styles.glassCard} p-6`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              État de Santé
            </h3>
            
            <div className={`p-4 rounded-xl mb-4 ${
              diagnostic.diagnostic?.healthStatus === 'CRITICAL' ? 'bg-red-500/20 border border-red-500/30' :
              diagnostic.diagnostic?.healthStatus === 'WARNING' ? 'bg-yellow-500/20 border border-yellow-500/30' :
              'bg-green-500/20 border border-green-500/30'
            }`}>
              <div className="flex items-center gap-3">
                {diagnostic.diagnostic?.healthStatus === 'CRITICAL' ? 
                  <AlertTriangle className="w-6 h-6 text-red-400" /> : 
                  diagnostic.diagnostic?.healthStatus === 'WARNING' ?
                  <AlertTriangle className="w-6 h-6 text-yellow-400" /> :
                  <CheckCircle className="w-6 h-6 text-green-400" />
                }
                <span className="font-bold text-lg">État: {diagnostic.diagnostic?.healthStatus}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white/5 rounded-xl text-center">
                <Gauge className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">SOH Moyen</p>
                <p className="text-xl font-bold">{diagnostic.diagnostic?.avgSoh?.toFixed(1)}%</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl text-center">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Modules Défaillants</p>
                <p className="text-xl font-bold">{diagnostic.diagnostic?.defectiveModules}/{diagnostic.diagnostic?.totalModules}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl text-center">
                <Thermometer className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Température</p>
                <p className="text-xl font-bold">{diagnostic.diagnostic?.avgTemperature?.toFixed(1)}°C</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl text-center">
                <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Voltage</p>
                <p className="text-xl font-bold">{diagnostic.diagnostic?.avgVoltage?.toFixed(2)}V</p>
              </div>
            </div>
          </div>
        )}

        {/* Modules */}
        {battery.modules?.length > 0 && (
          <div className={`${styles.glassCard} p-6`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              Modules ({battery.modules.length})
              {battery.hasDefectiveModule && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
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
        <div className="text-center text-sm text-gray-500 py-4">
          <p>Battery Passport - Règlement UE 2023/1542</p>
          <p className="text-xs mt-1">Hackathon ESILV x Capgemini Engineering</p>
        </div>
      </div>
    </div>
  );
};

export default BatteryPassport;