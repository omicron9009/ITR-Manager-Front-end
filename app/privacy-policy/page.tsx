import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy – AIकर',
  description: 'Privacy Policy for AIकर - The Smartest Way to Manage ITR Filings',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">
          Please review our privacy policy below. You can also{' '}
          <a href="/privacy-policy.pdf" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
            download the PDF version
          </a>.
        </p>
        <iframe
          src="/privacy-policy.pdf"
          className="w-full h-[80vh] rounded-lg border border-slate-200"
          title="Privacy Policy – AIकर"
        />
      </div>
    </main>
  );
}
