import { jwtDecode } from 'jwt-decode';

export type UserRole = 'PARTNER' | 'EXECUTIVE' | 'CLIENT';

export interface JwtPayload {
  sub?: string;
  role?: UserRole;
  user_id?: string;
  email?: string;
  exp?: number;
  [k: string]: any;
}

const TOKEN_KEY = 'filetax_token';
const USER_KEY = 'filetax_user';

export const setToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  // also cookie for middleware
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=86400; SameSite=Lax`;
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setUser = (user: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = (): any => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
};

export const decodeRole = (token: string): UserRole | null => {
  try {
    const p = jwtDecode<JwtPayload>(token);
    const r = (p.role || (p as any).user_role || '').toString().toUpperCase();
    if (r === 'PARTNER' || r === 'EXECUTIVE' || r === 'CLIENT') return r as UserRole;
    return null;
  } catch {
    return null;
  }
};

export const roleToDashboard = (role: UserRole | null): string => {
  switch (role) {
    case 'PARTNER': return '/partner/dashboard';
    case 'EXECUTIVE': return '/executive/dashboard';
    case 'CLIENT': return '/client/dashboard';
    default: return '/auth/login';
  }
};
