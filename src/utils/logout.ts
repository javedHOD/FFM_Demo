import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

/** Clear session locally, notify server, no double redirect */
export const performLogout = async (): Promise<void> => {
  try {
    await authApi.logout();
  } catch {
    // ignore — token may already be invalid
  } finally {
    useAuthStore.getState().logout();
  }
};
