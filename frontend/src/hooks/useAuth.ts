/**
 * useAuth — Kimlik doğrulama işlemleri için hook
 * Zustand store üzerinden authApi entegrasyonu sağlar
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import type { User } from '@/store/useAppStore';

type RegisterDto = any;

export function useAuth() {
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const login = useAppStore(state => state.login);
  const register = useAppStore(state => state.register);
  const logout = useAppStore(state => state.logout);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err?.message ?? 'Giriş başarısız. Bilgilerinizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (dto: RegisterDto) => {
    setIsLoading(true);
    setError(null);
    try {
      await register(dto);
      router.push('/');
    } catch (err: any) {
      setError(err?.message ?? 'Kayıt başarısız. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    clearError: () => setError(null),
  };
}
