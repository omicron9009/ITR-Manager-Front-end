// Centralized API client. All calls go through here.
import axios, { AxiosError, AxiosInstance } from 'axios';
import { getToken, clearAuth } from './auth';
import { toast } from 'sonner';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
      clearAuth();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
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
export const haltFiling = (id: string, reason: string) => api.post(`/api/v1/filings/${id}/halt`, { reason }).then((r) => r.data);
export const submitDocs = (id: string) => api.post(`/api/v1/filings/${id}/submit-documents`).then((r) => r.data);
export const markPayment = (id: string) => api.post(`/api/v1/filings/${id}/mark-payment`).then((r) => r.data);
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
export const approveComp = (computation_id: string) => api.post('/api/v1/computations/approve', { computation_id }).then((r) => r.data);
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

// ---------- STORAGE ----------
export const storageDownloadUrl = (file_id: string) => api.get(`/api/v1/storage/${file_id}/download-url`).then((r) => r.data);
export const completedDocs = (filing_id: string) => api.get(`/api/v1/storage/completed-docs/${filing_id}`).then((r) => r.data);
export const completedDocUploadUrl = (params: any) => api.post('/api/v1/storage/completed-doc/upload-url', null, { params }).then((r) => r.data);
export const completedDocConfirm = (params: any) => api.post('/api/v1/storage/completed-doc/confirm', null, { params }).then((r) => r.data);
export const onboardingUploadUrl = (params: any) => api.post('/api/v1/storage/onboarding-upload-url', null, { params }).then((r) => r.data);
export const confirmOnboardingUpload = (params: any) => api.post('/api/v1/storage/confirm-onboarding-upload', null, { params }).then((r) => r.data);
