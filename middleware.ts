import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

const PROTECTED: Record<string, string[]> = {
  '/partner': ['PARTNER'],
  '/manager': ['MANAGER'],
  '/executive': ['EXECUTIVE'],
  '/client': ['CLIENT'],
  '/summary': ['DASHBOARD_USER'],
};

function roleToHome(role: string): string {
  switch (role) {
    case 'PARTNER': return '/partner/dashboard';
    case 'MANAGER': return '/manager/dashboard';
    case 'DASHBOARD_USER': return '/summary/dashboard';
    case 'EXECUTIVE': return '/executive/dashboard';
    case 'CLIENT': return '/client/dashboard';
    default: return '';
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('filetax_token')?.value;
  let role: string | null = null;
  if (token) {
    try {
      const p: any = jwtDecode(token);
      role = (p.role || p.user_role || '').toString().toUpperCase() || null;
    } catch {}
  }
  if (!role) {
    const roleCookie = req.cookies.get('filetax_role')?.value;
    if (roleCookie) role = roleCookie.toUpperCase();
  }
  // protect role areas
  for (const [prefix, allowedRoles] of Object.entries(PROTECTED)) {
    if (pathname.startsWith(prefix)) {
      if (!token || !role || !allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
      }
    }
  }
  // redirect authed users away from login pages
  if ((pathname === '/auth/login' || pathname === '/auth/register') && token && role) {
    const dest = roleToHome(role);
    if (dest) return NextResponse.redirect(new URL(dest, req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/partner/:path*', '/manager/:path*', '/executive/:path*', '/client/:path*', '/summary/:path*', '/auth/login', '/auth/register'],
};
