import AppShell from '@/components/shared/AppShell';
import { LayoutDashboard, Users, Shield, Folder, Layout, FileText, Settings } from 'lucide-react';

const NAV = [
  { href: '/partner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/partner/clients', label: 'Clients', icon: Users },
  { href: '/partner/executives', label: 'Executives', icon: Shield },
  { href: '/partner/form-builder', label: 'Form Builder', icon: Layout },
  { href: '/partner/audit', label: 'Audit Log', icon: FileText },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={NAV} role="PARTNER">{children}</AppShell>;
}
