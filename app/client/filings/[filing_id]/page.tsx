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
import { getFiling, filingDocs, docUploadUrl, docConfirmUpload, docDownloadUrl, deleteDoc, compForFiling, compDownloadUrl, approveComp, rejectComp, confirmTaxPaid, completedDocs, storageDownloadUrl, submitDocs, approveFilingFee, rejectFilingFee, getClient, submitFeedback, getFilingFeedback, listOtherDocs } from '@/lib/api';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Upload, FileText, Download, Eye, CheckCircle2, XCircle, Clock, RefreshCw, Loader2, FolderOpen, Calculator, Send, X, IndianRupee, Plus, Trash2, Star } from 'lucide-react';

export default function FilingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const filingId = params.filing_id as string;

  const [filing, setFiling] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [docGroups, setDocGroups] = useState<any[]>([]);
  const [docsMeta, setDocsMeta] = useState<any>({});
  const [computations, setComputations] = useState<any[]>([]);
  const [currentComp, setCurrentComp] = useState<any>(null);
  const [hasInternalWorkings, setHasInternalWorkings] = useState(false);
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

      const state = f?.status;
      if (state === 'COMPUTATION' || state === 'FILING' || state === 'PAYMENT' || state === 'COMPLETED') {
        const c = await compForFiling(filingId);
        setComputations(c?.items || []);
        setCurrentComp(c?.current_version || null);
        setHasInternalWorkings(!!c?.has_internal_workings);
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
      // Check feedback for filings past FILING state (PAYMENT or COMPLETED)
      if (state === 'PAYMENT' || state === 'COMPLETED') {
        if (isFeedbackDoneLocally()) {
          setFeedbackGiven(true);
        } else {
          getFilingFeedback(filingId).then(() => markFeedbackDone()).catch((err) => {
            if (err?.response?.status === 404) setFeedbackGiven(false);
            else setFeedbackGiven(true); // on error, don't block
          });
        }
      } else {
        setFeedbackGiven(true); // not past FILING, no gate needed
      }
    } catch (e: any) {
      toast.error('Failed to load filing');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (filingId) load(); }, [filingId]);

  const onUpload = async (docId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf','doc','docx','xls','xlsx','csv','png','jpg','jpeg'].includes(ext)) { toast.error('Allowed types: PDF, Word, Excel, CSV, PNG, JPG'); return; }
    setUploading(docId);
    try {
      const url = await docUploadUrl({ document_id: docId, filename: file.name, content_type: file.type });
      await axios.put(url.upload_url, file, { headers: { 'Content-Type': file.type } });
      await docConfirmUpload({ document_id: url.document_id || docId, object_key: url.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      toast.success('Document uploaded');
      // Update the specific doc in-place instead of reloading the whole page
      setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, status: 'UPLOADED', original_filename: file.name } : d));
      setDocGroups((prev) => prev.map((g) => ({
        ...g,
        files: (g.files || []).map((d: any) => d.id === docId ? { ...d, status: 'UPLOADED', original_filename: file.name } : d),
      })));
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(null); }
  };

  const onUploadAdditional = async (documentTypeId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf','doc','docx','xls','xlsx','csv','png','jpg','jpeg'].includes(ext)) { toast.error('Allowed types: PDF, Word, Excel, CSV, PNG, JPG'); return; }
    setUploading(documentTypeId);
    try {
      const url = await docUploadUrl({ filing_id: filingId, document_type_id: documentTypeId, filename: file.name, content_type: file.type });
      await axios.put(url.upload_url, file, { headers: { 'Content-Type': file.type } });
      await docConfirmUpload({ document_id: url.document_id, object_key: url.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      toast.success('Additional document uploaded');
      // Add the new doc in-place instead of full page reload
      const newDoc = { id: url.document_id, document_type_id: documentTypeId, status: 'UPLOADED', original_filename: file.name };
      setDocs((prev) => [...prev, newDoc]);
      setDocGroups((prev) => prev.map((g) => g.document_type_id === documentTypeId ? { ...g, files: [...(g.files || []), newDoc] } : g));
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
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/client/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">ITR Filing &middot; {filing.financial_year}</h1>
          <p className="text-sm text-slate-500">Initiated {new Date(filing.initiated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <StatusBadge status={state} />
      </div>

      {/* Professional Fee + Engagement Info */}
      {filing.professional_fee && (
        <Card className="rounded-xl p-4 flex items-center gap-3 border-indigo-100 bg-indigo-50/40">
          <IndianRupee className="h-5 w-5 text-indigo-600" />
          <div>
            <div className="text-sm font-semibold text-indigo-900">Professional Fee: ₹{Number(filing.professional_fee).toLocaleString('en-IN')}</div>
            {filing.engagement_accepted_at && <div className="text-xs text-indigo-600">Engagement accepted on {new Date(filing.engagement_accepted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
          </div>
        </Card>
      )}

      {/* Proposed Fee Change Banner */}
      {filing.proposed_fee && (
        <Card className="rounded-xl p-4 border-amber-200 bg-amber-50/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-amber-700" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-900">Fee Change Proposed</div>
              <div className="text-xs text-amber-700 mt-0.5">
                Your CA has proposed a revised fee of <span className="font-bold">₹{Number(filing.proposed_fee).toLocaleString('en-IN')}</span>
                {filing.professional_fee && <> (current: ₹{Number(filing.professional_fee).toLocaleString('en-IN')})</>}
              </div>
              {filing.fee_proposed_at && <div className="text-[10px] text-amber-600 mt-0.5">Proposed on {new Date(filing.fee_proposed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={acting}
              onClick={async () => {
                setActing(true);
                try {
                  await approveFilingFee(filingId);
                  toast.success('Fee change approved. Engagement letter updated.');
                  load();
                } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to approve'); }
                finally { setActing(false); }
              }}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-rose-300 text-rose-700 hover:bg-rose-50"
              disabled={acting}
              onClick={async () => {
                setActing(true);
                try {
                  await rejectFilingFee(filingId);
                  toast.success('Fee change rejected.');
                  load();
                } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to reject'); }
                finally { setActing(false); }
              }}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        </Card>
      )}

      {/* Progress */}
      <Card className="rounded-xl p-5">
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
      </Card>

      {/* Payment QR - shown in PAYMENT state */}
      {state === 'PAYMENT' && (
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
          <div className="flex flex-wrap gap-4">
            {docGroups.map((group) => (
              <DocumentTypeGroup
                key={group.document_type_id}
                group={group}
                filingId={filingId}
                filingState={state}
                uploading={uploading}
                onUpload={onUpload}
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
                onView={() => onDownloadDoc(doc.id)}
                onDelete={() => onDeleteDoc(doc.id)}
              />
            ))}
          </div>
        )}
      </Card>

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
          {currentComp && (currentComp.status === 'APPROVED' || currentComp.status === 'CLIENT_APPROVED') && !filing.is_tax_paid && state === 'COMPUTATION' && !hasInternalWorkings && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-slate-500 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-slate-700">Awaiting Internal Documents</div>
                <div className="text-xs text-slate-500 mt-0.5">Your CA is preparing required internal documents. Tax payment confirmation will be available once they are ready.</div>
              </div>
            </div>
          )}
          {currentComp && (currentComp.status === 'APPROVED' || currentComp.status === 'CLIENT_APPROVED') && !filing.is_tax_paid && state === 'COMPUTATION' && hasInternalWorkings && (
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
                I Confirm that Tax has been Paid 
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">v{c.version}</span>
                    <span className="text-slate-700 truncate">{c.original_filename || 'computation'}</span>
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

      {/* Completed Documents (filed) */}
      {completed.length > 0 && (
        <Card className="rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="font-bold text-slate-900">Filed Documents</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {completed.map((d: any) => (
              <div key={d.id} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <div>
                    <div className="font-medium text-sm text-slate-900">{{ ITR_ACKNOWLEDGEMENT: 'ITR Acknowledgement', INVOICE: 'Invoice', ITR_JSON: 'ITR JSON', ITR_FORM: 'ITR Form', TAX_PAID_COMPUTATION: 'Tax Paid Computation', FINANCIAL_STATEMENT: 'Financial Statement' }[d.doc_type] || d.doc_type || d.original_filename || 'Document'}</div>
                    <div className="text-xs text-slate-500">{d.original_filename || d.filename}</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onDownloadStorage(d.id)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Other Documents */}
      {otherDocs.length > 0 && (
        <Card className="rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900">Other Documents</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {otherDocs.map((d: any) => (
              <div key={d.id} className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <div>
                    <div className="font-medium text-sm text-slate-900">{d.label || d.filename || 'Document'}</div>
                    {d.label && d.filename && <div className="text-xs text-slate-500">{d.filename}</div>}
                    {d.uploaded_at && <div className="text-[10px] text-slate-400">{new Date(d.uploaded_at).toLocaleDateString('en-IN')}</div>}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onDownloadStorage(d.file_id || d.id)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
              </div>
            ))}
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
function DocumentPlaceholder({ doc, uploading, onUpload, onView, onDelete }: { doc: any; uploading: boolean; onUpload: (f: File) => void; onView: () => void; onDelete?: () => void }) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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
    <div className="flex items-center gap-3 py-2">
      <div className={`h-7 w-7 rounded-md flex items-center justify-center bg-slate-50 ${config.iconColor} flex-shrink-0`}>
        {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-slate-900 truncate">{doc.original_filename || doc.document_type_name || 'Document'}</p>
          <StatusBadge status={status} size="sm" />
        </div>
        {pendingFile && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 bg-amber-50 rounded px-2 py-0.5 border border-amber-200 w-fit">
            <Upload className="h-3 w-3" />
            <span className="truncate max-w-[150px]">{pendingFile.name}</span>
            <button className="text-rose-500 hover:text-rose-700 ml-1 flex-shrink-0" onClick={() => setPendingFile(null)}>✕</button>
          </div>
        )}
        {status === 'REJECTED' && doc.rejection_reason && (
          <p className="text-xs text-rose-600 mt-0.5 truncate">{doc.rejection_reason}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {(status === 'PENDING_UPLOAD' || status === 'REJECTED') && !pendingFile && (
          <label>
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); e.target.value = ''; }} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" />
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors">
              <Upload className="h-3 w-3" /> {status === 'REJECTED' ? 'Re-upload' : 'Upload'}
            </span>
          </label>
        )}
        {pendingFile && (
          <Button size="sm" className="relative overflow-visible bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-md text-xs h-7" disabled={uploading} onClick={() => { onUpload(pendingFile); setPendingFile(null); }}>
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-lg animate-bounce pointer-events-none">
              Click to confirm
              <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
            </span>
            {uploading ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
            Confirm
          </Button>
        )}
        {(status === 'UPLOADED' || status === 'APPROVED') && (
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={onView}>
            <Eye className="h-3 w-3 mr-1" /> View
          </Button>
        )}
        {onDelete && (status === 'PENDING_UPLOAD' || status === 'UPLOADED') && (
          <Button size="sm" variant="outline" className="text-xs h-7 text-rose-600 border-rose-200 hover:bg-rose-50 px-1.5" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** Document type group - shows all files for a single document type with "Add Another" */
function DocumentTypeGroup({ group, filingId, filingState, uploading, onUpload, onUploadAdditional, onView, onDelete }: {
  group: any;
  filingId: string;
  filingState: string;
  uploading: string | null;
  onUpload: (docId: string, file: File) => void;
  onUploadAdditional: (typeId: string, file: File) => void;
  onView: (docId: string) => void;
  onDelete: (docId: string) => void;
}) {
  const files = group.files || [];
  const canUploadMore = ['INITIATED', 'DOCUMENT_UPLOAD', 'PROCESSING'].includes(filingState);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden w-96 flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-500" />
          <h4 className="text-sm font-semibold text-slate-800 truncate">{group.document_type_name}</h4>
          <span className="text-xs text-slate-500 flex-shrink-0">({files.length})</span>
        </div>
        {canUploadMore && (
          <label>
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadAdditional(group.document_type_id, f); e.target.value = ''; }} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" />
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer transition-colors">
              <Plus className="h-3 w-3" /> Add
            </span>
          </label>
        )}
      </div>
      <div className="divide-y divide-slate-100 px-4 py-1">
        {files.map((doc: any) => (
          <DocumentPlaceholder
            key={doc.id}
            doc={doc}
            uploading={uploading === doc.id}
            onUpload={(file) => onUpload(doc.id, file)}
            onView={() => onView(doc.id)}
            onDelete={files.length > 1 || doc.status === 'PENDING_UPLOAD' ? () => onDelete(doc.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
