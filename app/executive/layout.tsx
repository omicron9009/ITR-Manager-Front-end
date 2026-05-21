"use client";

import AppShell from '@/components/shared/AppShell';
import { LayoutDashboard, Users, Bell, User } from 'lucide-react';

const NAV = [
  { href: '/executive/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/executive/clients', label: 'My Clients', icon: Users },
  { href: '/executive/notifications', label: 'Notifications', icon: Bell },
  { href: '/executive/profile', label: 'Profile', icon: User },
];

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={NAV} role="EXECUTIVE" avatarHref="/executive/profile">{children}</AppShell>;
}
