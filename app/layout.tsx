import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'FileTax Pro — The Smartest Way to Manage ITR Filings',
  description: 'A SaaS-grade platform for Chartered Accountants to manage the end-to-end ITR filing lifecycle for up to 2,000 clients.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
