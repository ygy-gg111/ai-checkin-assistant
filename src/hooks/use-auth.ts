'use client';

import {useContext} from 'react';

import {AuthContext} from '@/contexts/auth-context';
import type {AuthContextValue} from '@/contexts/auth-context';

/**
 * Convenience hook to consume the global auth context.
 *
 * Must be used inside an `<AuthProvider>`.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
