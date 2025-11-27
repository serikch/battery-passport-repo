import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      
      login: (role, username) => {
        set({
          user: { username, role },
          role,
          isAuthenticated: true
        });
      },
      
      logout: () => {
        set({
          user: null,
          role: null,
          isAuthenticated: false
        });
      }
    }),
    {
      name: 'auth-storage'
    }
  )
);

export const useBatteryStore = create((set, get) => ({
  currentBattery: null,
  batteries: [],
  diagnostic: null,
  loading: false,
  error: null,

  fetchBattery: async (batteryId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getBatteryFull(batteryId);
      set({ currentBattery: data, loading: false });
      return data;
    } catch (error) {
      set({ 
        error: error.message || 'Battery not found', 
        loading: false,
        currentBattery: null 
      });
      throw error;
    }
  },

  fetchAllBatteries: async (status = null) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getAllBatteries(status);
      set({ batteries: data, loading: false });
      return data;
    } catch (error) {
      set({ error: 'Failed to fetch batteries', loading: false });
      throw error;
    }
  },

  fetchDiagnostic: async (batteryId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getDiagnostic(batteryId);
      set({ diagnostic: data, loading: false });
      return data;
    } catch (error) {
      set({ error: 'Failed to fetch diagnostic', loading: false });
      throw error;
    }
  },

  updateStatus: async (batteryId, newStatus, reason = '') => {
    set({ loading: true, error: null });
    try {
      await api.updateBatteryStatus(batteryId, newStatus, reason);
      await get().fetchBattery(batteryId);
      set({ loading: false });
    } catch (error) {
      set({ error: 'Failed to update status', loading: false });
      throw error;
    }
  },

  clearBattery: () => set({ currentBattery: null, diagnostic: null, error: null })
}));

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (unreadOnly = false) => {
    set({ loading: true });
    try {
      const data = await api.getNotifications(unreadOnly);
      // Ensure data is an array
      const notifs = Array.isArray(data) ? data : [];
      set({ notifications: notifs, loading: false });
      return notifs;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ notifications: [], loading: false });
      return [];
    }
  },

  fetchUnreadCount: async () => {
    try {
      const data = await api.getUnreadCount();
      set({ unreadCount: data?.unreadCount || 0 });
      return data?.unreadCount || 0;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      set({ unreadCount: 0 });
      return 0;
    }
  },

  markAsRead: async (notificationId) => {
    try {
      await api.markAsRead(notificationId);
      await get().fetchNotifications();
      await get().fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  processNotification: async (notificationId, newStatus) => {
    try {
      await api.processNotification(notificationId, newStatus);
      await get().fetchNotifications();
      await get().fetchUnreadCount();
    } catch (error) {
      console.error('Failed to process notification:', error);
      throw error;
    }
  },

  reportWaste: async (batteryId, reason, garageName) => {
    try {
      const data = await api.reportWaste(batteryId, reason, garageName);
      return data;
    } catch (error) {
      console.error('Failed to report waste:', error);
      throw error;
    }
  }
}));

export const useDecisionStore = create((set) => ({
  decision: null,
  loading: false,

  getDecision: async (batteryId, marketDemand = 'normal') => {
    set({ loading: true });
    try {
      const data = await api.getDecision(batteryId, marketDemand);
      set({ decision: data, loading: false });
      return data;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  confirmReception: async (batteryId, centerName) => {
    try {
      return await api.confirmReception(batteryId, centerName);
    } catch (error) {
      throw error;
    }
  },

  clearDecision: () => set({ decision: null })
}));

export const useAlertStore = create((set) => ({
  alerts: [],
  loading: false,

  fetchAlerts: async () => {
    set({ loading: true });
    try {
      const data = await api.getAlerts();
      set({ alerts: Array.isArray(data) ? data : [], loading: false });
      return data;
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      set({ alerts: [], loading: false });
      return [];
    }
  }
}));