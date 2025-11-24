import { create } from 'zustand';

interface NotificationState {
  message: string | null;
  type: 'error' | 'success' | 'info';
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
  hideToast: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  message: null,
  type: 'error',
  showToast: (message, type = 'error') => set({ message, type }),
  hideToast: () => set({ message: null }),
}));
