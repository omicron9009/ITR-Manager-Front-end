'use client';
import AppShell from '@/components/shared/AppShell';
import { LayoutDashboard, FolderOpen, User } from 'lucide-react';

const NAV = [
  { href: '/client/dashboard', label: 'My Filings', icon: LayoutDashboard },
  { href: '/client/documents', label: 'Documents', icon: FolderOpen },
  { href: '/client/profile', label: 'Profile', icon: User },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={NAV} role="CLIENT" avatarHref="/client/profile">{children}</AppShell>;
}
