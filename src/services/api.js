// Configuration - Utilise l'URL de production
const API_BASE_URL = 'https://battery-passport-api.onrender.com';
const FRONTEND_BASE_URL = 'https://battery-passport-repo.onrender.com';

const api = {
  // ==================== BATTERIES ====================
  async getAllBatteries(status = null) {
    const params = status ? `?status=${status}` : '';
    const res = await fetch(`${API_BASE_URL}/battery/${params}`);
    if (!res.ok) throw new Error('Failed to fetch batteries');
    return res.json();
  },

  async getBattery(batteryId) {
    const res = await fetch(`${API_BASE_URL}/battery/${batteryId}`);
    if (!res.ok) throw new Error('Battery not found');
    return res.json();
  },

  async getBatteryFull(batteryId) {
    const res = await fetch(`${API_BASE_URL}/battery/${batteryId}/full`);
    if (!res.ok) throw new Error('Battery not found');
    return res.json();
  },

  async updateBatteryStatus(batteryId, newStatus, reason = '') {
    const res = await fetch(`${API_BASE_URL}/battery/${batteryId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newStatus, reason })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  // QR Code pointe vers l'URL de production du frontend
  getQRCode(batteryId, size = 10) {
    return `${API_BASE_URL}/battery/${batteryId}/qrcode?size=${size}`;
  },

  // URL publique pour le passeport batterie (ce que le QR code affiche)
  getBatteryPassportUrl(batteryId) {
    return `${FRONTEND_BASE_URL}/passport/${batteryId}`;
  },

  // ==================== MODULES ====================
  async getDiagnostic(batteryId) {
    const res = await fetch(`${API_BASE_URL}/modules/battery/${batteryId}/diagnostic`);
    if (!res.ok) throw new Error('Failed to fetch diagnostic');
    return res.json();
  },

  async getAlerts() {
    const res = await fetch(`${API_BASE_URL}/modules/alerts`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  async getDecision(batteryId, marketDemand = 'normal') {
    const res = await fetch(`${API_BASE_URL}/modules/battery/${batteryId}/decision?market_demand=${marketDemand}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to get decision');
    return res.json();
  },

  // ==================== NOTIFICATIONS ====================
  async getNotifications(unreadOnly = false) {
    const params = unreadOnly ? '?unread_only=true' : '';
    const res = await fetch(`${API_BASE_URL}/notifications/${params}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async getUnreadCount() {
    const res = await fetch(`${API_BASE_URL}/notifications/unread/count`);
    if (!res.ok) throw new Error('Failed to fetch unread count');
    return res.json();
  },

  async markAsRead(notificationId) {
    const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
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

  // Report waste - Met le statut à "Signaled As Waste" (pas "Waste" directement)
  async reportWaste(batteryId, reason, garageName) {
    const res = await fetch(`${API_BASE_URL}/notifications/report-waste/${batteryId}?reason=${encodeURIComponent(reason)}&garage_name=${encodeURIComponent(garageName)}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to report waste');
    return res.json();
  },

  async confirmReception(batteryId, centerName) {
    const res = await fetch(`${API_BASE_URL}/notifications/confirm-reception/${batteryId}?center_name=${encodeURIComponent(centerName)}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to confirm reception');
    return res.json();
  },

  async getBatteryHistory(batteryId) {
    const res = await fetch(`${API_BASE_URL}/notifications/history/${batteryId}`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  }
};

export default api;