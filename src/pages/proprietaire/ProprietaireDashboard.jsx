import React, { useState, useEffect } from 'react';
import { 
  Building2, Battery, Bell, Search, AlertTriangle, CheckCircle, 
  RefreshCw, LogOut, Clock, ChevronRight, Check, X, Package
} from 'lucide-react';

// ==================== CONFIGURATION ====================
const API_BASE_URL = 'https://battery-passport-api.onrender.com';

// ==================== API ====================
const api = {
  async getAllBatteries() {
    const res = await fetch(`${API_BASE_URL}/battery/`);
    if (!res.ok) throw new Error('Failed to fetch batteries');
    return res.json();
  },
  async getBatteryFull(batteryId) {
    const res = await fetch(`${API_BASE_URL}/battery/${batteryId}/full`);
    if (!res.ok) throw new Error('Battery not found');
    return res.json();
  },
  async getNotifications() {
    const res = await fetch(`${API_BASE_URL}/notifications/`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },
  async getUnreadCount() {
    const res = await fetch(`${API_BASE_URL}/notifications/unread/count`);
    if (!res.ok) throw new Error('Failed to fetch unread count');
    return res.json();
  },
  async markAsRead(notificationId) {
    const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to mark as read');
    return res.json();
  },
  async processNotification(notificationId, newStatus) {
    const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/process`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newStatus })
    });
    if (!res.ok) throw new Error('Failed to process notification');
    return res.json();
  },
  async updateBatteryStatus(batteryId, newStatus) {
    const res = await fetch(`${API_BASE_URL}/battery/${batteryId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newStatus })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  }
};

// ==================== STYLES (Light Mode) ====================
const styles = {
  card: "bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow",
  button: "px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium transition-all hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center gap-2",
  input: "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all",
  primaryButton: "px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2",
  successButton: "px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl text-white font-medium transition-all hover:shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2",
  dangerButton: "px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 rounded-xl text-white font-medium transition-all hover:shadow-lg hover:shadow-red-500/25 flex items-center justify-center gap-2",
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

// ==================== STAT CARD ====================
const StatCard = ({ icon: Icon, label, value, color, trend }) => (
  <div className={`${styles.card} p-5`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-slate-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-slate-800">{value}</p>
    <p className="text-sm text-slate-500">{label}</p>
  </div>
);

// ==================== NOTIFICATION CARD ====================
const NotificationCard = ({ notification, onProcess, onMarkRead, loading }) => {
  const isUrgent = notification.urgency === 'high';
  const isUnread = !notification.read;
  
  return (
    <div className={`${styles.card} p-4 ${isUnread ? 'border-l-4 border-l-purple-500' : ''} ${isUrgent ? 'bg-red-50/50' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg flex-shrink-0 ${
          isUrgent ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
        }`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-800">{notification.batteryId}</span>
            {isUrgent && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                Urgent
              </span>
            )}
            {isUnread && (
              <span className="w-2 h-2 bg-purple-500 rounded-full" />
            )}
          </div>
          
          <p className="text-sm text-slate-600 mb-2">{notification.message}</p>
          
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {notification.createdAt ? new Date(notification.createdAt).toLocaleString('fr-FR') : 'N/A'}
            </span>
            <span>De: {notification.senderName || notification.senderRole}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {notification.status === 'pending' && (
            <>
              <button
                onClick={() => onProcess(notification.notificationId, 'Waste')}
                disabled={loading}
                className={styles.successButton}
                title="Valider → Waste"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => onMarkRead(notification.notificationId)}
                disabled={loading}
                className={styles.button}
                title="Ignorer"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {notification.status === 'resolved' && (
            <span className="px-3 py-1 bg-green-100 text-green-600 text-xs rounded-full font-medium">
              Traité
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== BATTERY CARD ====================
const BatteryCard = ({ battery, onSelect }) => (
  <div 
    className={`${styles.card} p-4 cursor-pointer hover:border-purple-300`}
    onClick={() => onSelect(battery)}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-100">
          <Battery className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-800">{battery.batteryId}</p>
          <p className="text-xs text-slate-500">{battery.modelName || 'N/A'}</p>
        </div>
      </div>
      <StatusBadge status={battery.status} />
    </div>
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{battery.manufacturer || 'N/A'}</span>
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </div>
  </div>
);

// ==================== MAIN DASHBOARD ====================
const ProprietaireDashboard = ({ onLogout }) => {
  const [view, setView] = useState('dashboard'); // dashboard, notifications, batteries
  const [batteries, setBatteries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedBattery, setSelectedBattery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Charger les données
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bats, notifs, unread] = await Promise.all([
        api.getAllBatteries(),
        api.getNotifications(),
        api.getUnreadCount()
      ]);
      setBatteries(bats);
      setNotifications(Array.isArray(notifs) ? notifs : []);
      setUnreadCount(unread?.unreadCount || 0);
    } catch (err) {
      console.error('Error loading data:', err);
      showToast('Erreur de chargement', 'error');
    }
    setLoading(false);
  };

  // Traiter une notification (valider → Waste)
  const handleProcessNotification = async (notificationId, newStatus) => {
    setLoading(true);
    try {
      await api.processNotification(notificationId, newStatus);
      showToast('Statut mis à jour avec succès !', 'success');
      await loadData();
    } catch (err) {
      showToast('Erreur lors du traitement', 'error');
    }
    setLoading(false);
  };

  // Marquer comme lu
  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.markAsRead(notificationId);
      await loadData();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Changer le statut d'une batterie
  const handleChangeStatus = async (batteryId, newStatus) => {
    setLoading(true);
    try {
      await api.updateBatteryStatus(batteryId, newStatus);
      showToast(`Statut changé vers ${newStatus}`, 'success');
      setSelectedBattery(null);
      await loadData();
    } catch (err) {
      showToast('Erreur lors du changement de statut', 'error');
    }
    setLoading(false);
  };

  // Stats
  const stats = {
    total: batteries.length,
    original: batteries.filter(b => b.status === 'Original').length,
    waste: batteries.filter(b => b.status === 'Waste' || b.status === 'Signaled As Waste').length,
    processed: batteries.filter(b => b.status === 'Reused' || b.status === 'Repurposed').length,
  };

  const pendingNotifications = notifications.filter(n => n.status === 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <div className={`${styles.card} p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-purple-500 shadow-lg shadow-purple-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">Propriétaire BP</h1>
              <p className="text-xs text-slate-500">Battery Passport - Gestion</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Logo */}
            <img 
              src="/logo-equipe73.png" 
              alt="Équipe 73"
              className="h-10 w-auto hidden sm:block"
            />
            
            {/* Navigation */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-xl p-1">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'notifications', label: 'Notifications', badge: unreadCount },
                { id: 'batteries', label: 'Batteries' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                    view === item.id 
                      ? 'bg-white text-purple-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setView('notifications')} 
                className={`${styles.button} relative md:hidden`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button onClick={loadData} className={styles.button} title="Actualiser">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={onLogout} className={styles.button}>
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2 mt-4 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'notifications', label: 'Notifications', badge: unreadCount },
            { id: 'batteries', label: 'Batteries' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap relative ${
                view === item.id 
                  ? 'bg-purple-100 text-purple-600' 
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {item.label}
              {item.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                icon={Battery} 
                label="Total Batteries" 
                value={stats.total} 
                color="bg-blue-100 text-blue-600" 
              />
              <StatCard 
                icon={CheckCircle} 
                label="En service" 
                value={stats.original} 
                color="bg-green-100 text-green-600" 
              />
              <StatCard 
                icon={AlertTriangle} 
                label="À traiter" 
                value={stats.waste} 
                color="bg-amber-100 text-amber-600" 
              />
              <StatCard 
                icon={Package} 
                label="Traitées" 
                value={stats.processed} 
                color="bg-purple-100 text-purple-600" 
              />
            </div>

            {/* Notifications en attente */}
            {pendingNotifications.length > 0 && (
              <div className={`${styles.card} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-purple-600" />
                    Notifications en attente ({pendingNotifications.length})
                  </h2>
                  <button 
                    onClick={() => setView('notifications')} 
                    className="text-sm text-purple-600 hover:underline"
                  >
                    Voir tout
                  </button>
                </div>
                <div className="space-y-3">
                  {pendingNotifications.slice(0, 3).map(notif => (
                    <NotificationCard 
                      key={notif.notificationId} 
                      notification={notif}
                      onProcess={handleProcessNotification}
                      onMarkRead={handleMarkAsRead}
                      loading={loading}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Batteries récentes */}
            <div className={`${styles.card} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Battery className="w-5 h-5 text-purple-600" />
                  Batteries
                </h2>
                <button 
                  onClick={() => setView('batteries')} 
                  className="text-sm text-purple-600 hover:underline"
                >
                  Voir tout
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {batteries.slice(0, 6).map(battery => (
                  <BatteryCard 
                    key={battery.batteryId} 
                    battery={battery}
                    onSelect={setSelectedBattery}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notifications View */}
        {view === 'notifications' && (
          <div className={`${styles.card} p-6`}>
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-purple-600" />
              Toutes les notifications
            </h2>
            
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucune notification</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(notif => (
                  <NotificationCard 
                    key={notif.notificationId} 
                    notification={notif}
                    onProcess={handleProcessNotification}
                    onMarkRead={handleMarkAsRead}
                    loading={loading}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Batteries View */}
        {view === 'batteries' && (
          <div className={`${styles.card} p-6`}>
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Battery className="w-5 h-5 text-purple-600" />
              Toutes les batteries ({batteries.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {batteries.map(battery => (
                <BatteryCard 
                  key={battery.batteryId} 
                  battery={battery}
                  onSelect={setSelectedBattery}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Battery Detail Modal */}
      {selectedBattery && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Détails Batterie</h3>
              <button 
                onClick={() => setSelectedBattery(null)} 
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-purple-500">
                  <Battery className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-lg text-slate-800">{selectedBattery.batteryId}</p>
                  <p className="text-sm text-slate-500">{selectedBattery.modelName || 'N/A'}</p>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={selectedBattery.status} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500">Fabricant</p>
                  <p className="font-semibold text-slate-800">{selectedBattery.manufacturer || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500">Chimie</p>
                  <p className="font-semibold text-slate-800">{selectedBattery.composition || 'N/A'}</p>
                </div>
              </div>
              
              {/* Actions de changement de statut */}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-500 mb-3">Changer le statut :</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Original', 'Waste', 'Reused', 'Repurposed'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleChangeStatus(selectedBattery.batteryId, status)}
                      disabled={loading || selectedBattery.status === status}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        selectedBattery.status === status
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      } disabled:opacity-50`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 mt-8 pb-4">
        Hackathon ESILV × Capgemini Engineering • Battery Passport PoC
      </div>
    </div>
  );
};

export default ProprietaireDashboard;