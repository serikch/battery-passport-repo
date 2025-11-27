import axios from 'axios';

// Configuration de l'URL de l'API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://battery-passport-api.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ==================== BATTERIES ====================
export const getAllBatteries = (status = null) => {
  const params = status ? { status } : {};
  return api.get('/battery/', { params });
};

export const getBattery = (batteryId) => {
  return api.get(`/battery/${batteryId}`);
};

export const getBatteryFull = (batteryId) => {
  return api.get(`/battery/${batteryId}/full`);
};

export const updateBatteryStatus = (batteryId, newStatus, reason = '') => {
  return api.put(`/battery/${batteryId}/status`, {
    newStatus,
    reason
  });
};

export const getDefectiveBatteries = () => {
  return api.get('/battery/defective/list');
};

export const getQRCode = (batteryId, size = 10) => {
  return `${API_BASE_URL}/battery/${batteryId}/qrcode?size=${size}`;
};

// ==================== MODULES ====================
export const getModules = (batteryId) => {
  return api.get(`/modules/battery/${batteryId}`);
};

export const getDefectiveModules = (batteryId) => {
  return api.get(`/modules/battery/${batteryId}/defective`);
};

export const getDiagnostic = (batteryId) => {
  return api.get(`/modules/battery/${batteryId}/diagnostic`);
};

export const getAlerts = () => {
  return api.get('/modules/alerts');
};

export const sendTelemetry = (data) => {
  return api.post('/modules/telemetry', data);
};

export const getDecision = (batteryId, marketDemand = 'normal') => {
  return api.post(`/modules/battery/${batteryId}/decision`, null, {
    params: { market_demand: marketDemand }
  });
};

// ==================== NOTIFICATIONS ====================
export const getNotifications = (unreadOnly = false, batteryId = null, urgency = null) => {
  const params = {
    unread_only: unreadOnly,
    ...(batteryId && { battery_id: batteryId }),
    ...(urgency && { urgency })
  };
  return api.get('/notifications/', { params });
};

export const getUnreadCount = () => {
  return api.get('/notifications/unread/count');
};

export const createNotification = (data) => {
  return api.post('/notifications/', data);
};

export const markAsRead = (notificationId) => {
  return api.put(`/notifications/${notificationId}/read`);
};

export const processNotification = (notificationId, newStatus) => {
  return api.put(`/notifications/${notificationId}/process`, {
    newStatus
  });
};

export const reportWaste = (batteryId, reason, garageName) => {
  return api.post(`/notifications/report-waste/${batteryId}`, null, {
    params: { reason, garage_name: garageName }
  });
};

export const confirmReception = (batteryId, centerName) => {
  return api.post(`/notifications/confirm-reception/${batteryId}`, null, {
    params: { center_name: centerName }
  });
};

export const getBatteryHistory = (batteryId) => {
  return api.get(`/notifications/history/${batteryId}`);
};

// Export default avec toutes les méthodes
export default {
  getAllBatteries,
  getBattery,
  getBatteryFull,
  updateBatteryStatus,
  getDefectiveBatteries,
  getQRCode,
  getModules,
  getDefectiveModules,
  getDiagnostic,
  getAlerts,
  sendTelemetry,
  getDecision,
  getNotifications,
  getUnreadCount,
  createNotification,
  markAsRead,
  processNotification,
  reportWaste,
  confirmReception,
  getBatteryHistory
};