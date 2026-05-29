// Centralized API client. All calls go through here.
import axios, { AxiosError, AxiosInstance } from 'axios';
import { getToken, clearAuth } from './auth';
import { toast } from 'sonner';

function getBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || '__NEXT_PUBLIC_API_URL__';
  // If the placeholder was never replaced at runtime, fall back to localhost
  if (url.startsWith('__')) return 'http://localhost:8000';
  // Fix malformed URLs like "http:host" or "https:host" (missing //)
  url = url.replace(/^(https?):(?!\/\/)/, '$1://');
  // Ensure the URL starts with a protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  // Remove trailing slash
  return url.replace(/\/$/, '');
}

const BASE = getBaseUrl();

export const api: AxiosInstance = axios.create({
  baseURL: BASE,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t && config.headers) config.headers['Authorization'] = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<any>) => {
    const status = err.response?.status;
    if (status === 401) {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (!path.startsWith('/auth')) {
          clearAuth();
          window.location.href = '/auth/login';
        }
      }
    } else if (status === 403) {
      toast.error('Access denied');
    }
    return Promise.reject(err);
  }
);

export const apiErr = (e: any): string => e?.response?.data?.detail || e?.response?.data?.message || e?.message || 'Something went wrong';

// ---------- AUTH ----------
export const login = (email: string, password: string) =>
  api.post('/api/v1/auth/login', { email, password }).then((r) => r.data);
export const me = () => api.get('/api/v1/auth/me').then((r) => r.data);
export const resetPassword = (data: { email: string; recovery_code: string; new_password: string }) =>
  api.post('/api/v1/auth/reset-password', data).then((r) => r.data);
export const changePassword = (data: { old_password: string; new_password: string }) =>
  api.post('/api/v1/auth/change-password', data).then((r) => r.data);
export const changeEmail = (data: { new_email: string; password: string }) =>
  api.post('/api/v1/auth/change-email', data).then((r) => r.data);
export const adminGenerateRecoveryCodes = (data: { email: string }) =>
  api.post('/api/v1/auth/admin/generate-recovery-codes', data).then((r) => r.data);
export const regenerateRecoveryCodes = () =>
  api.post('/api/v1/auth/regenerate-recovery-codes').then((r) => r.data);

// ---------- CLIENTS ----------
export const registerClient = (payload: any) =>
  api.post('/api/v1/clients/register', payload).then((r) => r.data);
export const listClients = (params: any = {}) =>
  api.get('/api/v1/clients', { params }).then((r) => r.data);
export const getClient = (id: string) => api.get(`/api/v1/clients/${id}`).then((r) => r.data);
export const updateClientProfile = (id: string, data: any) => api.put(`/api/v1/clients/${id}/profile`, data).then((r) => r.data);
export const activateClient = (client_id: string) => api.post('/api/v1/clients/activate', { client_id }).then((r) => r.data);
export const rejectClient = (client_id: string, reason: string) => api.post('/api/v1/clients/reject', { client_id, reason }).then((r) => r.data);

// ---------- DASHBOARD ----------
export const getSummary = () => api.get('/api/v1/dashboard/summary').then((r) => r.data);
export const getPendingVerification = () => api.get('/api/v1/dashboard/pending-verification').then((r) => r.data);
export const getFilingsByStatus = (status: string, page = 1, page_size = 20) =>
  api.get('/api/v1/dashboard/filings-by-status', { params: { status, page, page_size } }).then((r) => r.data);
export const getPartnerAnalytics = () => api.get('/api/v1/dashboard/analytics/partner').then((r) => r.data);
export const getExecutiveAnalytics = () => api.get('/api/v1/dashboard/analytics/executive').then((r) => r.data);
export const getClientAnalytics = () => api.get('/api/v1/dashboard/analytics/client').then((r) => r.data);
export const getClientDashboard = () => api.get('/api/v1/dashboard/client').then((r) => r.data);
export const getFilingDirectory = (filing_id: string) => api.get(`/api/v1/dashboard/directory/${filing_id}`).then((r) => r.data);
export const getExecutiveWorkload = () => api.get('/api/v1/dashboard/executive-workload').then((r) => r.data);

// ---------- FILINGS ----------
export const initiateFiling = (data: any) => api.post('/api/v1/filings/initiate', data).then((r) => r.data);
export const listFilings = (params: any = {}) => api.get('/api/v1/filings', { params }).then((r) => r.data);
export const getFiling = (id: string) => api.get(`/api/v1/filings/${id}`).then((r) => r.data);
export const transitionFiling = (id: string, data: any) => api.post(`/api/v1/filings/${id}/transition`, data).then((r) => r.data);

export const submitDocs = (id: string) => api.post(`/api/v1/filings/${id}/submit-documents`).then((r) => r.data);
export const markPayment = (id: string) => api.post(`/api/v1/filings/${id}/mark-payment`).then((r) => r.data);
export const moveToComputation = (id: string) => api.post(`/api/v1/filings/${id}/move-to-computation`).then((r) => r.data);
export const myTracking = () => api.get('/api/v1/filings/my/tracking').then((r) => r.data);
export const getFilingHistory = (id: string) => api.get(`/api/v1/filings/${id}/history`).then((r) => r.data);

// ---------- DOCUMENTS ----------
export const listDocTypes = (includeInactive = false) => api.get('/api/v1/documents/types', { params: { include_inactive: includeInactive } }).then((r) => r.data);
export const createDocType = (data: any) => api.post('/api/v1/documents/types', data).then((r) => r.data);
export const updateDocType = (id: string, data: any) => api.put(`/api/v1/documents/types/${id}`, data).then((r) => r.data);
export const assignDocs = (filing_id: string, document_type_ids: string[]) =>
  api.post(`/api/v1/documents/filings/${filing_id}/assign`, { document_type_ids }).then((r) => r.data);
export const filingDocs = (filing_id: string) => api.get(`/api/v1/documents/filings/${filing_id}`).then((r) => r.data);
export const docUploadUrl = (data: { document_id: string; filename: string; content_type: string }) =>
  api.post('/api/v1/documents/upload-url', data).then((r) => r.data);
export const docConfirmUpload = (params: any) => api.post('/api/v1/documents/confirm-upload', null, { params }).then((r) => r.data);
export const docDownloadUrl = (id: string) => api.get(`/api/v1/documents/${id}/download-url`).then((r) => r.data);
export const approveDoc = (document_ids: string[]) => api.post('/api/v1/documents/approve', { document_ids }).then((r) => r.data);
export const rejectDoc = (rejections: { document_id: string; reason: string }[]) =>
  api.post('/api/v1/documents/reject', { rejections }).then((r) => r.data);

// ---------- COMPUTATIONS ----------
export const compUploadUrl = (data: any) => api.post('/api/v1/computations/upload-url', data).then((r) => r.data);
export const compConfirm = (params: any) => api.post('/api/v1/computations/confirm-upload', null, { params }).then((r) => r.data);
export const compForFiling = (filing_id: string) => api.get(`/api/v1/computations/filing/${filing_id}`).then((r) => r.data);
export const approveComp = (computation_id: string, is_tax_paid: boolean = false) => api.post('/api/v1/computations/approve', { computation_id, is_tax_paid }).then((r) => r.data);
export const confirmTaxPaid = (computation_id: string) => api.post('/api/v1/computations/approve', { computation_id, is_tax_paid: true }).then((r) => r.data);
export const rejectComp = (computation_id: string, reason: string) => api.post('/api/v1/computations/reject', { computation_id, reason }).then((r) => r.data);
export const compDownloadUrl = (id: string) => api.get(`/api/v1/computations/${id}/download-url`).then((r) => r.data);

// ---------- EXECUTIVES ----------
export const listExecutives = () => api.get('/api/v1/executives').then((r) => r.data);
export const createExecutive = (data: any) => api.post('/api/v1/executives', data).then((r) => r.data);
export const assignExecutive = (client_id: string, executive_id: string) =>
  api.post('/api/v1/executives/assign', { client_id, executive_id }).then((r) => r.data);
export const deactivateExec = (id: string) => api.post(`/api/v1/executives/${id}/deactivate`).then((r) => r.data);
export const reactivateExec = (id: string) => api.post(`/api/v1/executives/${id}/reactivate`).then((r) => r.data);
export const execClients = (id: string) => api.get(`/api/v1/executives/${id}/clients`).then((r) => r.data);

// ---------- ONBOARDING ----------
export const listFields = (includeInactive = false) => api.get('/api/v1/onboarding/fields', { params: { include_inactive: includeInactive } }).then((r) => r.data);
export const createField = (data: any) => api.post('/api/v1/onboarding/fields', data).then((r) => r.data);
export const updateField = (id: string, data: any) => api.put(`/api/v1/onboarding/fields/${id}`, data).then((r) => r.data);
export const deleteField = (id: string) => api.delete(`/api/v1/onboarding/fields/${id}`).then((r) => r.data);
export const getOnboardingForm = () => api.get('/api/v1/onboarding/form').then((r) => r.data);
export const getClientOnboardingForm = (client_id: string) => api.get(`/api/v1/onboarding/form/${client_id}`).then((r) => r.data);
export const submitOnboardingForm = (form_data: any) => api.post('/api/v1/onboarding/form/submit', { form_data }).then((r) => r.data);

// ---------- NOTIFICATIONS ----------
export const listNotifications = (params: any = {}) => api.get('/api/v1/notifications', { params }).then((r) => r.data);
export const getUnreadCount = () => api.get('/api/v1/notifications/unread-count').then((r) => r.data);
export const markRead = (notification_ids: string[]) => api.post('/api/v1/notifications/mark-read', { notification_ids }).then((r) => r.data);
export const markAllRead = () => api.post('/api/v1/notifications/mark-all-read').then((r) => r.data);

// ---------- AUDIT ----------
export const listAudit = (params: any = {}) => api.get('/api/v1/audit/logs', { params }).then((r) => r.data);
export const generateAuditReport = (params: any = {}) => api.post('/api/v1/audit/generate-report', null, { params, responseType: 'blob' });

// ---------- EMAIL CONFIG ----------
export const getEmailConfig = () => api.get('/api/v1/email/config').then((r) => r.data);
export const setupEmailConfig = (data: { sender_email: string; credentials_json: string }) =>
  api.post('/api/v1/email/setup', data).then((r) => r.data);
export const getEmailAuthUrl = () => api.post('/api/v1/email/auth-url').then((r) => r.data);
export const authorizeEmail = (auth_code: string) =>
  api.post('/api/v1/email/authorize', null, { params: { auth_code } }).then((r) => r.data);
export const uploadEmailToken = (token_json: string) =>
  api.post('/api/v1/email/token', { token_json }).then((r) => r.data);
export const testEmailConfig = (test_recipient: string) =>
  api.post('/api/v1/email/test', { test_recipient }).then((r) => r.data);

// ---------- STORAGE ----------
export const storageDownloadUrl = (file_id: string) => api.get(`/api/v1/storage/${file_id}/download-url`).then((r) => r.data);
export const getOnboardingFiles = (client_id?: string) => api.get('/api/v1/storage/onboarding-files', { params: client_id ? { client_id } : {} }).then((r) => r.data);
export const completedDocs = (filing_id: string) => api.get(`/api/v1/storage/completed-docs/${filing_id}`).then((r) => r.data);
export const completedDocUploadUrl = (params: any) => api.post('/api/v1/storage/completed-doc/upload-url', null, { params }).then((r) => r.data);
export const completedDocConfirm = (params: any) => api.post('/api/v1/storage/completed-doc/confirm', null, { params }).then((r) => r.data);
export const onboardingUploadUrl = (params: any) => api.post('/api/v1/storage/onboarding-upload-url', null, { params }).then((r) => r.data);
export const confirmOnboardingUpload = (params: any) => api.post('/api/v1/storage/confirm-onboarding-upload', null, { params }).then((r) => r.data);

// ---------- TAGS ----------
export const createTag = (data: { name: string; tag_type: string; description?: string }) =>
  api.post('/api/v1/tags', data).then((r) => r.data);
export const listTags = (tag_type?: string) =>
  api.get('/api/v1/tags', { params: tag_type ? { type: tag_type } : {} }).then((r) => r.data);
export const updateTag = (id: string, data: any) =>
  api.patch(`/api/v1/tags/${id}`, data).then((r) => r.data);
export const deleteTag = (id: string) =>
  api.delete(`/api/v1/tags/${id}`).then((r) => r.data);
export const assignTag = (executive_id: string, tag_id: string) =>
  api.post('/api/v1/tags/assign', { executive_id, tag_id }).then((r) => r.data);
export const bulkAssignTag = (executive_ids: string[], tag_id: string) =>
  api.post('/api/v1/tags/bulk-assign', { executive_ids, tag_id }).then((r) => r.data);
export const unassignTag = (executive_id: string, tag_id: string) =>
  api.delete(`/api/v1/tags/assign/${executive_id}/${tag_id}`).then((r) => r.data);
export const listExecutivesWithTags = () =>
  api.get('/api/v1/tags/executives').then((r) => r.data);
export const getExecutiveTags = (executive_id: string) =>
  api.get(`/api/v1/tags/executives/${executive_id}`).then((r) => r.data);
export const getMyTags = () =>
  api.get('/api/v1/tags/my-tags').then((r) => r.data);
export const getLocationSummary = () =>
  api.get('/api/v1/tags/summary/location').then((r) => r.data);
export const getLocationDetail = (tag_id: string) =>
  api.get(`/api/v1/tags/summary/location/${tag_id}`).then((r) => r.data);

// ---------- REPORTS ----------
export const getReportDashboard = (fy?: string) =>
  api.get('/api/v1/reports/dashboard', { params: fy ? { fy } : {} }).then((r) => r.data);
export const downloadReport = (fy?: string) =>
  api.get('/api/v1/reports/download', { params: fy ? { fy } : {}, responseType: 'blob' });

// ---------- ACTION ITEMS ----------
export const getActionItems = (params?: { type?: string; filing_id?: string }) =>
  api.get('/api/v1/action-items', { params }).then((r) => r.data);

// ---------- MANAGERS ----------
export const listManagers = () => api.get('/api/v1/managers').then((r) => r.data);
export const createManager = (data: { full_name: string; email: string; password: string }) =>
  api.post('/api/v1/managers', data).then((r) => r.data);
export const getMyTeam = () => api.get('/api/v1/managers/me/team').then((r) => r.data);
export const getManagerTeam = (manager_id: string) =>
  api.get(`/api/v1/managers/${manager_id}/team`).then((r) => r.data);
export const assignExecutiveToManager = (manager_id: string, executive_id: string) =>
  api.post(`/api/v1/managers/${manager_id}/assign-executive`, { executive_id }).then((r) => r.data);
export const removeExecutiveFromManager = (manager_id: string, executive_id: string) =>
  api.delete(`/api/v1/managers/${manager_id}/executives/${executive_id}`).then((r) => r.data);
export const managerAssignClient = (manager_id: string, data: { client_id: string; executive_id: string }) =>
  api.post(`/api/v1/managers/${manager_id}/assign-client`, data).then((r) => r.data);
export const assignClientToManager = (manager_id: string, client_id: string) =>
  api.post(`/api/v1/managers/${manager_id}/clients`, { client_id }).then((r) => r.data);
export const removeClientFromManager = (manager_id: string, client_id: string) =>
  api.delete(`/api/v1/managers/${manager_id}/clients/${client_id}`).then((r) => r.data);
export const getMyClients = (params?: { page?: number; page_size?: number; search?: string }) =>
  api.get('/api/v1/managers/me/clients', { params }).then((r) => r.data);
export const getManagerClients = (manager_id: string, params?: { page?: number; page_size?: number; search?: string }) =>
  api.get(`/api/v1/managers/${manager_id}/clients`, { params }).then((r) => r.data);
export const assignTagToManager = (manager_id: string, tag_id: string) =>
  api.post(`/api/v1/managers/${manager_id}/tags`, { tag_id }).then((r) => r.data);
export const removeTagFromManager = (manager_id: string, tag_id: string) =>
  api.delete(`/api/v1/managers/${manager_id}/tags/${tag_id}`).then((r) => r.data);
export const getManagerTags = (manager_id: string) =>
  api.get(`/api/v1/managers/${manager_id}/tags`).then((r) => r.data);

// ---------- COMPUTATION MULTI-STEP APPROVAL ----------
export const managerApproveComp = (computation_id: string) =>
  api.post('/api/v1/computations/manager-approve', { computation_id }).then((r) => r.data);
export const managerRejectComp = (computation_id: string, reason: string) =>
  api.post('/api/v1/computations/manager-reject', { computation_id, reason }).then((r) => r.data);
export const partnerApproveComp = (computation_id: string) =>
  api.post('/api/v1/computations/partner-approve', { computation_id }).then((r) => r.data);
export const partnerRejectComp = (computation_id: string, reason: string) =>
  api.post('/api/v1/computations/partner-reject', { computation_id, reason }).then((r) => r.data);
