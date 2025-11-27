import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
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
  modules: [],
  diagnostic: null,
  loading: false,
  error: null,

  setCurrentBattery: (battery) => set({ currentBattery: battery }),
  
  fetchBattery: async (batteryId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getBatteryFull(batteryId);
      set({ currentBattery: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.detail || 'Battery not found', 
        loading: false,
        currentBattery: null 
      });
      throw error;
    }
  },

  fetchAllBatteries: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.getAllBatteries();
      set({ batteries: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ error: 'Failed to fetch batteries', loading: false });
      throw error;
    }
  },

  fetchDiagnostic: async (batteryId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getDiagnostic(batteryId);
      set({ diagnostic: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ error: 'Failed to fetch diagnostic', loading: false });
      throw error;
    }
  },

  updateStatus: async (batteryId, newStatus, reason = '') => {
    set({ loading: true, error: null });
    try {
      const response = await api.updateBatteryStatus(batteryId, newStatus, reason);
      // Refresh battery data
      await get().fetchBattery(batteryId);
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({ error: 'Failed to update status', loading: false });
      throw error;
    }
  },

  clearBattery: () => set({ currentBattery: null, diagnostic: null, modules: [], error: null })
}));

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (unreadOnly = false) => {
    set({ loading: true });
    try {
      const response = await api.getNotifications(unreadOnly);
      set({ notifications: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ loading: false });
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await api.getUnreadCount();
      set({ unreadCount: response.data.unreadCount || 0 });
      return response.data.unreadCount;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }
  },

  markAsRead: async (notificationId) => {
    try {
      await api.markAsRead(notificationId);
      // Refresh notifications
      await get().fetchNotifications();
      await get().fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  createNotification: async (data) => {
    try {
      const response = await api.createNotification(data);
      await get().fetchNotifications();
      return response.data;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  },

  processNotification: async (notificationId, newStatus) => {
    try {
      const response = await api.processNotification(notificationId, newStatus);
      await get().fetchNotifications();
      await get().fetchUnreadCount();
      return response.data;
    } catch (error) {
      console.error('Failed to process notification:', error);
      throw error;
    }
  },

  reportWaste: async (batteryId, reason, garageName) => {
    try {
      const response = await api.reportWaste(batteryId, reason, garageName);
      return response.data;
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
      const response = await api.getDecision(batteryId, marketDemand);
      set({ decision: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ loading: false });
      console.error('Failed to get decision:', error);
      throw error;
    }
  },

  confirmReception: async (batteryId, centerName) => {
    try {
      const response = await api.confirmReception(batteryId, centerName);
      return response.data;
    } catch (error) {
      console.error('Failed to confirm reception:', error);
      throw error;
    }
  },

  clearDecision: () => set({ decision: null })
}));