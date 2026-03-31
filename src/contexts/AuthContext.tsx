'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

export type UserRole = 'admin' | 'creator' | 'user';
export type MembershipLevel = 'free' | 'basic' | 'premium' | 'vip';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  membershipLevel: MembershipLevel;
  tokenBalance: number;
}

interface DecodedToken {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  membershipLevel: MembershipLevel;
  tokenBalance: number;
  exp: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string) => boolean;
  logout: () => void;
  loginWithGoogle: () => void;
  getToken: () => string | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const decodeToUser = (decoded: DecodedToken): User => ({
  id: decoded.userId,
  email: decoded.email,
  name: decoded.name,
  avatarUrl: decoded.avatarUrl,
  role: decoded.role || 'user',
  membershipLevel: decoded.membershipLevel || 'free',
  tokenBalance: decoded.tokenBalance || 0,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [googleReady, setGoogleReady] = useState(false);

  const TOKEN_KEY = 'onlybae:user:jwt';

  const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
  const saveToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
  const removeToken = (): void => localStorage.removeItem(TOKEN_KEY);

  const validateToken = (token: string): DecodedToken | null => {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.exp < Date.now() / 1000) return null;
      return decoded;
    } catch {
      return null;
    }
  };

  const fetchCdnCookies = (token: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${API_URL}/api/user/cdn-cookies`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    }).catch(() => {});
  };

  const login = (token: string): boolean => {
    const decoded = validateToken(token);
    if (decoded) {
      saveToken(token);
      setUser(decodeToUser(decoded));
      setIsAuthenticated(true);
      fetchCdnCookies(token);
      return true;
    }
    return false;
  };

  const logout = (): void => {
    removeToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async (): Promise<void> => {
    const token = getToken();
    if (!token) return;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const profile = json.data;
      if (profile) {
        setUser(prev => prev ? { ...prev, tokenBalance: profile.tokenBalance, membershipLevel: profile.membershipLevel, name: profile.name, avatarUrl: profile.avatarUrl } : prev);
      }
    } catch { /* ignore */ }
  };

  // Handle Google credential response
  const handleGoogleResponse = useCallback(async (response: { credential: string }) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential, portal: 'user' }),
      });

      const data = await res.json();
      if (res.ok && data.data?.token) {
        login(data.data.token);
      }
    } catch (err) {
      console.error('Google login failed:', err);
    }
  }, []);

  // Trigger Google One Tap / popup
  const loginWithGoogle = (): void => {
    const google = (window as any).google;
    if (google?.accounts?.id) {
      google.accounts.id.prompt();
    }
  };

  // Load Google Identity Services SDK
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGoogle = () => {
      const google = (window as any).google;
      if (google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });
        setGoogleReady(true);
      }
    };

    // Check if already loaded
    if ((window as any).google?.accounts?.id) {
      initGoogle();
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, [handleGoogleResponse]);

  // Init auth from stored token
  useEffect(() => {
    try {
      const storedToken = getToken();
      if (storedToken) {
        const decoded = validateToken(storedToken);
        if (decoded) {
          setUser(decodeToUser(decoded));
          setIsAuthenticated(true);
          // Fetch latest profile + CDN cookies in parallel
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
          fetch(`${API_URL}/api/user/profile`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          }).then(r => r.json()).then(json => {
            const p = json.data;
            if (p) setUser(prev => prev ? { ...prev, tokenBalance: p.tokenBalance, membershipLevel: p.membershipLevel, name: p.name, avatarUrl: p.avatarUrl } : prev);
          }).catch(() => {});
          fetchCdnCookies(storedToken);
        } else {
          removeToken();
        }
      }
    } catch {
      removeToken();
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, loginWithGoogle, getToken, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
