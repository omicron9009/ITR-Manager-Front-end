'use client';
import AppShell from '@/components/shared/AppShell';
import { LayoutDashboard, Users, Folder } from 'lucide-react';

const NAV = [
  { href: '/executive/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/executive/clients', label: 'My Clients', icon: Users },
];

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={NAV} role="EXECUTIVE">{children}</AppShell>;
}
