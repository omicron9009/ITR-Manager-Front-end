"use client";

import AppShell from '@/components/shared/AppShell';
import { LayoutDashboard, Users, Shield, Layout, FileText, Bell, FileCheck, Mail, Tags, User, KeyRound, ClipboardList, UserCog, Star, MessageSquare, UserPlus } from 'lucide-react';

const NAV = [
  { href: '/partner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/partner/action-items', label: 'Action Items', icon: ClipboardList },
  { href: '/partner/clients', label: 'Clients', icon: Users },
  { href: '/partner/create-client', label: 'Create Client', icon: UserPlus },
  { href: '/partner/feedback', label: 'Client Feedback', icon: Star },
  { href: '/partner/executives', label: 'Executives(Articles)', icon: Shield },
  { href: '/partner/managers', label: 'Managers', icon: UserCog },
  { href: '/partner/executives/tags', label: 'Management', icon: Tags },
  { href: '/partner/document-types', label: 'Document Checklist', icon: FileCheck },
  { href: '/partner/form-builder', label: 'Form Builder', icon: Layout },
  { href: '/partner/email-config', label: 'Email Config', icon: Mail },
  { href: '/partner/whatsapp-config', label: 'WhatsApp Config', icon: MessageSquare },
  { href: '/partner/notifications', label: 'Notifications', icon: Bell },
  { href: '/partner/audit', label: 'Audit Log', icon: FileText },
  { href: '/partner/recovery-codes', label: 'Recovery Codes', icon: KeyRound },
  { href: '/partner/profile', label: 'Profile', icon: User },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={NAV} role="PARTNER" avatarHref="/partner/profile">{children}</AppShell>;
}
