import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
}

export interface SessionInfo {
  id: number;
  deviceInfo?: any;
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  getSessions: () => Promise<SessionInfo[]>;
  revokeSession: (sessionId: number) => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName?: string;
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

type AuthStore = AuthState & AuthActions;

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3863';
const ACCESS_TOKEN_KEY = 'majitask_access_token';
const REFRESH_TOKEN_KEY = 'majitask_refresh_token';

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
};

// Zustand store
const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      
      setUser: (user: User | null) => set({ 
        user, 
        isAuthenticated: !!user 
      }),
      
      setTokens: (accessToken: string | null, refreshToken: string | null) => {
        set({ accessToken, refreshToken });
        
        // Also persist in localStorage for API calls
        if (accessToken) {
          localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        } else {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
        }
        
        if (refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        } else {
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      },

      clearError: () => set({ error: null }),

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });

          const { user, accessToken, refreshToken } = response;
          
          get().setUser(user);
          get().setTokens(accessToken, refreshToken);
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Login failed',
            user: null,
            isAuthenticated: false 
          });
          get().setTokens(null, null);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true, error: null });
          
          await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
          });
          
          // After successful registration, automatically log in
          await get().login(data.email, data.password);
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Registration failed' 
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          const { accessToken } = get();
          
          if (accessToken) {
            await apiCall('/auth/logout', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
          }
        } catch (error) {
          console.warn('Logout API call failed:', error);
        } finally {
          // Clear state regardless of API success
          get().setUser(null);
          get().setTokens(null, null);
          set({ error: null });
        }
      },

      refreshToken: async () => {
        try {
          const { refreshToken } = get();
          
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await apiCall('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          });

          const { user, accessToken, refreshToken: newRefreshToken } = response;
          
          get().setUser(user);
          get().setTokens(accessToken, newRefreshToken);
          
        } catch (error) {
          // If refresh fails, log out user
          get().setUser(null);
          get().setTokens(null, null);
          throw error;
        }
      },

      getSessions: async (): Promise<SessionInfo[]> => {
        const { accessToken } = get();
        
        if (!accessToken) {
          throw new Error('No access token available');
        }

        const response = await apiCall('/profile/sessions', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        return response.sessions || [];
      },

      revokeSession: async (sessionId: number) => {
        const { accessToken } = get();
        
        if (!accessToken) {
          throw new Error('No access token available');
        }

        await apiCall(`/profile/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      },

      updateProfile: async (data: ProfileUpdateData) => {
        const { accessToken } = get();
        
        if (!accessToken) {
          throw new Error('No access token available');
        }

        const response = await apiCall('/profile', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(data),
        });

        // Update user in state
        get().setUser(response.user);
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        const { accessToken } = get();
        
        if (!accessToken) {
          throw new Error('No access token available');
        }

        await apiCall('/profile/password', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
      },
    }),
    {
      name: 'majitask-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Token refresh logic
let refreshPromise: Promise<void> | null = null;
let refreshTimer: NodeJS.Timeout | null = null;

const scheduleTokenRefresh = () => {
  const { accessToken } = useAuthStore.getState();
  
  if (!accessToken) return;
  
  try {
    // Decode JWT to get expiry (simplified - in production use a proper JWT library)
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;
    
    // Refresh 1 minute before expiry
    const refreshTime = Math.max(timeUntilExpiry - 60 * 1000, 0);
    
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    
    refreshTimer = setTimeout(async () => {
      if (!refreshPromise) {
        refreshPromise = useAuthStore.getState().refreshToken();
      }
      
      try {
        await refreshPromise;
        scheduleTokenRefresh(); // Schedule next refresh
      } catch (error) {
        console.error('Auto token refresh failed:', error);
      } finally {
        refreshPromise = null;
      }
    }, refreshTime);
    
  } catch (error) {
    console.error('Failed to schedule token refresh:', error);
  }
};

// Context
const AuthContext = createContext<AuthStore | null>(null);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const store = useAuthStore();

  useEffect(() => {
    // Schedule token refresh when component mounts or token changes
    if (store.accessToken) {
      scheduleTokenRefresh();
    }
    
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [store.accessToken]);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (storedAccessToken && storedRefreshToken && !store.accessToken) {
      store.setTokens(storedAccessToken, storedRefreshToken);
      // Try to refresh token to validate it
      store.refreshToken().catch(() => {
        // If refresh fails, clear tokens
        store.setTokens(null, null);
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={store}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthStore => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Helper hook for authenticated API calls
export const useAuthenticatedFetch = () => {
  const { accessToken, refreshToken: refreshTokenFn } = useAuth();
  
  return async (endpoint: string, options: RequestInit = {}) => {
    let token = accessToken;
    
    // If no token, throw error
    if (!token) {
      throw new Error('No access token available');
    }
    
    // Try the request
    try {
      return await apiCall(endpoint, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
    } catch (error) {
      // If 401, try to refresh token and retry
      if (error instanceof Error && error.message.includes('401')) {
        try {
          await refreshTokenFn();
          const { accessToken: newToken } = useAuthStore.getState();
          
          return await apiCall(endpoint, {
            ...options,
            headers: {
              Authorization: `Bearer ${newToken}`,
              ...options.headers,
            },
          });
        } catch (refreshError) {
          // If refresh also fails, throw original error
          throw error;
        }
      }
      
      throw error;
    }
  };
};

export default useAuth;
