// @ts-nocheck
'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle2, ShieldCheck, Bell, FolderOpen, ArrowLeft, ArrowRight, Briefcase, Home, TrendingUp, Building2, Coins, HelpCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerClient } from '@/lib/api';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import GlobalFooter from '@/components/shared/GlobalFooter';
import AuthHeader from '@/components/shared/AuthHeader';

const REFERRAL_OPTIONS = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'FRIEND_RELATIVE', label: 'Friend / Relative' },
  { value: 'PROFESSIONAL_REFERRAL', label: 'Professional Referral' },
  { value: 'DIRECTED_BY_FIRM', label: 'Directed by Firm' },
  { value: 'OTHER', label: 'Other' },
] as const;

/* Step 1 schema — basic info only */
const step1Schema = z.object({
  first_name: z.string().min(2, 'Enter your first name'),
  last_name: z.string().min(2, 'Enter your last name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters'),
  confirm: z.string(),
  phone_number: z.string().min(1, 'Phone number is required').regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  /* Step 1 form */
  const { register, handleSubmit, formState: { errors }, getValues } = useForm({ resolver: zodResolver(step1Schema) });

  /* Step 2 state — income heads + declaration */
  const [incomeHeads, setIncomeHeads] = useState({
    salary: false,
    esop: false,
    rental_income: false,
    more_than_2_properties: false,
    capital_gain_shares: false,
    capital_gain_land: false,
    business_profession: false,
    interest_dividend: false,
    foreign_assets: false,
    any_other: false,
  });
  const [anyOtherText, setAnyOtherText] = useState('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  /* City */
  const [city, setCity] = useState('');

  /* Step 3 state — referral source */
  const [referralSource, setReferralSource] = useState('');
  const [referralSourceOther, setReferralSourceOther] = useState('');

  const toggleHead = (key: string) => setIncomeHeads((prev) => ({ ...prev, [key]: !prev[key] }));

  /* Step 1 → Step 2 */
  const onStep1Next = () => {
    setErr('');
    setStep(2);
  };

  /* Step 2 → Step 3 */
  const onStep2Next = () => {
    setErr('');
    const anySelected = Object.values(incomeHeads).some(Boolean);
    if (!anySelected) {
      setErr('Please select at least one income source to continue.');
      return;
    }
    if (incomeHeads.any_other && !anyOtherText.trim()) {
      setErr('Please specify the other income / deduction.');
      return;
    }
    if (!declarationAccepted) return;
    setStep(3);
  };

  /* Final submit */
  const onFinalSubmit = async () => {
    setErr('');
    if (!referralSource) {
      setErr('Please select how you heard about us.');
      return;
    }
    if (referralSource === 'OTHER' && !referralSourceOther.trim()) {
      setErr('Please mention the source.');
      return;
    }
    setSubmitting(true);
    try {
      const vals = getValues();
      await registerClient({
        full_name: `${vals.first_name.trim()} ${vals.last_name.trim()}`,
        email: vals.email,
        password: vals.password,
        phone_number: vals.phone_number || undefined,
        declaration_accepted: true,
        ...incomeHeads,
        any_other_text: incomeHeads.any_other ? anyOtherText.trim() || null : null,
        city: city.trim() || null,
        referral_source: referralSource,
        referral_source_other: referralSource === 'OTHER' ? referralSourceOther.trim() : null,
      });
      setDone(true);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || 'Registration failed.');
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col">
        <AuthHeader activePage="register" />
        <main className="flex-1 flex items-center justify-center px-4 py-12 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/bg-dark.png')" }}>
          <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100 p-10 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto"><CheckCircle2 className="h-8 w-8" /></div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900">Registration submitted!</h2>
            <p className="mt-2 text-sm text-slate-600">Your account is under verification. We&rsquo;ll email you once it&rsquo;s activated by the CA team.</p>
            <Link href="/auth/login"><Button className="mt-6 bg-indigo-600 hover:bg-indigo-700">Back to Login</Button></Link>
          </div>
        </main>
        <GlobalFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader activePage="register" />

      <main className="flex-1 flex items-center justify-center px-4 py-12 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/bg-dark.png')" }}>
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: About section */}
          <div className="hidden lg:block space-y-6">
            <h2 className="text-3xl font-bold text-slate-900 leading-tight">
              The smartest way to manage <span className="text-indigo-600">ITR filings</span>
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Upload your documents, track every step in real time, and approve your computation with one click. Your CA handles the rest — no more endless emails, calls, or WhatsApp follow-ups.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><ShieldCheck className="h-4 w-4" /></span>
                Bank-grade security for all your documents
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><Bell className="h-4 w-4" /></span>
                Real-time notifications at every filing stage
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><FolderOpen className="h-4 w-4" /></span>
                Secure document vault with instant access
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="flex items-center mb-6 lg:hidden">
                <Image src="/darklogo1.png" alt="ITR Manager" width={180} height={60} className="h-12 w-auto object-contain" />
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-5">
                <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
                <div className={`flex-1 h-0.5 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
                <div className={`flex-1 h-0.5 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</div>
              </div>

              {/* ──────────── STEP 1: Basic Info ──────────── */}
              {step === 1 && (
                <>
                  <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
                  <p className="mt-1 text-sm text-slate-500">Register to start filing your ITR with your CA.</p>
                  <form onSubmit={handleSubmit(onStep1Next)} className="mt-6 space-y-4">
                    {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{err}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>First Name <span className="text-rose-500">*</span></Label>
                        <Input {...register('first_name')} placeholder="Rajesh" className="mt-1.5" />
                        {errors.first_name && <p className="text-xs text-rose-600 mt-1">{errors.first_name.message as string}</p>}
                      </div>
                      <div>
                        <Label>Last Name <span className="text-rose-500">*</span></Label>
                        <Input {...register('last_name')} placeholder="Kumar" className="mt-1.5" />
                        {errors.last_name && <p className="text-xs text-rose-600 mt-1">{errors.last_name.message as string}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Email</Label>
                        <Input type="email" {...register('email')} placeholder="you@example.com" className="mt-1.5" />
                        {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email.message as string}</p>}
                      </div>
                      <div>
                        <Label>Phone <span className="text-rose-500">*</span></Label>
                        <Input {...register('phone_number')} placeholder="9876543210" maxLength={10} className="mt-1.5" />
                        {errors.phone_number && <p className="text-xs text-rose-600 mt-1">{errors.phone_number.message as string}</p>}
                      </div>
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Nagpur" maxLength={100} className="mt-1.5" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Password</Label>
                        <Input type="password" {...register('password')} className="mt-1.5" />
                        {errors.password && <p className="text-xs text-rose-600 mt-1">{errors.password.message as string}</p>}
                      </div>
                      <div>
                        <Label>Confirm Password</Label>
                        <Input type="password" {...register('confirm')} className="mt-1.5" />
                        {errors.confirm && <p className="text-xs text-rose-600 mt-1">{errors.confirm.message as string}</p>}
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 rounded-lg font-semibold">
                      Next <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </form>
                  <p className="mt-6 text-center text-sm text-slate-500">
                    Already have an account? <Link href="/auth/login" className="font-semibold text-indigo-600 hover:underline">Sign in</Link>
                  </p>
                </>
              )}

              {/* ──────────── STEP 2: Income Heads + Declaration ──────────── */}
              {step === 2 && (
                <>
                  <h1 className="text-xl font-bold text-slate-900">Select your income sources</h1>
                  <p className="mt-1 text-sm text-slate-500">Help us understand your tax profile. You can update this later.</p>

                  <div className="mt-5 space-y-4 max-h-[45vh] sm:max-h-[55vh] overflow-y-auto overscroll-contain pr-1">
                    {/* Head 1: Salary */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Briefcase className="h-4 w-4 text-indigo-500" /> Salary Income
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                        <IncomeToggle label="Salary" checked={incomeHeads.salary} onChange={() => toggleHead('salary')} />
                        <IncomeToggle label="ESOP / RSU" checked={incomeHeads.esop} onChange={() => toggleHead('esop')} />
                      </div>
                    </div>

                    {/* Head 2: House Property */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Home className="h-4 w-4 text-indigo-500" /> House Property
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                        <IncomeToggle label="Rental Income" checked={incomeHeads.rental_income} onChange={() => toggleHead('rental_income')} />
                        <IncomeToggle label="More than 2 Properties" checked={incomeHeads.more_than_2_properties} onChange={() => toggleHead('more_than_2_properties')} />
                      </div>
                    </div>

                    {/* Head 3: Capital Gain */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <TrendingUp className="h-4 w-4 text-indigo-500" /> Capital Gains
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                        <IncomeToggle label="Shares / MF / F&O" checked={incomeHeads.capital_gain_shares} onChange={() => toggleHead('capital_gain_shares')} />
                        <IncomeToggle label="Sale of Land / Building" checked={incomeHeads.capital_gain_land} onChange={() => toggleHead('capital_gain_land')} />
                      </div>
                    </div>

                    {/* Head 4: Business */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Building2 className="h-4 w-4 text-indigo-500" /> Business / Profession
                      </div>
                      <div className="pl-6">
                        <IncomeToggle label="Business or Professional Income" checked={incomeHeads.business_profession} onChange={() => toggleHead('business_profession')} />
                      </div>
                    </div>

                    {/* Head 5: Other Sources */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Coins className="h-4 w-4 text-indigo-500" /> Other Sources
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                        <IncomeToggle label="Interest / Dividend" checked={incomeHeads.interest_dividend} onChange={() => toggleHead('interest_dividend')} />
                        <IncomeToggle label="Foreign Assets / Income" checked={incomeHeads.foreign_assets} onChange={() => toggleHead('foreign_assets')} />
                      </div>
                    </div>

                    {/* Head 6: Other */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <HelpCircle className="h-4 w-4 text-indigo-500" /> Any Other
                      </div>
                      <div className="pl-6 space-y-2">
                        <IncomeToggle label="Any other income / deduction" checked={incomeHeads.any_other} onChange={() => toggleHead('any_other')} />
                        {incomeHeads.any_other && (
                          <div>
                            <Input
                              value={anyOtherText}
                              onChange={(e) => setAnyOtherText(e.target.value)}
                              placeholder="e.g. Freelance consulting income"
                              maxLength={255}
                              required
                              aria-required="true"
                              aria-invalid={!anyOtherText.trim()}
                              className={`mt-1 ${!anyOtherText.trim() ? 'border-rose-300 focus-visible:ring-rose-400' : ''}`}
                            />
                            {!anyOtherText.trim() && (
                              <p className="text-xs text-rose-600 mt-1">Please specify the other income / deduction.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Declaration / T&C */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-800">Confidentiality & Data Protection Declaration</h3>
                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3 text-xs text-slate-600 leading-relaxed bg-slate-50">
                        <p className="mb-2">We are committed to safeguarding the confidentiality, privacy, and security of your personal and financial information. All documents and information shared with us for Income Tax Return (&ldquo;ITR&rdquo;) filing and related professional services shall be handled with due care, professional confidentiality, and appropriate security safeguards in accordance with applicable laws and professional standards.</p>
                        <ol className="list-decimal list-inside space-y-2">
                          <li>All information and documents submitted by you including, but not limited to, PAN, Aadhaar, bank account details, income details, investment proofs, tax documents, financial statements, and supporting records shall be used strictly for the purpose of preparation, verification, processing, filing, and compliance relating to Income Tax Returns and allied professional services.</li>
                          <li>Your information shall not be used, shared, disclosed, sold, transferred, or circulated for any unrelated marketing or commercial purpose except:
                            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                              <li>where required under applicable law or regulatory requirements;</li>
                              <li>where specifically authorized by you; or</li>
                              <li>where required for statutory compliance with government authorities, portals, intermediaries, or authorized service providers involved in the filing or compliance process.</li>
                            </ul>
                          </li>
                          <li>All client data and documents are stored securely within the firm&rsquo;s controlled internal infrastructure, including secure storage systems and restricted-access environments, and are protected through appropriate technical and organizational safeguards.</li>
                          <li>Client documents and confidential information shall not knowingly be uploaded to any publicly accessible repository or unsecured external platform.</li>
                          <li>Access to client information is restricted only to authorized personnel, employees, consultants, or professionals associated with the firm on a strict need-to-know basis for carrying out the intended professional services.</li>
                          <li>Reasonable security measures including access controls, authentication mechanisms, encryption practices, backup procedures, and monitoring systems are implemented to safeguard information against unauthorized access, alteration, disclosure, loss, or misuse.</li>
                          <li>Client data and records may be retained for such period as may be necessary for professional, legal, regulatory, audit, documentation, or compliance purposes and may thereafter be securely archived or deleted in accordance with applicable requirements and internal policies.</li>
                        </ol>
                        <p className="mt-3 font-semibold text-slate-700">Risk & Limitation Disclaimer</p>
                        <p className="mt-1">While reasonable industry-standard safeguards and security controls are maintained, no digital system, internet-based transmission, or electronic storage mechanism can guarantee absolute security. Accordingly, the firm shall not be liable for any indirect or consequential loss arising from unauthorized access, cyberattacks, malware, service interruptions, internet failures, governmental actions, force majeure events, or unauthorized acts of third parties beyond the firm&rsquo;s reasonable control, despite implementation of reasonable safeguards.</p>
                      </div>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={declarationAccepted} onChange={(e) => setDeclarationAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-xs text-slate-700 leading-snug">I/We have read and understood the above Confidentiality & Data Protection Declaration and hereby consent to the collection, storage, processing, retention, and use of the information and documents provided by me/us solely for the purpose of ITR filing, verification, compliance, and related professional services.</span>
                      </label>
                    </div>
                  </div>

                  {err && <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{err}</div>}

                  <div className="flex gap-3 mt-5">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <Button
                      type="button"
                      disabled={!declarationAccepted || (incomeHeads.any_other && !anyOtherText.trim())}
                      onClick={onStep2Next}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-semibold disabled:opacity-50"
                    >
                      Next <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}

              {/* ──────────── STEP 3: Referral Source ──────────── */}
              {step === 3 && (
                <>
                  <h1 className="text-xl font-bold text-slate-900">How did you hear about us?</h1>
                  <p className="mt-1 text-sm text-slate-500">Let us know how you found us — it helps us serve you better.</p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <Label>Referral Source <span className="text-rose-500">*</span></Label>
                      <Select value={referralSource} onValueChange={(v) => setReferralSource(v)}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select an option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {REFERRAL_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {referralSource === 'OTHER' && (
                      <div>
                        <Label>Please mention the source <span className="text-rose-500">*</span></Label>
                        <Input
                          value={referralSourceOther}
                          onChange={(e) => setReferralSourceOther(e.target.value)}
                          placeholder="e.g. Google search, newspaper ad..."
                          maxLength={255}
                          className="mt-1.5"
                        />
                      </div>
                    )}
                  </div>

                  {err && <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{err}</div>}

                  <div className="flex gap-3 mt-5">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <Button
                      type="button"
                      disabled={submitting}
                      onClick={onFinalSubmit}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-semibold disabled:opacity-50"
                    >
                      {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</> : 'Create Account'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}

/* ─── Reusable toggle chip ─── */
function IncomeToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs ${checked ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
      {label}
    </label>
  );
}
