import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

const PROTECTED: Record<string, string> = {
  '/partner': 'PARTNER',
  '/executive': 'EXECUTIVE',
  '/client': 'CLIENT',
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('filetax_token')?.value;
  let role: string | null = null;
  if (token) {
    try {
      const p: any = jwtDecode(token);
      role = (p.role || p.user_role || '').toString().toUpperCase();
    } catch {}
  }
  // protect role areas
  for (const [prefix, requiredRole] of Object.entries(PROTECTED)) {
    if (pathname.startsWith(prefix)) {
      if (!token || role !== requiredRole) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
      }
    }
  }
  // redirect authed users away from login
  if ((pathname === '/auth/login' || pathname === '/auth/register') && token && role) {
    const dest = role === 'PARTNER' ? '/partner/dashboard' : role === 'EXECUTIVE' ? '/executive/dashboard' : '/client/dashboard';
    return NextResponse.redirect(new URL(dest, req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/partner/:path*', '/executive/:path*', '/client/:path*', '/auth/login', '/auth/register'],
};
