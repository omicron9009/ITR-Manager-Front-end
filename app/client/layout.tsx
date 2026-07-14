'use client';
import AppShell from '@/components/shared/AppShell';
import { LayoutDashboard, FolderOpen, Bell, BellRing, User, ClipboardList } from 'lucide-react';

const NAV = [
  { href: '/client/dashboard', label: 'My Filings', icon: LayoutDashboard },
  { href: '/client/onboarding', label: 'Onboarding', icon: ClipboardList },
  { href: '/client/documents', label: 'Documents', icon: FolderOpen },
  { href: '/client/reminders', label: 'Reminders', icon: BellRing },
  { href: '/client/notifications', label: 'Notifications', icon: Bell },
  { href: '/client/profile', label: 'Profile', icon: User },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={NAV} role="CLIENT" avatarHref="/client/profile">{children}</AppShell>;
}
