// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FilingProgressBar } from '@/components/shared/FilingProgressBar';
import { FileViewer } from '@/components/shared/FileViewer';
import { getFiling, filingDocs, docUploadUrl, docReplaceUrl, docConfirmUpload, docDownloadUrl, deleteDoc, compForFiling, compDownloadUrl, approveComp, rejectComp, confirmTaxPaid, completedDocs, storageDownloadUrl, submitDocs, getClient, submitFeedback, getFilingFeedback, listOtherDocs, listFilingTextFields, updateTextFieldValue, deleteTextField } from '@/lib/api';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Upload, FileText, Download, Eye, CheckCircle2, XCircle, Clock, RefreshCw, Loader2, FolderOpen, Calculator, Send, X, IndianRupee, Plus, Trash2, Star, Type, Save, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function FilingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const filingId = params.filing_id as string;

  const [filing, setFiling] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [docGroups, setDocGroups] = useState<any[]>([]);
  const [docsMeta, setDocsMeta] = useState<any>({});
  const [textFields, setTextFields] = useState<any[]>([]);
  const [textFieldGroups, setTextFieldGroups] = useState<any[]>([]);
  const [textFieldsMeta, setTextFieldsMeta] = useState<any>({});
  const [computations, setComputations] = useState<any[]>([]);
  const [currentComp, setCurrentComp] = useState<any>(null);
  const [hasInternalWorkings, setHasInternalWorkings] = useState(false);
  const [internalWorkingsReady, setInternalWorkingsReady] = useState(false);
  const [completed, setCompleted] = useState<any[]>([]);
  const [otherDocs, setOtherDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rejectingComp, setRejectingComp] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFileName, setViewerFileName] = useState<string | undefined>(undefined);
  const [showQr, setShowQr] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null); // null = loading, true/false
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Helper: persist feedback status in localStorage
  const feedbackKey = `feedback_given_${filingId}`;
  const markFeedbackDone = () => { setFeedbackGiven(true); try { localStorage.setItem(feedbackKey, '1'); } catch {} };
  const isFeedbackDoneLocally = () => { try { return localStorage.getItem(feedbackKey) === '1'; } catch { return false; } };

  const load = async () => {
    setLoading(true);
    try {
      const f = await getFiling(filingId);
      setFiling(f);

      const d = await filingDocs(filingId);
      setDocs(d?.items || []);
      setDocGroups(d?.groups || []);
      setDocsMeta({ all_approved: d?.all_approved, pending: d?.pending_count, uploaded: d?.uploaded_count, rejected: d?.rejected_count, approved: d?.approved_count, total: d?.total });

      // Load text fields
      try {
        const tf = await listFilingTextFields(filingId);
        setTextFields(tf?.items || []);
        setTextFieldGroups(tf?.groups || []);
        setTextFieldsMeta({ all_approved: tf?.all_approved, pending: tf?.pending_count, filled: tf?.filled_count, rejected: tf?.rejected_count, approved: tf?.approved_count, total: tf?.total });
      } catch {
        setTextFields([]);
        setTextFieldGroups([]);
        setTextFieldsMeta({});
      }

      const state = f?.status;
      if (state === 'COMPUTATION' || state === 'FILING' || state === 'PAYMENT' || state === 'COMPLETED') {
        const c = await compForFiling(filingId);
        setComputations(c?.items || []);
        setCurrentComp(c?.current_version || null);
        setHasInternalWorkings(!!c?.has_internal_workings);
        setInternalWorkingsReady(!!c?.internal_workings_ready);
      }
      if (['FILING', 'PAYMENT', 'COMPLETED'].includes(state)) {
        const cd = await completedDocs(filingId);
        setCompleted(cd || []);
        const od = await listOtherDocs(filingId);
        setOtherDocs(od || []);
      }
      if (state === 'PAYMENT' && f?.client_id) {
        getClient(f.client_id).then(setClientProfile).catch(() => {});
      }
      // Check feedback for filings past FILING state (PAYMENT or COMPLETED).
      // Must be awaited so setLoading(false) only fires after feedbackGiven is set —
      // otherwise the page renders briefly then jumps to the feedback gate mid-scroll.
      if (state === 'PAYMENT' || state === 'COMPLETED') {
        if (isFeedbackDoneLocally()) {
          setFeedbackGiven(true);
        } else {
          try {
            await getFilingFeedback(filingId);
            markFeedbackDone();
          } catch (err: any) {
            if (err?.response?.status === 404) setFeedbackGiven(false);
            else setFeedbackGiven(true); // on any other error, don't block the client
          }
        }
      } else {
        setFeedbackGiven(true); // not past FILING, no gate needed
      }
    } catch (e: any) {
      toast.error('Failed to load filing');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (filingId) load(); }, [filingId]);

  // Silent background refresh of doc metadata (counts) so Submit button logic stays accurate
  const refreshDocsMeta = async () => {
    try {
      const d = await filingDocs(filingId);
      setDocs(d?.items || []);
      setDocGroups(d?.groups || []);
      setDocsMeta({ all_approved: d?.all_approved, pending: d?.pending_count, uploaded: d?.uploaded_count, rejected: d?.rejected_count, approved: d?.approved_count, total: d?.total });
    } catch {}
  };

  const onUpload = async (docId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf','doc','docx','xls','xlsx','csv','png','jpg','jpeg'].includes(ext)) { toast.error('Allowed types: PDF, Word, Excel, CSV, PNG, JPG'); return; }
    setUploading(docId);
    try {
      const url = await docUploadUrl({ document_id: docId, filename: file.name, content_type: file.type });
      await axios.put(url.upload_url, file, { headers: { 'Content-Type': file.type }, timeout: 60000 });
      await docConfirmUpload({ document_id: url.document_id || docId, object_key: url.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      toast.success('Document uploaded');
      // Update the specific doc in-place instead of reloading the whole page
      setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, status: 'UPLOADED', original_filename: file.name } : d));
      setDocGroups((prev) => prev.map((g) => ({
        ...g,
        files: (g.files || []).map((d: any) => d.id === docId ? { ...d, status: 'UPLOADED', original_filename: file.name } : d),
      })));
      // Background refresh to sync metadata counts
      refreshDocsMeta();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(null); }
  };

  const onReplace = async (docId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf','doc','docx','xls','xlsx','csv','png','jpg','jpeg'].includes(ext)) { toast.error('Allowed types: PDF, Word, Excel, CSV, PNG, JPG'); return; }
    setUploading(docId);
    try {
      const url = await docReplaceUrl(docId, { filename: file.name, content_type: file.type });
      await axios.put(url.upload_url, file, { headers: { 'Content-Type': file.type }, timeout: 60000 });
      await docConfirmUpload({ document_id: url.document_id || docId, object_key: url.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      toast.success('Document replaced');
      setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, status: 'UPLOADED', original_filename: file.name } : d));
      setDocGroups((prev) => prev.map((g) => ({
        ...g,
        files: (g.files || []).map((d: any) => d.id === docId ? { ...d, status: 'UPLOADED', original_filename: file.name } : d),
      })));
      refreshDocsMeta();
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 403) toast.error('This document is already approved and cannot be replaced.');
      else if (s === 409) toast.error('Document replacement is not allowed at this filing stage.');
      else toast.error(e?.response?.data?.detail || 'Replace failed');
    } finally { setUploading(null); }
  };

  const onUploadAdditional = async (documentTypeId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf','doc','docx','xls','xlsx','csv','png','jpg','jpeg'].includes(ext)) { toast.error('Allowed types: PDF, Word, Excel, CSV, PNG, JPG'); return; }
    setUploading(documentTypeId);
    try {
      const url = await docUploadUrl({ filing_id: filingId, document_type_id: documentTypeId, filename: file.name, content_type: file.type });
      await axios.put(url.upload_url, file, { headers: { 'Content-Type': file.type }, timeout: 60000 });
      await docConfirmUpload({ document_id: url.document_id, object_key: url.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      toast.success('Additional document uploaded');
      // Add the new doc in-place instead of full page reload
      const newDoc = { id: url.document_id, document_type_id: documentTypeId, status: 'UPLOADED', original_filename: file.name };
      setDocs((prev) => [...prev, newDoc]);
      setDocGroups((prev) => prev.map((g) => g.document_type_id === documentTypeId ? { ...g, files: [...(g.files || []), newDoc] } : g));
      refreshDocsMeta();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(null); }
  };

  const onDeleteDoc = async (docId: string) => {
    try {
      await deleteDoc(docId);
      toast.success('Document removed');
      // Remove doc in-place instead of full reload
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      setDocGroups((prev) => prev.map((g) => ({
        ...g,
        files: (g.files || []).filter((d: any) => d.id !== docId),
      })));
      refreshDocsMeta();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to delete'); }
  };

  const onSaveTextField = async (fieldId: string, value: string) => {
    try {
      const r = await updateTextFieldValue(fieldId, value);
      // Update in-place
      const updater = (tf: any) => tf.id === fieldId ? { ...tf, ...(r || {}), value, status: r?.status || 'FILLED' } : tf;
      setTextFields((prev) => prev.map(updater));
      setTextFieldGroups((prev) => prev.map((g) => ({ ...g, fields: (g.fields || []).map(updater) })));
      toast.success('Saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to save');
      throw e;
    }
  };

  const onDeleteTextField = async (fieldId: string) => {
    try {
      await deleteTextField(fieldId);
      toast.success('Removed');
      setTextFields((prev) => prev.filter((tf) => tf.id !== fieldId));
      setTextFieldGroups((prev) => prev.map((g) => ({ ...g, fields: (g.fields || []).filter((tf: any) => tf.id !== fieldId) })));
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to delete'); }
  };

  const onDownloadDoc = async (docId: string) => {
    try {
      const r = await docDownloadUrl(docId);
      setViewerUrl(r.download_url || r.url);
      setViewerFileName(undefined);
      setViewerOpen(true);
    } catch { toast.error('Could not load file'); }
  };

  const onDownloadStorage = async (fileId: string) => {
    try {
      const r = await storageDownloadUrl(fileId);
      setViewerUrl(r.url || r.download_url);
      setViewerFileName(undefined);
      setViewerOpen(true);
    } catch { toast.error('Could not load file'); }
  };

  const onSubmitDocs = async () => {
    setActing(true);
    try { await submitDocs(filingId); toast.success('Documents submitted for review'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setActing(false); }
  };

  const onApproveComp = async (id: string) => {
    setActing(true);
    try { await approveComp(id); toast.success('Computation approved!'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setActing(false); }
  };

  const onRejectComp = async () => {
    if (!rejectingComp || !rejectReason.trim()) { toast.error('Provide a reason'); return; }
    setActing(true);
    try {
      await rejectComp(rejectingComp.id, rejectReason);
      toast.success('Sent back for revision');
      setRejectingComp(null); setRejectReason(''); load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setActing(false); }
  };

  const onDownloadComp = async (id: string) => {
    try { const r = await compDownloadUrl(id); setViewerUrl(r.download_url || r.url); setViewerFileName(undefined); setViewerOpen(true); }
    catch { toast.error('Could not load file'); }
  };

  if (loading && !showCelebration) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>;
  if (!loading && !filing) return <div className="text-center py-16 text-slate-500">Filing not found.</div>;

  // Render celebration overlay even while reloading
  if (showCelebration) {
    return <CelebrationOverlay onClose={() => { setShowCelebration(false); load(); }} />;
  }

  const state = filing.status;

  const onSubmitFeedback = async () => {
    if (feedbackRating < 1 || feedbackRating > 5) { toast.error('Please select a rating'); return; }
    setFeedbackSubmitting(true);
    try {
      await submitFeedback(filingId, feedbackRating);
      toast.success('Thank you for your feedback!');
      markFeedbackDone();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 409) {
        // Already submitted
        markFeedbackDone();
      } else {
        toast.error(detail || 'Failed to submit feedback');
      }
    } finally { setFeedbackSubmitting(false); }
  };

  // Feedback gate: block page until feedback is given for filings past FILING state
  if ((state === 'PAYMENT' || state === 'COMPLETED') && feedbackGiven === false) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="rounded-2xl p-8 max-w-md w-full text-center space-y-5 shadow-lg border-indigo-100">
          <div className="inline-flex h-16 w-16 rounded-full bg-indigo-50 items-center justify-center mx-auto">
            <Star className="h-8 w-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Rate Your Experience</h2>
          {filing?.financial_year && (
            <p className="text-sm font-semibold text-indigo-600">FY {filing.financial_year}</p>
          )}
          <p className="text-sm text-slate-500">Please provide your feedback for this filing to continue.</p>

          {/* Star rating */}
          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setFeedbackHover(star)}
                onMouseLeave={() => setFeedbackHover(0)}
                onClick={() => setFeedbackRating(star)}
              >
                <Star
                  className={`h-10 w-10 transition-colors ${
                    star <= (feedbackHover || feedbackRating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>
          {feedbackRating > 0 && (
            <p className="text-sm font-medium text-slate-700">
              {['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][feedbackRating]}
            </p>
          )}

          <Button
            onClick={onSubmitFeedback}
            disabled={feedbackSubmitting || feedbackRating === 0}
            className="bg-indigo-600 hover:bg-indigo-700 w-full"
          >
            {feedbackSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit Feedback to Continue
          </Button>
          <p className="text-xs text-slate-400">You must submit feedback before viewing this filing.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Unified Filing Overview Card: identity + fee chip + progress */}
      <Card className="rounded-xl overflow-hidden p-0">
        {/* Zone 1: Filing identity */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="flex-shrink-0 -ml-2 mt-0.5" onClick={() => router.push('/client/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">ITR Filing &middot; {filing.financial_year}</h1>
                <StatusBadge status={state} />
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Initiated {new Date(filing.initiated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Fee as inline chip */}
          <div className="mt-3 ml-8">
            {filing.no_fees_applicable ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200">
                <CheckCircle2 className="h-3.5 w-3.5" /> No Fees Applicable
                {filing.engagement_accepted_at && <span className="font-normal opacity-75">&middot; Accepted {new Date(filing.engagement_accepted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              </span>
            ) : filing.professional_fee ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                <IndianRupee className="h-3.5 w-3.5" /> ₹{Number(filing.professional_fee).toLocaleString('en-IN')}
                {filing.engagement_accepted_at && <span className="font-normal opacity-75">&middot; Accepted {new Date(filing.engagement_accepted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                <IndianRupee className="h-3.5 w-3.5" /> Professional Fee: To be decided
                {filing.engagement_accepted_at && <span className="font-normal opacity-75">&middot; Accepted {new Date(filing.engagement_accepted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              </span>
            )}
          </div>
        </div>

        {/* Zone 2: Progress (border-separated) */}
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/40">
          {state === 'COMPLETED' ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-emerald-800">Filing Completed</div>
                <div className="text-xs text-emerald-600 mt-0.5">All stages finished{filing.completed_at ? ` on ${new Date(filing.completed_at).toLocaleDateString()}` : ''}</div>
              </div>
            </div>
          ) : (
            <FilingProgressBar currentState={state} />
          )}
        </div>
      </Card>

      {/* Waiting banners — when client has no action needed */}
      {state === 'DOCUMENT_UPLOAD' && docsMeta.total > 0 && docsMeta.pending === 0 && (docsMeta.rejected || 0) === 0 && !docsMeta.all_approved && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-blue-900">All documents uploaded successfully</div>
            <div className="text-xs text-blue-700 mt-0.5">Your CA will review them shortly. No action is needed from your side right now.</div>
          </div>
        </div>
      )}

      {state === 'PROCESSING' && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-indigo-900">Your documents are being reviewed</div>
            <div className="text-xs text-indigo-700 mt-0.5">Your CA is processing your documents. No action is needed from your side — you will be notified when the next step is ready.</div>
          </div>
        </div>
      )}

      {state === 'FILING' && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-indigo-900">Your income tax return is being filed</div>
            <div className="text-xs text-indigo-700 mt-0.5">Your CA is filing your return with the Income Tax Department. No action is needed from your side right now.</div>
          </div>
        </div>
      )}

      {/* Payment QR - shown in PAYMENT state (not for no-fee filings) */}
      {state === 'PAYMENT' && !filing.no_fees_applicable && (
        <Card className="rounded-xl p-5 border-amber-200 bg-amber-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-amber-700" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-900">Professional Fee Payment Pending</div>
              <div className="text-xs text-amber-700 mt-0.5">Please complete the payment to proceed.</div>
              {(clientProfile?.professional_fee || filing.professional_fee) && (
                <div className="text-lg font-bold text-amber-900 mt-1">₹{Number(clientProfile?.professional_fee || filing.professional_fee).toLocaleString('en-IN')}</div>
              )}
            </div>
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100" onClick={() => setShowQr(true)}>
            Click here to show QR !
            </Button>
          </div>
        </Card>
      )}

      {/* QR Code Fullscreen Overlay */}
      {showQr && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowQr(false)}>
          <div className="relative flex flex-col items-center gap-4 rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-2xl max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-3 h-8 w-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center transition-colors" onClick={() => setShowQr(false)}>
              <X className="h-5 w-5 text-slate-700" />
            </button>
            <img src="/qr.jpeg" alt="Payment QR Code" className="w-[80vmin] h-[80vmin] max-w-[500px] max-h-[500px] object-contain" />
            {filing.professional_fee && (
              <div className="text-center">
                <div className="text-xl font-bold text-slate-900">₹{Number(filing.professional_fee).toLocaleString('en-IN')}</div>
                <p className="text-xs text-slate-500 mt-1">Plus applicable taxes, if any</p>
              </div>
            )}
            <p className="text-sm text-slate-600 text-center max-w-sm">Scan the QR code using any UPI app to make the payment.</p>
          </div>
        </div>
      )}

      {/* Completed + Other Documents — side by side on md+ */}
      {(completed.length > 0 || otherDocs.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {completed.length > 0 && (
            <Card className="rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h2 className="font-bold text-slate-900">Filed Documents</h2>
              </div>
              <div className="space-y-3">
                {completed.map((d: any) => (
                  <div key={d.id} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-slate-900 break-words">{{ ITR_ACKNOWLEDGEMENT: 'ITR Acknowledgement', INVOICE: 'Invoice', ITR_JSON: 'ITR JSON', ITR_FORM: 'ITR Form', TAX_PAID_COMPUTATION: 'Tax Paid Computation', FINANCIAL_STATEMENT: 'Financial Statement' }[d.doc_type] || d.doc_type || d.original_filename || 'Document'}</div>
                        <div className="text-xs text-slate-500 break-all">{d.original_filename || d.filename}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="flex-shrink-0 ml-2" onClick={() => onDownloadStorage(d.id)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {otherDocs.length > 0 && (
            <Card className="rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <FolderOpen className="h-5 w-5 text-indigo-600" />
                <h2 className="font-bold text-slate-900">Other Documents</h2>
              </div>
              <div className="space-y-3">
                {otherDocs.map((d: any) => (
                  <div key={d.id} className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-slate-900 break-words">{d.label || d.filename || 'Document'}</div>
                        {d.label && d.filename && <div className="text-xs text-slate-500 break-all">{d.filename}</div>}
                        {d.uploaded_at && <div className="text-[10px] text-slate-400">{new Date(d.uploaded_at).toLocaleDateString('en-IN')}</div>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="flex-shrink-0 ml-2" onClick={() => onDownloadStorage(d.file_id || d.id)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Computation Section */}
      {(state === 'COMPUTATION' || computations.length > 0) && (
        <Card className="rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-violet-600" />
            <h2 className="font-bold text-slate-900">Tax Computation</h2>
          </div>

          {currentComp && currentComp.status === 'PARTNER_APPROVED' && (
            <div className="rounded-lg border-2 border-violet-200 bg-violet-50/50 p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Version {currentComp.version}</div>
                  <div className="text-xs text-slate-500">{currentComp.original_filename || 'computation.pdf'}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onDownloadComp(currentComp.id)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" onClick={() => onApproveComp(currentComp.id)} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setRejectingComp(currentComp)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Request Changes
                </Button>
              </div>
            </div>
          )}

          {/* Tax Payment Confirmation - shown when computation is approved but tax not yet paid AND internal workings uploaded */}
          {currentComp && (currentComp.status === 'APPROVED' || currentComp.status === 'CLIENT_APPROVED') && !filing.is_tax_paid && state === 'COMPUTATION' && !internalWorkingsReady && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-slate-500 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-slate-700">Awaiting Internal Verification</div>
                <div className="text-xs text-slate-500 mt-0.5">Your CA is completing internal verification. You&apos;ll be notified when tax payment confirmation is needed.</div>
              </div>
            </div>
          )}
          {currentComp && (currentComp.status === 'APPROVED' || currentComp.status === 'CLIENT_APPROVED') && !filing.is_tax_paid && state === 'COMPUTATION' && internalWorkingsReady && (
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-amber-900">Tax Payment Confirmation Required</div>
                  <div className="text-xs text-amber-700 mt-0.5">Computation has been approved. Please confirm that the tax payment has been made to proceed with filing.</div>
                </div>
              </div>

              {/* View Computation PDF */}
              <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50/50 p-3 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{currentComp.original_filename || 'Computation.pdf'}</div>
                    <div className="text-xs text-slate-500">Version {currentComp.version}</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onDownloadComp(currentComp.id)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> View PDF
                </Button>
              </div>

              {/* Steps to Pay Income Tax */}
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-indigo-900">Steps to Pay Your Income Tax</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-indigo-700 border-indigo-300 hover:bg-indigo-100"
                    onClick={() => {
                      setViewerUrl('/Income Tax Payment Flow V2.pdf');
                      setViewerFileName('Income Tax Payment Flow V2.pdf');
                      setViewerOpen(true);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> View Payment Guide
                  </Button>
                </div>
                <ol className="list-decimal list-inside text-xs text-indigo-800 space-y-1.5">
                  <li>Visit the Income Tax e-Filing Portal using the link below.</li>
                  <li>Log in with your PAN and password.</li>
                  <li>Navigate to <span className="font-medium">e-Pay Tax</span> under the &quot;e-File&quot; menu.</li>
                  <li>Select the appropriate Assessment Year and type of payment (Self Assessment Tax).</li>
                  <li>Enter the tax amount as per the computation sheet and choose your payment method.</li>
                  <li>Complete the payment and save the challan receipt.</li>
                </ol>
                <a
                  href="https://eportal.incometax.gov.in/iec/foservices/#/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
                >
                  <IndianRupee className="h-3.5 w-3.5" />
                  Pay Tax on Income Tax Portal
                </a>
              </div>

              <Button
                size="sm"
                onClick={async () => {
                  setActing(true);
                  try {
                    await confirmTaxPaid(currentComp.id);
                    toast.success('Tax payment confirmed! Ready for filing.');
                    setShowCelebration(true);
                  } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to confirm tax payment'); }
                  finally { setActing(false); }
                }}
                disabled={acting}
                className="bg-amber-600 hover:bg-amber-700 w-full"
              >
                {acting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <IndianRupee className="h-4 w-4 mr-2" />}
                Click here if you have paid your TAX or eligible for a REFUND 
              </Button>
            </div>
          )}

          {/* Tax Payment Confirmed indicator */}
          {filing.is_tax_paid && state === 'COMPUTATION' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 mb-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-emerald-800">Tax Payment Confirmed</div>
                <div className="text-xs text-emerald-600 mt-0.5">
                  Awaiting partner/executive to advance filing.
                  {filing.tax_paid_at && <span className="ml-1">Confirmed on {new Date(filing.tax_paid_at).toLocaleDateString('en-IN')}.</span>}
                </div>
              </div>
            </div>
          )}

          {computations.filter((c) => ['PARTNER_APPROVED', 'APPROVED', 'CLIENT_APPROVED', 'REJECTED'].includes(c.status)).filter((c) => c.id !== currentComp?.id || c.status !== 'PARTNER_APPROVED').length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">History</p>
              {computations.filter((c) => ['PARTNER_APPROVED', 'APPROVED', 'CLIENT_APPROVED', 'REJECTED'].includes(c.status)).filter((c) => c.id !== currentComp?.id || c.status !== 'PARTNER_APPROVED').sort((a, b) => b.version - a.version).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-500 flex-shrink-0">v{c.version}</span>
                    <span className="text-slate-700 break-all">{c.original_filename || 'computation'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.status} size="sm" />
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onDownloadComp(c.id)}><Eye className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {computations.length === 0 && <p className="text-sm text-slate-500">Computation will be uploaded shortly...</p>}
        </Card>
      )}

      {/* Documents Section - File System View */}
      <Card className="rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900">Documents</h2>
            {docsMeta.total > 0 && (
              <span className="text-xs text-slate-500 ml-2">
                {docsMeta.approved || 0} approved / {docsMeta.total} total
              </span>
            )}
          </div>
          {state === 'DOCUMENT_UPLOAD' && docsMeta.total > 0 && (
            <Button size="sm" onClick={() => {
              const pending = docsMeta.pending || 0;
              const rejected = docsMeta.rejected || 0;
              if (pending > 0) {
                toast.error(`Please upload all documents first. ${pending} document${pending > 1 ? 's' : ''} still pending.`);
                return;
              }
              if (rejected > 0) {
                toast.error(`${rejected} document${rejected > 1 ? 's are' : ' is'} rejected. Please re-upload before submitting.`);
                return;
              }
              setShowSubmitConfirm(true);
            }} disabled={acting} className="bg-indigo-600 hover:bg-indigo-700">
              {acting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />} Submit Documents
            </Button>
          )}
          {state === 'PROCESSING' && (
            <Button size="sm" onClick={onSubmitDocs} disabled={acting} className="bg-indigo-600 hover:bg-indigo-700">
              {acting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />} Submit Documents
            </Button>
          )}
        </div>

        {/* All documents approved banner */}
        {docsMeta.all_approved && docsMeta.total > 0 && (state === 'PROCESSING' || state === 'DOCUMENT_UPLOAD') && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 mb-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-emerald-800">All documents approved</div>
              <div className="text-xs text-emerald-600 mt-0.5">Awaiting executive action to proceed to computation stage.</div>
            </div>
          </div>
        )}

        {docs.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            {state === 'INITIATED' ? 'Document checklist will be assigned soon...' : 'No documents assigned yet.'}
          </div>
        ) : docGroups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {docGroups.map((group) => (
              <DocumentTypeGroup
                key={group.document_type_id}
                group={group}
                filingId={filingId}
                filingState={state}
                uploading={uploading}
                onUpload={onUpload}
                onReplace={onReplace}
                onUploadAdditional={onUploadAdditional}
                onView={onDownloadDoc}
                onDelete={onDeleteDoc}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {docs.map((doc) => (
              <DocumentPlaceholder
                key={doc.id}
                doc={doc}
                uploading={uploading === doc.id}
                onUpload={(file) => onUpload(doc.id, file)}
                onReplace={(file) => onReplace(doc.id, file)}
                onView={() => onDownloadDoc(doc.id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Text Fields Section */}
      {textFields.length > 0 && (
        <Card className="rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Type className="h-5 w-5 text-amber-600" />
            <h2 className="font-bold text-slate-900">Information Fields</h2>
            {textFieldsMeta.total > 0 && (
              <span className="text-xs text-slate-500 ml-1">
                ({textFieldsMeta.filled || 0}/{textFieldsMeta.total} filled)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-4">Please fill in the details requested below. You can edit them anytime until they are approved.</p>
          <div className="space-y-4">
            {(textFieldGroups.length > 0 ? textFieldGroups : [{ field_type_id: '__all__', field_type_name: '', fields: textFields }]).map((g: any) => {
              const description = g.fields?.[0]?.field_type_description;
              const maxLength = g.fields?.[0]?.field_type_max_length;
              return (
                <TextFieldGroup
                  key={g.field_type_id}
                  group={g}
                  description={description}
                  maxLength={maxLength}
                  filingState={state}
                  onSave={onSaveTextField}
                  onDelete={onDeleteTextField}
                />
              );
            })}
          </div>
        </Card>
      )}

      {/* Reject Computation Dialog */}
      <Dialog open={!!rejectingComp} onOpenChange={(o) => { if (!o) { setRejectingComp(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Changes</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Explain what needs to be changed.</p>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Describe changes needed..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingComp(null); setRejectReason(''); }}>Cancel</Button>
            <Button onClick={onRejectComp} disabled={acting || !rejectReason.trim()} className="bg-rose-600 hover:bg-rose-700">
              {acting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Documents Confirmation Dialog */}
      <Dialog open={showSubmitConfirm} onOpenChange={(o) => { if (!o) setShowSubmitConfirm(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700">
              <Send className="h-5 w-5" /> Submit Documents
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">You are about to submit all your documents for review by your CA.</p>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-800">Once submitted, your CA will review them. You won't need to do anything until the next step is ready.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>Cancel</Button>
            <Button
              disabled={acting}
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={async () => {
                setShowSubmitConfirm(false);
                onSubmitDocs();
              }}
            >
              {acting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FileViewer open={viewerOpen} onClose={() => setViewerOpen(false)} fileUrl={viewerUrl} fileName={viewerFileName} />

      {/* Celebration overlay is rendered at the top-level return, above loading guard */}
    </div>
  );
}

/** Fullscreen celebration with confetti + video */
function CelebrationOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    let cancelled = false;
    import('canvas-confetti').then((mod) => {
      if (cancelled) return;
      const confetti = mod.default;
      const end = Date.now() + 15000;
      const fire = () => {
        if (Date.now() > end || cancelled) return;
        confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#ec4899'] });
        confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#ec4899'] });
        requestAnimationFrame(fire);
      };
      // Initial burst
      confetti({ particleCount: 100, spread: 100, origin: { y: 0.6 }, colors: ['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#ec4899'] });
      fire();
    });
    const timer = setTimeout(onClose, 15000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center" onClick={onClose}>
      <video
        autoPlay
        playsInline
        className="rounded-2xl shadow-2xl max-w-[90vw] max-h-[70vh] object-contain"
        onEnded={onClose}
      >
        <source src="/tax-paid-celebration.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

/** Document placeholder - Windows file system style */
function DocumentPlaceholder({ doc, uploading, onUpload, onReplace, onView, onDelete }: { doc: any; uploading: boolean; onUpload: (f: File) => void; onReplace: (f: File) => void; onView: () => void; onDelete?: () => void }) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isReplace, setIsReplace] = useState(false);
  const status = doc.status;

  const statusConfig: Record<string, { iconColor: string; icon: any }> = {
    PENDING_UPLOAD: { icon: Upload, iconColor: 'text-slate-400' },
    UPLOADED: { icon: Clock, iconColor: 'text-blue-500' },
    APPROVED: { icon: CheckCircle2, iconColor: 'text-emerald-500' },
    REJECTED: { icon: XCircle, iconColor: 'text-rose-500' },
  };

  const config = statusConfig[status] || statusConfig.PENDING_UPLOAD;
  const Icon = config.icon;

  return (
    <div className="flex items-start sm:items-center gap-3 py-2">
      <div className={`h-7 w-7 rounded-md flex items-center justify-center bg-slate-50 ${config.iconColor} flex-shrink-0 mt-0.5 sm:mt-0`}>
        {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      </div>

      {/* On mobile: column (text above, buttons below). On sm+: row (text left, buttons right). */}
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start flex-wrap gap-x-2 gap-y-1">
            <p className="font-medium text-sm text-slate-900 break-words">{doc.original_filename || 'Document'}</p>
            <StatusBadge status={status} size="sm" />
          </div>
          {pendingFile && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 bg-amber-50 rounded px-2 py-0.5 border border-amber-200 w-fit">
              <Upload className="h-3 w-3" />
              <span className="break-all">{pendingFile.name}</span>
              <button className="text-rose-500 hover:text-rose-700 ml-1 flex-shrink-0" onClick={() => { setPendingFile(null); setIsReplace(false); }}>✕</button>
            </div>
          )}
          {status === 'REJECTED' && doc.rejection_reason && (
            <p className="text-xs text-rose-600 mt-0.5 break-words">{doc.rejection_reason}</p>
          )}
        </div>

        {/* Action buttons — full-width row on mobile, compact row on desktop */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {(status === 'PENDING_UPLOAD' || status === 'REJECTED') && !pendingFile && (
            <label className="flex-1 sm:flex-none">
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPendingFile(f); setIsReplace(false); } e.target.value = ''; }} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" />
              <span className="flex items-center justify-center gap-1 w-full sm:w-auto px-3 py-2 sm:px-2.5 sm:py-1 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors">
                <Upload className="h-3 w-3" /> {status === 'REJECTED' ? 'Re-upload' : 'Upload'}
              </span>
            </label>
          )}
          {status === 'UPLOADED' && !pendingFile && (
            <label className="flex-1 sm:flex-none">
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPendingFile(f); setIsReplace(true); } e.target.value = ''; }} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" />
              <span className="flex items-center justify-center gap-1 w-full sm:w-auto px-3 py-2 sm:px-2.5 sm:py-1 rounded-md text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 cursor-pointer transition-colors">
                <RefreshCw className="h-3 w-3" /> Replace
              </span>
            </label>
          )}
          {pendingFile && (
            <Button size="sm" className="relative overflow-visible bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-md text-xs h-9 flex-1 sm:flex-none sm:h-8" disabled={uploading} onClick={() => { if (isReplace) onReplace(pendingFile); else onUpload(pendingFile); setPendingFile(null); setIsReplace(false); }}>
              <span className="hidden sm:block absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-lg animate-bounce pointer-events-none">
                Click to confirm
                <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
              </span>
              {uploading ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
              Confirm
            </Button>
          )}
          {(status === 'UPLOADED' || status === 'APPROVED') && (
            <Button size="sm" variant="outline" className="text-xs h-9 sm:h-8 flex-1 sm:flex-none" onClick={onView}>
              <Eye className="h-3 w-3 mr-1" /> View
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="outline" className="text-xs h-9 sm:h-8 text-rose-600 border-rose-200 hover:bg-rose-50 px-3 sm:px-1.5" onClick={onDelete} title="Remove this row">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Document type group - shows all files for a single document type with "Add Another" */
function DocumentTypeGroup({ group, filingId, filingState, uploading, onUpload, onReplace, onUploadAdditional, onView, onDelete }: {
  group: any;
  filingId: string;
  filingState: string;
  uploading: string | null;
  onUpload: (docId: string, file: File) => void;
  onReplace: (docId: string, file: File) => void;
  onUploadAdditional: (typeId: string, file: File) => void;
  onView: (docId: string) => void;
  onDelete?: (docId: string) => void;
}) {
  const files = group.files || [];
  const canUploadMore = ['INITIATED', 'DOCUMENT_UPLOAD', 'PROCESSING'].includes(filingState);
  const canRemove = ['DOCUMENT_UPLOAD', 'PROCESSING', 'HALTED'].includes(filingState);
  const hasSiblingWithFile = files.some((f: any) => ['UPLOADED', 'REJECTED', 'APPROVED'].includes(f.status));
  // Description may live on the group OR on individual files — fall back to the first file with one.
  const groupDescription = group.document_type_description || files.find((f: any) => f?.document_type_description)?.document_type_description || null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden w-full">
      <div className="flex items-start justify-between px-4 py-3 bg-slate-50 border-b border-slate-100 gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <FileText className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-start flex-wrap gap-x-2 gap-y-0.5">
              <h4 className="text-sm font-semibold text-slate-800 break-words">{group.document_type_name}</h4>
              <span className="text-xs text-slate-500 flex-shrink-0">({files.length})</span>
            </div>
            {groupDescription && (
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{groupDescription}</p>
            )}
          </div>
        </div>
        {canUploadMore && (
          <label className="flex-shrink-0">
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadAdditional(group.document_type_id, f); e.target.value = ''; }} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" />
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer transition-colors">
              <Plus className="h-3 w-3" /> Add
            </span>
          </label>
        )}
      </div>
      <div className="divide-y divide-slate-100 px-4 py-1">
        {files.map((doc: any) => {
          // Client may remove a row only if: filing is DOCUMENT_UPLOAD/PROCESSING/HALTED,
          // this row has an attached file (UPLOADED or REJECTED), and at least one sibling
          // in this same document_type group also has a file (UPLOADED/REJECTED/APPROVED).
          const isRemovableStatus = doc.status === 'UPLOADED' || doc.status === 'REJECTED';
          const showDelete = !!onDelete && canRemove && isRemovableStatus && hasSiblingWithFile;
          return (
            <DocumentPlaceholder
              key={doc.id}
              doc={doc}
              uploading={uploading === doc.id}
              onUpload={(file) => onUpload(doc.id, file)}
              onReplace={(file) => onReplace(doc.id, file)}
              onView={() => onView(doc.id)}
              onDelete={showDelete ? () => onDelete!(doc.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Text-field group: groups multiple values for the same field type. */
function TextFieldGroup({ group, description, maxLength, filingState, onSave, onDelete }: {
  group: any;
  description?: string | null;
  maxLength?: number | null;
  filingState: string;
  onSave: (fieldId: string, value: string) => Promise<void>;
  onDelete: (fieldId: string) => void;
}) {
  const fields = group.fields || [];
  const canRemove = ['DOCUMENT_UPLOAD', 'PROCESSING', 'HALTED'].includes(filingState);
  const hasSiblingWithValue = fields.some((tf: any) => ['FILLED', 'REJECTED', 'APPROVED'].includes(tf.status));

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {group.field_type_name && (
        <div className="flex items-start gap-2 px-4 py-3 bg-amber-50/40 border-b border-slate-100">
          <Type className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h4 className="text-sm font-semibold text-slate-800">{group.field_type_name}</h4>
              <span className="text-xs text-slate-500 flex-shrink-0">({fields.length})</span>
            </div>
            {description && (
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{description}</p>
            )}
          </div>
        </div>
      )}
      <div className="divide-y divide-slate-100 px-4 py-1">
        {fields.map((tf: any) => {
          // Client may remove a row only if filing in DOCUMENT_UPLOAD/PROCESSING/HALTED,
          // this row has a value (FILLED or REJECTED), and at least one sibling has a value.
          const isRemovableStatus = tf.status === 'FILLED' || tf.status === 'REJECTED';
          const showDelete = canRemove && isRemovableStatus && hasSiblingWithValue;
          return (
            <TextFieldPlaceholder
              key={tf.id}
              field={tf}
              maxLength={maxLength || tf.field_type_max_length || 200}
              onSave={onSave}
              onDelete={showDelete ? () => onDelete(tf.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

function TextFieldPlaceholder({ field, maxLength, onSave, onDelete }: {
  field: any;
  maxLength: number;
  onSave: (fieldId: string, value: string) => Promise<void>;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = useState(field.status === 'PENDING');
  const [value, setValue] = useState(field.value || '');
  const [saving, setSaving] = useState(false);

  // Keep local state in sync if parent updates field
  useEffect(() => {
    setValue(field.value || '');
    if (field.status === 'PENDING') setEditing(true);
    if (field.status === 'APPROVED') setEditing(false);
  }, [field.value, field.status]);

  const status = field.status;
  const readOnly = status === 'APPROVED';
  const useTextarea = maxLength > 100;
  const trimmed = value.trim();
  const tooLong = value.length > maxLength;

  const statusConfig: Record<string, { iconColor: string; icon: any }> = {
    PENDING: { icon: Clock, iconColor: 'text-slate-400' },
    FILLED: { icon: Clock, iconColor: 'text-blue-500' },
    APPROVED: { icon: CheckCircle2, iconColor: 'text-emerald-500' },
    REJECTED: { icon: XCircle, iconColor: 'text-rose-500' },
  };
  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config.icon;

  const handleSave = async () => {
    if (!trimmed) { toast.error('Please enter a value'); return; }
    if (tooLong) { toast.error(`Max ${maxLength} characters`); return; }
    setSaving(true);
    try {
      await onSave(field.id, trimmed);
      setEditing(false);
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="py-3">
      <div className="flex items-start gap-3">
        <div className={`h-7 w-7 rounded-md flex items-center justify-center bg-slate-50 ${config.iconColor} flex-shrink-0 mt-0.5`}>
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        </div>

        {/* On mobile: column (content above, buttons below). On sm+: row (content left, buttons right). */}
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start sm:gap-3">
          {/* Text content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs font-medium text-slate-600">{field.field_type_name || 'Text Field'}</span>
              <StatusBadge status={status} size="sm" />
              <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">{value.length}/{maxLength}</span>
            </div>
            {readOnly ? (
              <div className="text-sm text-slate-800 whitespace-pre-wrap break-words bg-emerald-50/50 rounded-md border border-emerald-200 px-3 py-2">
                {field.value || <span className="italic text-slate-400">— empty —</span>}
              </div>
            ) : editing ? (
              <>
                {useTextarea ? (
                  <Textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    rows={3}
                    maxLength={maxLength}
                    placeholder="Enter your response…"
                    className="text-sm"
                  />
                ) : (
                  <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    maxLength={maxLength}
                    placeholder="Enter your response…"
                    className="text-sm h-9"
                  />
                )}
                {tooLong && (
                  <p className="text-[11px] text-rose-600">Value exceeds the {maxLength}-character limit.</p>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-800 whitespace-pre-wrap break-words bg-slate-50 rounded-md border border-slate-200 px-3 py-2">
                {field.value || <span className="italic text-slate-400">— not yet filled —</span>}
              </div>
            )}
            {status === 'REJECTED' && field.rejection_reason && (
              <p className="text-xs text-rose-600">Rejection reason: {field.rejection_reason}</p>
            )}
          </div>

          {/* Action buttons — below content on mobile, right column on desktop */}
          {(editing || (!editing && !readOnly && (status === 'FILLED' || status === 'REJECTED')) || onDelete) && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:gap-1.5 flex-shrink-0 sm:pt-0.5">
              {editing && !readOnly && (
                <>
                  <Button
                    size="sm"
                    className="h-9 sm:h-8 text-xs bg-emerald-600 hover:bg-emerald-700 flex-1 sm:flex-none"
                    disabled={saving || !trimmed || tooLong}
                    onClick={handleSave}
                  >
                    {saving ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                    Save
                  </Button>
                  {(field.value || '').length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 sm:h-8 text-xs"
                      disabled={saving}
                      onClick={() => { setValue(field.value || ''); setEditing(false); }}
                    >
                      Cancel
                    </Button>
                  )}
                </>
              )}
              {!editing && !readOnly && (status === 'FILLED' || status === 'REJECTED') && (
                <Button size="sm" variant="outline" className="h-9 sm:h-8 text-xs flex-1 sm:flex-none" onClick={() => setEditing(true)}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 sm:h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 px-3 sm:px-1.5"
                  onClick={onDelete}
                  title="Remove this row"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
