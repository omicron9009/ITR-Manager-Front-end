import { jwtDecode } from 'jwt-decode';

export type UserRole = 'PARTNER' | 'MANAGER' | 'EXECUTIVE' | 'CLIENT' | 'DASHBOARD_USER';

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
const ROLE_KEY = 'filetax_role';

export const setToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  // also cookie for middleware
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=86400; SameSite=Lax`;
};

export const setRole = (role: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROLE_KEY, role);
  document.cookie = `${ROLE_KEY}=${role}; path=/; max-age=86400; SameSite=Lax`;
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
  localStorage.removeItem(ROLE_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = `${ROLE_KEY}=; path=/; max-age=0`;
};

export const getIsElevated = (): boolean => {
  // Check JWT first
  const token = getToken();
  if (token) {
    try {
      const p = jwtDecode<JwtPayload>(token);
      if ((p as any).is_elevated) return true;
    } catch {}
  }
  // Fallback: check stored user object (set from /me response or login)
  const user = getUser();
  return !!(user?.is_elevated);
};

export const decodeRole = (token: string): UserRole | null => {
  try {
    const p = jwtDecode<JwtPayload>(token);
    const r = (p.role || (p as any).user_role || '').toString().toUpperCase();
    if (r === 'PARTNER' || r === 'MANAGER' || r === 'EXECUTIVE' || r === 'CLIENT' || r === 'DASHBOARD_USER') return r as UserRole;
    return null;
  } catch {
    return null;
  }
};

export const roleToDashboard = (role: UserRole | null): string => {
  switch (role) {
    case 'PARTNER': return '/partner/dashboard';
    case 'MANAGER': return '/manager/dashboard';
    case 'DASHBOARD_USER': return '/summary/leaderboard';
    case 'EXECUTIVE': return '/executive/dashboard';
    case 'CLIENT': return '/client/dashboard';
    default: return '/auth/login';
  }
};
