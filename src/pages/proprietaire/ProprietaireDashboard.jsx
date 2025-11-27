import React, { useState, useEffect } from 'react';
import { 
  Building2, Battery, Bell, LogOut, RefreshCw, CheckCircle, 
  AlertTriangle, Clock, Mail, Filter, LayoutDashboard, List,
  TrendingUp, Package, Activity, Eye
} from 'lucide-react';
import { useAuthStore, useBatteryStore, useNotificationStore, useAlertStore } from '../../store';
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

// Status Badge Component
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

// Toast Component
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

const ProprietaireDashboard = () => {
  const { logout } = useAuthStore();
  const { batteries, fetchAllBatteries, updateStatus } = useBatteryStore();
  const { notifications, unreadCount, fetchNotifications, fetchUnreadCount, processNotification } = useNotificationStore();
  const { alerts, fetchAlerts } = useAlertStore();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAllBatteries(),
        fetchNotifications(),
        fetchUnreadCount(),
        fetchAlerts()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  };

  const handleStatusChange = async (batteryId, newStatus) => {
    try {
      await updateStatus(batteryId, newStatus);
      showToast(`Statut changé vers ${newStatus}`, 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur lors du changement de statut', 'error');
    }
  };

  const handleProcessNotification = async (notificationId, newStatus) => {
    try {
      await processNotification(notificationId, newStatus);
      showToast(`Notification traitée - Statut: ${newStatus}`, 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur lors du traitement', 'error');
    }
  };

  // Statistics
  const stats = {
    total: batteries.length,
    original: batteries.filter(b => b.status === 'Original').length,
    waste: batteries.filter(b => b.status === 'Waste').length,
    reused: batteries.filter(b => b.status === 'Reused').length,
    repurposed: batteries.filter(b => b.status === 'Repurposed').length,
  };

  // Filter notifications
  const pendingNotifications = notifications.filter(n => n.status === 'pending' || !n.read);
  const allNotifications = notifications;

  return (
    <div className="min-h-screen p-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <div className={`${styles.glassCard} p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-400">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Propriétaire Battery Passport</h1>
              <p className="text-xs text-gray-400">Gestion des statuts et notifications</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('notifications')} 
              className={`relative ${styles.glassButton}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={loadData} className={styles.glassButton}>
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={logout} className={styles.glassButton}>
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { id: 'notifications', icon: Bell, label: `Notifications (${pendingNotifications.length})` },
          { id: 'batteries', icon: Battery, label: 'Batteries' },
          { id: 'alerts', icon: AlertTriangle, label: `Alertes (${alerts.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.glassButton} ${activeTab === tab.id ? 'bg-purple-500/20 border-purple-500/50' : ''}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className={`${styles.glassCard} p-4`}>
                <Battery className="w-8 h-8 text-cyan-400 mb-2" />
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-400">Total</p>
              </div>
              <div className={`${styles.glassCard} p-4`}>
                <CheckCircle className="w-8 h-8 text-blue-400 mb-2" />
                <p className="text-2xl font-bold">{stats.original}</p>
                <p className="text-sm text-gray-400">Original</p>
              </div>
              <div className={`${styles.glassCard} p-4`}>
                <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                <p className="text-2xl font-bold">{stats.waste}</p>
                <p className="text-sm text-gray-400">Waste</p>
              </div>
              <div className={`${styles.glassCard} p-4`}>
                <RefreshCw className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-2xl font-bold">{stats.reused}</p>
                <p className="text-sm text-gray-400">Reused</p>
              </div>
              <div className={`${styles.glassCard} p-4`}>
                <TrendingUp className="w-8 h-8 text-purple-400 mb-2" />
                <p className="text-2xl font-bold">{stats.repurposed}</p>
                <p className="text-sm text-gray-400">Repurposed</p>
              </div>
            </div>

            {/* Recent Notifications Preview */}
            {pendingNotifications.length > 0 && (
              <div className={`${styles.glassCard} p-6`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-400" />
                  Notifications en attente ({pendingNotifications.length})
                </h3>
                <div className="space-y-3">
                  {pendingNotifications.slice(0, 3).map((notif, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${
                      notif.urgency === 'high' ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'
                    } ${!notif.read ? 'border-l-4 border-l-purple-500' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{notif.batteryId}</p>
                          <p className="text-sm text-gray-300">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">De: {notif.senderRole} • {notif.timestamp}</p>
                        </div>
                        {notif.status === 'pending' && (
                          <button 
                            onClick={() => handleProcessNotification(notif.id, 'Waste')}
                            className={`${styles.dangerButton} text-sm py-2`}
                          >
                            → Waste
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {pendingNotifications.length > 3 && (
                  <button 
                    onClick={() => setActiveTab('notifications')}
                    className={`${styles.glassButton} w-full mt-4`}
                  >
                    Voir toutes les notifications
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className={`${styles.glassCard} p-6`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-400" />
              Toutes les Notifications ({allNotifications.length})
            </h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {allNotifications.length > 0 ? (
                allNotifications.map((notif, i) => (
                  <div key={i} className={`p-4 rounded-xl border transition-all ${
                    notif.urgency === 'high' ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'
                  } ${!notif.read ? 'border-l-4 border-l-purple-500' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-lg">{notif.batteryId}</span>
                          {notif.urgency === 'high' && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">Urgent</span>
                          )}
                          {notif.status === 'pending' && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">En attente</span>
                          )}
                          {notif.status === 'processed' && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Traité</span>
                          )}
                        </div>
                        <p className="text-gray-300 mb-2">{notif.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {notif.senderRole}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notif.timestamp || 'Récent'}
                          </span>
                        </div>
                      </div>
                      {notif.status === 'pending' && (
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => handleProcessNotification(notif.id, 'Waste')}
                            className={`${styles.dangerButton} text-sm py-2 px-4`}
                          >
                            Valider → Waste
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">Aucune notification</p>
                  <p className="text-gray-500 text-sm">Les notifications des garagistes apparaîtront ici</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Batteries Tab */}
        {activeTab === 'batteries' && (
          <div className={`${styles.glassCard} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Battery className="w-5 h-5 text-cyan-400" />
                Gestion des Batteries ({batteries.length})
              </h3>
              <div className="flex gap-2">
                {['all', 'Original', 'Waste', 'Reused', 'Repurposed'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`${styles.glassButton} text-xs ${filterStatus === status ? 'bg-purple-500/20 border-purple-500/50' : ''}`}
                  >
                    {status === 'all' ? 'Tous' : status}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {batteries
                .filter(bat => filterStatus === 'all' || bat.status === filterStatus)
                .map((bat) => (
                <div key={bat.batteryId} className="p-4 bg-white/5 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Battery className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-semibold">{bat.batteryId}</p>
                      <p className="text-sm text-gray-400">{bat.modelName || bat.batteryPassportId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={bat.status} />
                    <select 
                      onChange={(e) => e.target.value && handleStatusChange(bat.batteryId, e.target.value)}
                      className={`${styles.glassInput} py-2 px-3 text-sm w-36`}
                      defaultValue=""
                    >
                      <option value="">Changer...</option>
                      <option value="Original">Original</option>
                      <option value="Waste">Waste</option>
                      <option value="Reused">Reused</option>
                      <option value="Repurposed">Repurposed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className={`${styles.glassCard} p-6`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Alertes Actives ({alerts.length})
            </h3>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <div key={i} className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-red-400">{alert.batteryId} - Module {alert.moduleId}</p>
                        <p className="text-sm text-gray-300">
                          Résistance: {alert.resistance}Ω / max {alert.maxResistance}Ω 
                          ({alert.overloadPercent?.toFixed(0)}% surcharge)
                        </p>
                      </div>
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500/50 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Aucune alerte active</p>
                <p className="text-gray-500 text-sm">Toutes les batteries fonctionnent normalement</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProprietaireDashboard;