import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

WebBrowser.maybeCompleteAuthSession();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    
    // Handle cold start deep links
    const handleInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        handleAuthRedirect(url);
      }
    };
    handleInitialURL();
    
    // Handle hot links
    const subscription = Linking.addEventListener('url', (event) => {
      handleAuthRedirect(event.url);
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAuthRedirect = async (url: string) => {
    // Parse session_id from URL (supports both hash and query)
    let sessionId: string | null = null;
    
    if (url.includes('#session_id=')) {
      sessionId = url.split('#session_id=')[1]?.split('&')[0];
    } else if (url.includes('?session_id=')) {
      sessionId = url.split('?session_id=')[1]?.split('&')[0];
    } else if (url.includes('session_id=')) {
      sessionId = url.split('session_id=')[1]?.split('&')[0];
    }
    
    if (sessionId) {
      await exchangeSessionId(sessionId);
    }
  };

  const exchangeSessionId = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/auth/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        await AsyncStorage.setItem('session_token', data.session_token);
        setSessionToken(data.session_token);
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error exchanging session_id:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('session_token');
      
      if (token) {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setSessionToken(token);
        } else {
          await AsyncStorage.removeItem('session_token');
          setUser(null);
          setSessionToken(null);
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      setIsLoading(true);
      
      // Create redirect URL based on platform
      const redirectUrl = Platform.OS === 'web'
        ? `${BACKEND_URL}/game-mode`
        : Linking.createURL('/game-mode');
      
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          await handleAuthRedirect(result.url);
        }
      }
    } catch (error) {
      console.error('Error during login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
      await AsyncStorage.removeItem('session_token');
      setUser(null);
      setSessionToken(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
