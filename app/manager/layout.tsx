"use client";

import AppShell from '@/components/shared/AppShell';
import { LayoutDashboard, Users, Shield, FileCheck, Layout, Bell, User, ClipboardList } from 'lucide-react';

const NAV = [
  { href: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/manager/action-items', label: 'Action Items', icon: ClipboardList },
  { href: '/manager/clients', label: 'Clients', icon: Users },
  { href: '/manager/executives', label: 'Executives', icon: Shield },
  { href: '/manager/document-types', label: 'Document Checklist', icon: FileCheck },
  { href: '/manager/form-builder', label: 'Form Builder', icon: Layout },
  { href: '/manager/notifications', label: 'Notifications', icon: Bell },
  { href: '/manager/profile', label: 'Profile', icon: User },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={NAV} role="MANAGER" avatarHref="/manager/profile">{children}</AppShell>;
}
