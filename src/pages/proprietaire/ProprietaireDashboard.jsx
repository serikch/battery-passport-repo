import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Bell, 
  Battery as BatteryIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Filter,
  LayoutDashboard,
  List,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout, { BatteryScanner, BatteryInfoCard } from '../../components/DashboardLayout';
import { useBatteryStore, useNotificationStore } from '../../store';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const ProprietaireDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [batteries, setBatteries] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);

  const { currentBattery, fetchBattery, clearBattery, updateStatus, loading } = useBatteryStore();
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    fetchUnreadCount,
    markAsRead,
    processNotification 
  } = useNotificationStore();

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [batteriesRes, alertsRes] = await Promise.all([
        api.getAllBatteries(),
        api.getAlerts()
      ]);
      setBatteries(batteriesRes.data);
      setAlerts(alertsRes.data);
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const handleBatteryFound = async (batteryId) => {
    try {
      await fetchBattery(batteryId);
      setActiveTab('battery');
      toast.success('Batterie trouvée !');
    } catch (err) {
      toast.error('Batterie non trouvée');
    }
  };

  const handleStatusChange = async (batteryId, newStatus) => {
    try {
      await updateStatus(batteryId, newStatus);
      await loadData();
      toast.success(`Statut changé vers ${newStatus}`);
    } catch (err) {
      toast.error('Erreur lors du changement de statut');
    }
  };

  const handleProcessNotification = async (notificationId, newStatus) => {
    setIsProcessing(true);
    try {
      await processNotification(notificationId, newStatus);
      await loadData();
      setSelectedNotification(null);
      toast.success('Notification traitée avec succès');
    } catch (err) {
      toast.error('Erreur lors du traitement');
    }
    setIsProcessing(false);
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: activeTab === 'dashboard', onClick: () => setActiveTab('dashboard') },
    { icon: Bell, label: `Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}`, active: activeTab === 'notifications', onClick: () => setActiveTab('notifications') },
    { icon: List, label: 'Batteries', active: activeTab === 'batteries', onClick: () => setActiveTab('batteries') }
  ];

  const filteredBatteries = statusFilter === 'all' 
    ? batteries 
    : batteries.filter(b => b.status === statusFilter);

  const stats = {
    total: batteries.length,
    original: batteries.filter(b => b.status === 'Original').length,
    waste: batteries.filter(b => b.status === 'Waste').length,
    reused: batteries.filter(b => b.status === 'Reused').length,
    repurposed: batteries.filter(b => b.status === 'Repurposed').length
  };

  return (
    <DashboardLayout
      title="Propriétaire BP"
      icon={Building2}
      gradient="from-purple-500 to-pink-400"
      navItems={navItems}
      showNotifications
    >
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Total" value={stats.total} icon={BatteryIcon} color="cyan" />
              <StatCard label="Original" value={stats.original} icon={CheckCircle} color="blue" />
              <StatCard label="Waste" value={stats.waste} icon={AlertTriangle} color="red" />
              <StatCard label="Reused" value={stats.reused} icon={RefreshCw} color="green" />
              <StatCard label="Repurposed" value={stats.repurposed} icon={ArrowRight} color="purple" />
            </div>

            {/* Scanner */}
            <BatteryScanner onBatteryFound={handleBatteryFound} />

            {/* Recent Alerts */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Alertes Actives ({alerts.length})
                </h3>
                <button onClick={loadData} className="glass-button p-2">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {alerts.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {alerts.map((alert, index) => (
                    <motion.div
                      key={`${alert.batteryId}-${alert.moduleId}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{alert.batteryId}</p>
                          <p className="text-sm text-slate-400">
                            Module {alert.moduleId}: {alert.resistance}Ω / max {alert.maxResistance}Ω
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full">
                          {alert.overloadPercent}% surcharge
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-8">
                  ✅ Aucune alerte active
                </p>
              )}
            </div>

            {/* Recent Notifications */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-400" />
                  Notifications Récentes
                </h3>
                <button 
                  onClick={() => setActiveTab('notifications')}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  Voir tout
                </button>
              </div>

              {notifications.slice(0, 3).map((notif, index) => (
                <NotificationItem 
                  key={notif.notificationId || index} 
                  notification={notif}
                  onClick={() => {
                    setSelectedNotification(notif);
                    setActiveTab('notifications');
                  }}
                />
              ))}

              {notifications.length === 0 && (
                <p className="text-center text-slate-400 py-8">
                  Aucune notification
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg">Notifications</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => fetchNotifications(true)}
                    className="glass-button text-sm"
                  >
                    Non lues uniquement
                  </button>
                  <button 
                    onClick={() => fetchNotifications(false)}
                    className="glass-button text-sm"
                  >
                    Toutes
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {notifications.map((notif, index) => (
                  <NotificationItem 
                    key={notif.notificationId || index} 
                    notification={notif}
                    expanded
                    onClick={() => setSelectedNotification(notif)}
                    onMarkRead={() => markAsRead(notif.notificationId)}
                  />
                ))}

                {notifications.length === 0 && (
                  <p className="text-center text-slate-400 py-12">
                    Aucune notification
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Batteries Tab */}
        {activeTab === 'batteries' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg">Gestion des Batteries</h3>
                <div className="flex gap-2">
                  <Filter className="w-5 h-5 text-slate-400" />
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="glass-input py-2 px-3 text-sm"
                  >
                    <option value="all">Tous</option>
                    <option value="Original">Original</option>
                    <option value="Waste">Waste</option>
                    <option value="Reused">Reused</option>
                    <option value="Repurposed">Repurposed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {filteredBatteries.map((battery) => (
                  <BatteryRow 
                    key={battery.batteryId}
                    battery={battery}
                    onStatusChange={handleStatusChange}
                    onView={() => handleBatteryFound(battery.batteryId)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Battery Detail Tab */}
        {activeTab === 'battery' && currentBattery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <button 
              onClick={() => { clearBattery(); setActiveTab('dashboard'); }}
              className="glass-button"
            >
              ← Retour
            </button>
            <BatteryInfoCard battery={currentBattery} showModules />
            
            {/* Status Change */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Changer le statut</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Original', 'Waste', 'Reused', 'Repurposed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(currentBattery.batteryId, status)}
                    disabled={currentBattery.status === status}
                    className={`glass-button py-3 ${
                      currentBattery.status === status 
                        ? 'opacity-50 cursor-not-allowed' 
                        : ''
                    } ${
                      status === 'Waste' ? 'hover:bg-red-500/20' :
                      status === 'Reused' ? 'hover:bg-green-500/20' :
                      status === 'Repurposed' ? 'hover:bg-purple-500/20' :
                      'hover:bg-blue-500/20'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Notification Modal */}
        <AnimatePresence>
          {selectedNotification && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedNotification(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card p-6 max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Traiter la notification</h3>
                  <button 
                    onClick={() => setSelectedNotification(null)}
                    className="p-2 hover:bg-white/10 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 bg-white/5 rounded-xl mb-4">
                  <p className="font-semibold mb-2">{selectedNotification.batteryId}</p>
                  <p className="text-sm text-slate-300">{selectedNotification.message}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    De: {selectedNotification.senderRole} ({selectedNotification.senderName})
                  </p>
                </div>

                {selectedNotification.status === 'pending' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-400">
                      Valider le changement de statut vers:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleProcessNotification(selectedNotification.notificationId, 'Waste')}
                        disabled={isProcessing}
                        className="glass-button danger py-3"
                      >
                        {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Waste'}
                      </button>
                      <button
                        onClick={() => handleProcessNotification(selectedNotification.notificationId, 'Reused')}
                        disabled={isProcessing}
                        className="glass-button success py-3"
                      >
                        {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Reused'}
                      </button>
                    </div>
                  </div>
                )}

                {selectedNotification.status !== 'pending' && (
                  <p className="text-center text-slate-400 py-4">
                    Cette notification a déjà été traitée
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

// Stat Card Component
const StatCard = ({ label, value, icon: Icon, color }) => {
  const colors = {
    cyan: 'from-cyan-500 to-cyan-400',
    blue: 'from-blue-500 to-blue-400',
    red: 'from-red-500 to-red-400',
    green: 'from-green-500 to-green-400',
    purple: 'from-purple-500 to-purple-400'
  };

  return (
    <div className="glass-card p-4">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
};

// Notification Item Component
const NotificationItem = ({ notification, expanded = false, onClick, onMarkRead }) => {
  const isUrgent = notification.urgency === 'high';
  
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        isUrgent 
          ? 'bg-red-500/10 border-red-500/30' 
          : 'bg-white/5 border-white/10 hover:border-white/20'
      } ${!notification.read ? 'border-l-4 border-l-purple-500' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{notification.batteryId}</span>
            {isUrgent && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                Urgent
              </span>
            )}
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            )}
          </div>
          <p className="text-sm text-slate-300">{notification.message}</p>
          {expanded && (
            <p className="text-xs text-slate-400 mt-2">
              De: {notification.senderRole} • {notification.status}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className={`text-xs px-2 py-1 rounded-full ${
            notification.status === 'pending' 
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-green-500/20 text-green-400'
          }`}>
            {notification.status}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// Battery Row Component
const BatteryRow = ({ battery, onStatusChange, onView }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const statusColors = {
    Original: 'original',
    Waste: 'waste',
    Reused: 'reused',
    Repurposed: 'repurposed'
  };

  return (
    <div className="p-4 bg-white/5 rounded-xl flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-white/10 rounded-lg">
          <BatteryIcon className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <p className="font-semibold">{battery.batteryId}</p>
          <p className="text-sm text-slate-400">
            {battery.modelName} • {battery.manufacturer}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`status-badge ${statusColors[battery.status]}`}>
          {battery.status}
        </span>
        
        <div className="relative">
          <button 
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="glass-button py-2 px-3 text-sm"
          >
            Changer
          </button>
          
          <AnimatePresence>
            {showStatusMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 z-10 glass-card p-2 min-w-[140px]"
              >
                {['Original', 'Waste', 'Reused', 'Repurposed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      onStatusChange(battery.batteryId, status);
                      setShowStatusMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
                  >
                    {status}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={onView}
          className="glass-button py-2 px-3 text-sm"
        >
          Voir
        </button>
      </div>
    </div>
  );
};

export default ProprietaireDashboard;