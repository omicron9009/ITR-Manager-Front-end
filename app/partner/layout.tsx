"use client";

import AppShell from '@/components/shared/AppShell';
import { LayoutDashboard, Users, Shield, Layout, FileText, Bell, FileCheck, Mail, Tags, User } from 'lucide-react';

const NAV = [
  { href: '/partner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/partner/clients', label: 'Clients', icon: Users },
  { href: '/partner/executives', label: 'Executives(Articles)', icon: Shield },
  { href: '/partner/executives/tags', label: 'Management', icon: Tags },
  { href: '/partner/document-types', label: 'Document Checklist', icon: FileCheck },
  { href: '/partner/form-builder', label: 'Form Builder', icon: Layout },
  { href: '/partner/email-config', label: 'Email Config', icon: Mail },
  { href: '/partner/notifications', label: 'Notifications', icon: Bell },
  { href: '/partner/audit', label: 'Audit Log', icon: FileText },
  { href: '/partner/profile', label: 'Profile', icon: User },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={NAV} role="PARTNER" avatarHref="/partner/profile">{children}</AppShell>;
}
