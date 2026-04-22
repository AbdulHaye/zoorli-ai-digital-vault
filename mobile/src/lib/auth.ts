import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

// Safe JSON parser — prevents "unexpected character <" when server returns HTML
const safeJson = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Expected JSON but received:', contentType, text.slice(0, 100));
    return { success: false, error: 'Server error. Please try again later.' };
  }
  try {
    return await response.json();
  } catch (e) {
    console.error('JSON parse error in auth:', e);
    return { success: false, error: 'Invalid server response. Please try again later.' };
  }
};

export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  profilePictureUrl: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    token: string;
  };
  error?: string;
}

export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await safeJson(response);

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Sign in failed',
      };
    }

    if (result.data?.token) {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, result.data.token);
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(result.data.user));
    }

    return result;
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

export const signUp = async (firstName: string, lastName: string, email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    const result = await safeJson(response);

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Sign up failed',
      };
    }

    return {
      success: true,
      message: result.message || 'Account created. Please verify your email.',
    };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

export const signOut = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(AUTH_USER_KEY);
};

export const getAuthToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
};

export const getCurrentUser = async (): Promise<User | null> => {
  const userJson = await SecureStore.getItemAsync(AUTH_USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAuthToken();
  return !!token;
};

export const refreshUser = async (): Promise<User | null> => {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const response = await fetch(`${API_URL}/api/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await safeJson(response);

    if (result.success && result.data?.user) {
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(result.data.user));
      return result.data.user;
    }

    return null;
  } catch (error) {
    console.error('Refresh user error:', error);
    return null;
  }
};
