import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Send,
  Battery as BatteryIcon,
  Thermometer,
  Zap,
  Gauge,
  QrCode,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout, { BatteryScanner, BatteryInfoCard } from '../../components/DashboardLayout';
import { useBatteryStore, useNotificationStore } from '../../store';
import api from '../../services/api';

const GaragisteDashboard = () => {
  const [activeTab, setActiveTab] = useState('scan');
  const [diagnostic, setDiagnostic] = useState(null);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const { currentBattery, fetchBattery, clearBattery, loading, error } = useBatteryStore();
  const { reportWaste } = useNotificationStore();

  const handleBatteryFound = async (batteryId) => {
    try {
      await fetchBattery(batteryId);
      // Fetch diagnostic too
      const diagResponse = await api.getDiagnostic(batteryId);
      setDiagnostic(diagResponse.data);
      setActiveTab('diagnostic');
      toast.success('Batterie trouvée !');
    } catch (err) {
      toast.error('Batterie non trouvée');
    }
  };

  const handleReportWaste = async () => {
    if (!currentBattery || !reportReason.trim()) {
      toast.error('Veuillez entrer une raison');
      return;
    }

    setIsReporting(true);
    try {
      await reportWaste(currentBattery.batteryId, reportReason, 'Garage Auto Plus');
      toast.success('Notification envoyée au Propriétaire BP !');
      setReportReason('');
    } catch (err) {
      toast.error('Erreur lors de l\'envoi');
    }
    setIsReporting(false);
  };

  const navItems = [
    { icon: QrCode, label: 'Scanner', active: activeTab === 'scan', onClick: () => { clearBattery(); setActiveTab('scan'); }},
    { icon: Activity, label: 'Diagnostic', active: activeTab === 'diagnostic', onClick: () => setActiveTab('diagnostic') },
    { icon: AlertTriangle, label: 'Signaler', active: activeTab === 'report', onClick: () => setActiveTab('report') }
  ];

  return (
    <DashboardLayout
      title="Interface Garagiste"
      icon={Wrench}
      gradient="from-blue-500 to-cyan-400"
      navItems={navItems}
    >
      <div className="max-w-6xl mx-auto">
        {/* Scanner Section */}
        {activeTab === 'scan' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <BatteryScanner 
              onBatteryFound={handleBatteryFound}
              placeholder="BP-2024-LG-002"
            />

            {/* Quick Access */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Batteries récentes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['BP-2024-CATL-001', 'BP-2024-LG-002', 'BP-2024-BYD-003'].map((id) => (
                  <button
                    key={id}
                    onClick={() => handleBatteryFound(id)}
                    className="glass-button p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <BatteryIcon className="w-5 h-5 text-cyan-400" />
                      <span className="font-mono text-sm">{id}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Diagnostic Section */}
        {activeTab === 'diagnostic' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="spinner" />
              </div>
            ) : error ? (
              <div className="glass-card p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-slate-400">{error}</p>
                <button 
                  onClick={() => setActiveTab('scan')}
                  className="glass-button primary mt-4"
                >
                  Scanner une batterie
                </button>
              </div>
            ) : currentBattery ? (
              <>
                {/* Battery Info */}
                <BatteryInfoCard battery={currentBattery} showModules />

                {/* Diagnostic Summary */}
                {diagnostic && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6"
                  >
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-cyan-400" />
                      Diagnostic
                    </h3>

                    {/* Health Status */}
                    <div className={`p-4 rounded-xl mb-6 ${
                      diagnostic.diagnostic?.healthStatus === 'CRITICAL'
                        ? 'bg-red-500/20 border border-red-500/30'
                        : diagnostic.diagnostic?.healthStatus === 'WARNING'
                        ? 'bg-yellow-500/20 border border-yellow-500/30'
                        : diagnostic.diagnostic?.healthStatus === 'FAIR'
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'bg-green-500/20 border border-green-500/30'
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        {diagnostic.diagnostic?.healthStatus === 'CRITICAL' ? (
                          <AlertTriangle className="w-6 h-6 text-red-400" />
                        ) : diagnostic.diagnostic?.healthStatus === 'WARNING' ? (
                          <AlertTriangle className="w-6 h-6 text-yellow-400" />
                        ) : (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        )}
                        <span className="font-bold text-lg">
                          État: {diagnostic.diagnostic?.healthStatus}
                        </span>
                      </div>
                      <p className="text-slate-300">{diagnostic.recommendation}</p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <MetricCard
                        icon={Gauge}
                        label="SOH Moyen"
                        value={`${diagnostic.diagnostic?.avgSoh?.toFixed(1)}%`}
                        color={diagnostic.diagnostic?.avgSoh < 70 ? 'red' : diagnostic.diagnostic?.avgSoh < 80 ? 'yellow' : 'green'}
                      />
                      <MetricCard
                        icon={AlertTriangle}
                        label="Modules Défaillants"
                        value={`${diagnostic.diagnostic?.defectiveModules}/${diagnostic.diagnostic?.totalModules}`}
                        color={diagnostic.diagnostic?.defectiveModules > 0 ? 'red' : 'green'}
                      />
                      <MetricCard
                        icon={Thermometer}
                        label="Temp. Moyenne"
                        value={`${diagnostic.diagnostic?.avgTemperature?.toFixed(1)}°C`}
                        color={diagnostic.diagnostic?.avgTemperature > 40 ? 'red' : 'green'}
                      />
                      <MetricCard
                        icon={Zap}
                        label="Voltage Moyen"
                        value={`${diagnostic.diagnostic?.avgVoltage?.toFixed(2)}V`}
                        color="blue"
                      />
                    </div>

                    {/* Action Button */}
                    {currentBattery.hasDefectiveModule && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                      >
                        <p className="text-red-400 font-semibold mb-3">
                          ⚠️ Batterie hors d'usage détectée
                        </p>
                        <button
                          onClick={() => setActiveTab('report')}
                          className="glass-button danger"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Signaler au Propriétaire BP
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* QR Code */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6"
                >
                  <h3 className="font-semibold mb-4">QR Code Batterie</h3>
                  <div className="flex items-center gap-6">
                    <img 
                      src={api.getQRCode(currentBattery.batteryId)} 
                      alt="QR Code"
                      className="w-32 h-32 rounded-xl bg-white p-2"
                    />
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Scannez pour accéder au passeport</p>
                      <code className="text-xs bg-white/10 px-3 py-1 rounded-lg">
                        {currentBattery.batteryId}
                      </code>
                    </div>
                  </div>
                </motion.div>
              </>
            ) : (
              <div className="glass-card p-8 text-center">
                <QrCode className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Scannez une batterie pour voir le diagnostic</p>
                <button 
                  onClick={() => setActiveTab('scan')}
                  className="glass-button primary mt-4"
                >
                  Scanner
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Report Section */}
        {activeTab === 'report' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {currentBattery ? (
              <>
                <BatteryInfoCard battery={currentBattery} />

                <div className="glass-card p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    Signaler comme Waste
                  </h3>

                  {currentBattery.hasDefectiveModule && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
                      <p className="text-red-400 text-sm">
                        {currentBattery.defectiveModulesCount} module(s) défaillant(s) détecté(s):
                        {' '}
                        {currentBattery.modules
                          .filter(m => m.isDefective)
                          .map(m => m.moduleId)
                          .join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Raison du signalement
                      </label>
                      <textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Décrivez le problème constaté..."
                        className="glass-input min-h-[120px] resize-none"
                        defaultValue={currentBattery.hasDefectiveModule 
                          ? `Module(s) défaillant(s): ${currentBattery.modules.filter(m => m.isDefective).map(m => m.moduleId).join(', ')} - Résistance interne critique`
                          : ''
                        }
                      />
                    </div>

                    <button
                      onClick={handleReportWaste}
                      disabled={isReporting || !reportReason.trim()}
                      className="glass-button danger w-full py-4 text-base disabled:opacity-50"
                    >
                      {isReporting ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Envoyer au Propriétaire BP
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-card p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Scannez d'abord une batterie</p>
                <button 
                  onClick={() => setActiveTab('scan')}
                  className="glass-button primary mt-4"
                >
                  Scanner
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

// Metric Card Component
const MetricCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    red: 'text-red-400 bg-red-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/20',
    green: 'text-green-400 bg-green-500/20',
    blue: 'text-cyan-400 bg-cyan-500/20'
  };

  return (
    <div className="p-4 bg-white/5 rounded-xl">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
};

export default GaragisteDashboard;