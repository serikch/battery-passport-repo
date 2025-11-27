import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Recycle, 
  QrCode,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Gauge,
  TrendingUp,
  Package,
  Sparkles,
  Zap,
  Settings,
  Battery as BatteryIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout, { BatteryScanner, BatteryInfoCard } from '../../components/DashboardLayout';
import { useBatteryStore, useDecisionStore } from '../../store';
import api from '../../services/api';

const CentreTriDashboard = () => {
  const [activeTab, setActiveTab] = useState('scan');
  const [wasteBatteries, setWasteBatteries] = useState([]);
  const [receptionConfirmed, setReceptionConfirmed] = useState(false);
  const [marketDemand, setMarketDemand] = useState('normal');
  const [finalDecision, setFinalDecision] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const { currentBattery, fetchBattery, clearBattery, updateStatus, loading } = useBatteryStore();
  const { decision, getDecision, confirmReception, clearDecision, loading: decisionLoading } = useDecisionStore();

  useEffect(() => {
    loadWasteBatteries();
  }, []);

  const loadWasteBatteries = async () => {
    try {
      const response = await api.getAllBatteries('Waste');
      setWasteBatteries(response.data.filter(b => b.status === 'Waste'));
    } catch (err) {
      console.error('Error loading waste batteries:', err);
    }
  };

  const handleBatteryFound = async (batteryId) => {
    try {
      await fetchBattery(batteryId);
      setReceptionConfirmed(false);
      clearDecision();
      setFinalDecision(null);
      setActiveTab('verify');
      toast.success('Batterie trouvée !');
    } catch (err) {
      toast.error('Batterie non trouvée');
    }
  };

  const handleConfirmReception = async () => {
    if (!currentBattery) return;
    
    setIsConfirming(true);
    try {
      await confirmReception(currentBattery.batteryId, 'Centre de Tri EcoRecycle');
      setReceptionConfirmed(true);
      toast.success('Réception confirmée !');
    } catch (err) {
      toast.error('Erreur lors de la confirmation');
    }
    setIsConfirming(false);
  };

  const handleGetDecision = async () => {
    if (!currentBattery) return;
    
    try {
      await getDecision(currentBattery.batteryId, marketDemand);
      setActiveTab('decision');
    } catch (err) {
      toast.error('Erreur lors de l\'analyse');
    }
  };

  const handleFinalDecision = async () => {
    if (!finalDecision || !currentBattery) return;
    
    setIsConfirming(true);
    try {
      // Map decision to status
      const statusMap = {
        Recycle: 'Waste',
        Reuse: 'Reused',
        Remanufacture: 'Reused',
        Repurpose: 'Repurposed'
      };
      
      const newStatus = statusMap[finalDecision] || 'Waste';
      await updateStatus(currentBattery.batteryId, newStatus);
      await loadWasteBatteries();
      
      toast.success(`Décision validée: ${finalDecision}`);
      
      // Reset
      clearBattery();
      clearDecision();
      setReceptionConfirmed(false);
      setFinalDecision(null);
      setActiveTab('scan');
    } catch (err) {
      toast.error('Erreur lors de la validation');
    }
    setIsConfirming(false);
  };

  const navItems = [
    { icon: QrCode, label: 'Scanner', active: activeTab === 'scan', onClick: () => setActiveTab('scan') },
    { icon: CheckCircle, label: 'Vérification', active: activeTab === 'verify', onClick: () => setActiveTab('verify') },
    { icon: Sparkles, label: 'Décision', active: activeTab === 'decision', onClick: () => setActiveTab('decision') }
  ];

  return (
    <DashboardLayout
      title="Centre de Tri"
      icon={Recycle}
      gradient="from-green-500 to-emerald-400"
      navItems={navItems}
    >
      <div className="max-w-4xl mx-auto">
        {/* Scanner Tab */}
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

            {/* Waste Batteries Queue */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-400" />
                  Batteries en attente ({wasteBatteries.length})
                </h3>
                <button onClick={loadWasteBatteries} className="glass-button p-2">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {wasteBatteries.length > 0 ? (
                <div className="space-y-3">
                  {wasteBatteries.map((battery) => (
                    <motion.button
                      key={battery.batteryId}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => handleBatteryFound(battery.batteryId)}
                      className="w-full p-4 bg-white/5 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                          <BatteryIcon className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{battery.batteryId}</p>
                          <p className="text-sm text-slate-400">{battery.modelName}</p>
                        </div>
                      </div>
                      <span className="status-badge waste">Waste</span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-8">
                  Aucune batterie en attente de traitement
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Verification Tab */}
        {activeTab === 'verify' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {currentBattery ? (
              <>
                {/* Status Check */}
                <div className={`glass-card p-6 ${
                  currentBattery.status === 'Waste' 
                    ? 'border border-green-500/30' 
                    : 'border border-yellow-500/30'
                }`}>
                  <div className="flex items-center gap-4">
                    {currentBattery.status === 'Waste' ? (
                      <>
                        <div className="p-4 bg-green-500/20 rounded-full">
                          <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-green-400">Statut Confirmé: WASTE</h3>
                          <p className="text-slate-300">La batterie peut être traitée</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-yellow-500/20 rounded-full">
                          <AlertTriangle className="w-8 h-8 text-yellow-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-yellow-400">Statut Incorrect</h3>
                          <p className="text-slate-300">
                            Statut actuel: {currentBattery.status} - Attendu: Waste
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Battery Info */}
                <BatteryInfoCard battery={currentBattery} showModules />

                {/* Actions */}
                {currentBattery.status === 'Waste' && (
                  <div className="glass-card p-6">
                    {!receptionConfirmed ? (
                      <div className="text-center">
                        <p className="text-slate-400 mb-4">
                          Confirmez la réception de la batterie
                        </p>
                        <button
                          onClick={handleConfirmReception}
                          disabled={isConfirming}
                          className="glass-button success py-4 px-8 text-lg"
                        >
                          {isConfirming ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5 mr-2" />
                              Confirmer la Réception
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-center">
                          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                          <p className="font-semibold text-green-400">Réception Confirmée</p>
                        </div>

                        <div>
                          <label className="block text-sm text-slate-400 mb-2">
                            Demande du marché
                          </label>
                          <div className="flex gap-2">
                            {['low', 'normal', 'high'].map((level) => (
                              <button
                                key={level}
                                onClick={() => setMarketDemand(level)}
                                className={`flex-1 py-3 rounded-xl transition-all ${
                                  marketDemand === level
                                    ? 'bg-green-500/20 border border-green-500/50'
                                    : 'bg-white/5 border border-white/10 hover:border-white/20'
                                }`}
                              >
                                {level === 'low' && '📉 Faible'}
                                {level === 'normal' && '📊 Normal'}
                                {level === 'high' && '📈 Forte'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={handleGetDecision}
                          disabled={decisionLoading}
                          className="glass-button primary w-full py-4 text-lg"
                        >
                          {decisionLoading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 mr-2" />
                              Obtenir la Recommandation
                            </>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="glass-card p-8 text-center">
                <QrCode className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Scannez une batterie pour vérification</p>
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

        {/* Decision Tab */}
        {activeTab === 'decision' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {decision ? (
              <>
                {/* Recommendation Card */}
                <DecisionCard decision={decision} />

                {/* Score Details */}
                <div className="glass-card p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Scores Détaillés
                  </h3>
                  
                  <div className="space-y-4">
                    {Object.entries(decision.scores || {})
                      .sort(([,a], [,b]) => b - a)
                      .map(([option, score]) => (
                        <ScoreBar 
                          key={option} 
                          option={option} 
                          score={score} 
                          isRecommended={option === decision.recommendation}
                        />
                      ))}
                  </div>
                </div>

                {/* Reasoning */}
                <div className="glass-card p-6">
                  <h3 className="font-semibold mb-3">Justification</h3>
                  <p className="text-slate-300">{decision.reasoning}</p>
                </div>

                {/* Final Decision */}
                <div className="glass-card p-6">
                  <h3 className="font-semibold mb-4">Décision Finale</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {['Recycle', 'Reuse', 'Remanufacture', 'Repurpose'].map((option) => (
                      <button
                        key={option}
                        onClick={() => setFinalDecision(option)}
                        className={`p-4 rounded-xl border transition-all ${
                          finalDecision === option
                            ? 'border-green-500 bg-green-500/20'
                            : option === decision.recommendation
                            ? 'border-cyan-500/50 bg-cyan-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="text-2xl mb-2 block">
                          {option === 'Recycle' && '♻️'}
                          {option === 'Reuse' && '🔄'}
                          {option === 'Remanufacture' && '🔧'}
                          {option === 'Repurpose' && '🔀'}
                        </span>
                        <span className="font-semibold text-sm">{option}</span>
                        {option === decision.recommendation && (
                          <span className="block text-xs text-cyan-400 mt-1">Recommandé</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleFinalDecision}
                      disabled={!finalDecision || isConfirming}
                      className="glass-button success flex-1 py-4 disabled:opacity-50"
                    >
                      {isConfirming ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Confirmer: {finalDecision || '...'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setFinalDecision(null);
                        setActiveTab('verify');
                      }}
                      className="glass-button py-4"
                    >
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Relancer
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-card p-8 text-center">
                <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Confirmez la réception pour obtenir une recommandation</p>
                <button 
                  onClick={() => setActiveTab('verify')}
                  className="glass-button primary mt-4"
                >
                  Retour à la vérification
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

// Decision Card Component
const DecisionCard = ({ decision }) => {
  const config = {
    Recycle: { color: 'from-red-500 to-orange-500', emoji: '♻️' },
    Reuse: { color: 'from-green-500 to-emerald-500', emoji: '🔄' },
    Remanufacture: { color: 'from-blue-500 to-cyan-500', emoji: '🔧' },
    Repurpose: { color: 'from-purple-500 to-pink-500', emoji: '🔀' }
  };

  const { color, emoji } = config[decision.recommendation] || config.Recycle;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`glass-card p-8 text-center bg-gradient-to-br ${color} bg-opacity-20`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="text-6xl mb-4"
      >
        {emoji}
      </motion.div>
      <h2 className="text-3xl font-bold mb-2">{decision.recommendation?.toUpperCase()}</h2>
      <p className="text-xl text-white/80">
        Confiance: {decision.confidence?.toFixed(0)}%
      </p>
    </motion.div>
  );
};

// Score Bar Component
const ScoreBar = ({ option, score, isRecommended }) => {
  const colors = {
    Recycle: 'bg-gradient-to-r from-red-500 to-orange-500',
    Reuse: 'bg-gradient-to-r from-green-500 to-emerald-500',
    Remanufacture: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    Repurpose: 'bg-gradient-to-r from-purple-500 to-pink-500'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-medium ${isRecommended ? 'text-cyan-400' : ''}`}>
          {option} {isRecommended && '★'}
        </span>
        <span className="text-sm text-slate-400">{score?.toFixed(0)}%</span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${colors[option]}`}
        />
      </div>
    </div>
  );
};

export default CentreTriDashboard;