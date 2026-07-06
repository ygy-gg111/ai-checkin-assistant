'use client';

import {createContext, useCallback, useEffect, useMemo, useState} from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: string;
}

type AuthStatus = 'loading' | 'guest' | 'authenticated' | 'error';
type ModalMode = 'login' | 'register';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;

  // Modal control
  modalOpen: boolean;
  modalMode: ModalMode;
  registeredEmail: string;
  openAuthModal: (mode?: ModalMode) => void;
  closeAuthModal: () => void;
  setModalMode: (mode: ModalMode) => void;

  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ── Context ─────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('login');
  const [registeredEmail, setRegisteredEmail] = useState('');

  // ── Fetch current user on mount ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    void fetch('/api/auth/me')
      .then(async (response) => ({response, json: await response.json().catch(() => null)}))
      .then(({response, json}) => {
        if (cancelled) return;

        if (response.ok && json?.data?.user) {
          setUser(json.data.user);
          setStatus('authenticated');
          return;
        }

        setUser(null);
        if (response.status === 401) {
          setStatus('guest');
          const autoOpenKey = 'ai-checkin:auth-modal-auto-opened';
          if (!window.sessionStorage.getItem(autoOpenKey)) {
            window.sessionStorage.setItem(autoOpenKey, '1');
            setModalMode('login');
            setModalOpen(true);
          }
          return;
        }

        setStatus('error');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Modal helpers ───────────────────────────────────────────────────────

  const openAuthModal = useCallback((mode: ModalMode = 'login') => {
    setModalMode(mode);
    setModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setModalOpen(false);
    setRegisteredEmail('');
  }, []);

  // ── Auth actions ────────────────────────────────────────────────────────

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || '登录失败');
      }

      setUser(json.data?.user ?? null);
      setStatus('authenticated');
      setModalOpen(false);
      setRegisteredEmail('');
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password, name: name || undefined}),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || '注册失败');
      }

      // Registration successful – switch to login mode with email pre-filled
      setRegisteredEmail(email);
      setModalMode('login');
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {method: 'POST'});
    } catch {
      // Ignore network errors on logout
    }
    setUser(null);
    setStatus('guest');
    setRegisteredEmail('');
  }, []);

  // ── Value ───────────────────────────────────────────────────────────────

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      modalOpen,
      modalMode,
      registeredEmail,
      openAuthModal,
      closeAuthModal,
      setModalMode,
      login,
      register,
      logout,
    }),
    [user, status, modalOpen, modalMode, registeredEmail, openAuthModal, closeAuthModal, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
