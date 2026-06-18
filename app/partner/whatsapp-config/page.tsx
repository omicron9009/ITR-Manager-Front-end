// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Square,
  Send,
  Trash2,
  RefreshCw,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Phone,
} from "lucide-react";
import {
  getWhatsAppConfig,
  deleteWhatsAppConfig,
  setupWhatsApp,
  startWhatsAppSession,
  stopWhatsAppSession,
  getWhatsAppSessionStatus,
  getWhatsAppQR,
  sendWhatsAppTest,
  apiErr,
} from "@/lib/api";

interface WhatsAppConfig {
  id: string;
  openwa_base_url: string;
  session_name: string;
  openwa_session_id: string | null;
  session_status: string;
  phone_number_e164: string | null;
  connected_at: string | null;
  last_qr_at: string | null;
  last_error: string | null;
  is_active: boolean;
  is_configured: boolean;
  configured_by: string;
  created_at: string;
  updated_at: string;
}

interface SessionStatus {
  session_id: string | null;
  status: string;
  phone_number_e164: string | null;
  connected_at: string | null;
  last_error: string | null;
}

interface QRResponse {
  qr_code: string | null;
  status: string;
}

function isConnectedStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === "connected" || s === "ready" || s === "authenticated";
}

function StatusBadge({ status }: { status: string }) {
  if (isConnectedStatus(status)) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
      </Badge>
    );
  }
  if (status === "qr_ready" || status === "QR_READY") {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
        <QrCode className="h-3 w-3 mr-1" /> QR Ready
      </Badge>
    );
  }
  if (status === "starting" || status === "STARTING") {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Starting
      </Badge>
    );
  }
  if (status === "error" || status === "ERROR") {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200">
        <AlertTriangle className="h-3 w-3 mr-1" /> Error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-slate-600 border-slate-300 bg-slate-50">
      <XCircle className="h-3 w-3 mr-1" /> {status || "Disconnected"}
    </Badge>
  );
}

export default function WhatsAppConfigPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [qrData, setQrData] = useState<QRResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup form
  const [openwaUrl, setOpenwaUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sessionName, setSessionName] = useState("itr-platform");
  const [setupLoading, setSetupLoading] = useState(false);

  // Session actions
  const [startLoading, setStartLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Test message
  const [testPhone, setTestPhone] = useState("");
  const [testText, setTestText] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const qrPollRef = useRef<NodeJS.Timeout | null>(null);

  const stopQrPoll = () => {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
  };

  const startQrPoll = () => {
    stopQrPoll();
    qrPollRef.current = setInterval(async () => {
      try {
        const qr: QRResponse = await getWhatsAppQR();
        setQrData(qr);
        if (qr.status !== "qr_ready" && qr.status !== "QR_READY") {
          stopQrPoll();
          // Refresh full status when QR scan completes
          fetchStatus();
        }
      } catch {
        stopQrPoll();
      }
    }, 2000);
  };

  const fetchStatus = async (): Promise<SessionStatus | null> => {
    setStatusLoading(true);
    try {
      const status: SessionStatus = await getWhatsAppSessionStatus();
      setSessionStatus(status);
      if (status.status === "qr_ready" || status.status === "QR_READY") {
        const qr: QRResponse = await getWhatsAppQR();
        setQrData(qr);
        startQrPoll();
      } else {
        setQrData(null);
        stopQrPoll();
      }
      return status;
    } catch {
      setSessionStatus(null);
      return null;
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const data: WhatsAppConfig = await getWhatsAppConfig();
      setConfig(data);
      if (data?.openwa_base_url) setOpenwaUrl(data.openwa_base_url);
      if (data?.session_name) setSessionName(data.session_name);
      if (data?.is_configured) {
        // Fetch live session status so isConnected is accurate on page load
        fetchStatus();
      }
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    return () => stopQrPoll();
  }, []);

  const handleSetup = async () => {
    if (!openwaUrl || !apiKey) {
      toast.error("Gateway URL and API key are required");
      return;
    }
    setSetupLoading(true);
    try {
      const data = await setupWhatsApp({
        openwa_base_url: openwaUrl,
        api_key: apiKey,
        session_name: sessionName || "itr-platform",
      });
      setConfig(data);
      setApiKey("");
      toast.success("WhatsApp gateway configured successfully!");
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleStart = async () => {
    setStartLoading(true);
    try {
      await startWhatsAppSession();
      toast.success("Session started — scan the QR code to connect.");
      // Poll until status leaves "starting" (QR takes ~10s to generate)
      let attempts = 0;
      let latest = await fetchStatus();
      while (
        (latest?.status === "starting" || latest?.status === "STARTING") &&
        attempts < 10
      ) {
        await new Promise((r) => setTimeout(r, 2000));
        latest = await fetchStatus();
        attempts++;
      }
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setStartLoading(false);
    }
  };

  const handleStop = async () => {
    setStopLoading(true);
    try {
      await stopWhatsAppSession();
      stopQrPoll();
      setQrData(null);
      toast.success("Session stopped.");
      await fetchStatus();
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setStopLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete the WhatsApp configuration? This will also stop the active session.")) return;
    setDeleteLoading(true);
    try {
      await deleteWhatsAppConfig();
      stopQrPoll();
      setConfig(null);
      setSessionStatus(null);
      setQrData(null);
      setOpenwaUrl("");
      setApiKey("");
      setSessionName("itr-platform");
      toast.success("WhatsApp configuration deleted.");
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone) {
      toast.error("Enter a phone number in E.164 format (e.g. +919876543210)");
      return;
    }
    setTestLoading(true);
    try {
      const result = await sendWhatsAppTest({ to_phone: testPhone, text: testText || undefined });
      if (result.sent) {
        toast.success(`Test message sent to ${testPhone}`);
      } else {
        toast.error(result.error || "Message failed to send");
      }
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setTestLoading(false);
    }
  };

  const isConnected =
    isConnectedStatus(sessionStatus?.status) ||
    isConnectedStatus(config?.session_status);

  const isQrReady =
    sessionStatus?.status === "qr_ready" ||
    sessionStatus?.status === "QR_READY";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">WhatsApp Configuration</h1>
          <p className="text-slate-500 mt-1">
            Connect your OpenWA gateway to send WhatsApp notifications to clients.
          </p>
        </div>
        {config?.is_configured && (
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteLoading} className="text-red-600 border-red-200 hover:bg-red-50">
            {deleteLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Remove Config
          </Button>
        )}
      </div>

      {/* Status card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="text-base">Current Status</CardTitle>
            <CardDescription>WhatsApp gateway and session state</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {config?.is_configured && sessionStatus && (
              <StatusBadge status={sessionStatus.status || config.session_status} />
            )}
            {!config?.is_configured && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                <XCircle className="h-3 w-3 mr-1" /> Not Configured
              </Badge>
            )}
            {config?.is_configured && (
              <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={statusLoading}>
                <RefreshCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {config?.is_configured ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Gateway URL</span>
                <p className="font-medium text-slate-900 truncate">{config.openwa_base_url}</p>
              </div>
              <div>
                <span className="text-slate-500">Session Name</span>
                <p className="font-medium text-slate-900">{config.session_name}</p>
              </div>
              <div>
                <span className="text-slate-500">Phone Number</span>
                <p className="font-medium text-slate-900">
                  {sessionStatus?.phone_number_e164 || config.phone_number_e164 || "—"}
                </p>
              </div>
              {(sessionStatus?.connected_at || config.connected_at) && (
                <div>
                  <span className="text-slate-500">Connected At</span>
                  <p className="font-medium text-slate-900">
                    {new Date(sessionStatus?.connected_at || config.connected_at!).toLocaleString()}
                  </p>
                </div>
              )}
              {(sessionStatus?.last_error || config.last_error) && (
                <div className="sm:col-span-2">
                  <span className="text-red-500">Last Error</span>
                  <p className="font-medium text-red-600 text-xs mt-0.5">
                    {sessionStatus?.last_error || config.last_error}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No WhatsApp configuration found. Set up the gateway below.</p>
          )}
        </CardContent>
      </Card>

      {/* Step 1: Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">1</span>
            Gateway Configuration
          </CardTitle>
          <CardDescription>
            Enter your OpenWA gateway URL and admin API key. Any existing configuration will be replaced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openwa-url">OpenWA Gateway URL</Label>
            <Input
              id="openwa-url"
              type="url"
              placeholder="https://your-openwa-instance.example.com"
              value={openwaUrl}
              onChange={(e) => setOpenwaUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key">Admin API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your OpenWA admin API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              The key is validated against OpenWA before being encrypted and saved.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              type="text"
              placeholder="itr-platform"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>
          <Button onClick={handleSetup} disabled={setupLoading}>
            {setupLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <ShieldCheck className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">2</span>
            Session Management
          </CardTitle>
          <CardDescription>
            Start a session to generate a QR code, then scan it with WhatsApp on your phone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleStart}
              disabled={startLoading || !config?.is_configured || isConnected}
            >
              {startLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Start Session
            </Button>
            <Button
              variant="outline"
              onClick={handleStop}
              disabled={stopLoading || !config?.is_configured}
            >
              {stopLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Square className="h-4 w-4 mr-2" />}
              Stop Session
            </Button>
          </div>

          {!config?.is_configured && (
            <p className="text-xs text-amber-600">Save gateway configuration first to manage sessions.</p>
          )}

          {/* QR Code display */}
          {isQrReady && qrData?.qr_code && (
            <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                <QrCode className="h-4 w-4" />
                Scan this QR code with WhatsApp
              </div>
              <img
                src={qrData.qr_code}
                alt="WhatsApp QR Code"
                className="w-48 h-48 rounded-lg border border-blue-200 bg-white"
              />
              <p className="text-xs text-blue-600 text-center">
                Open WhatsApp → Linked Devices → Link a Device, then scan above.
                <br />
                QR refreshes automatically every ~2s.
              </p>
            </div>
          )}

          {isConnected && (
            <div className="mt-2 flex items-center gap-2 text-emerald-700 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              WhatsApp is connected
              {(sessionStatus?.phone_number_e164 || config?.phone_number_e164) && (
                <span className="font-medium">
                  — {sessionStatus?.phone_number_e164 || config?.phone_number_e164}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Test Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">3</span>
            Send Test Message
          </CardTitle>
          <CardDescription>
            Verify the integration by sending a test WhatsApp message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">Phone Number (E.164)</Label>
              <Input
                id="test-phone"
                type="text"
                placeholder="+919876543210"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                disabled={!isConnected}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-text">Message (optional)</Label>
              <Input
                id="test-text"
                type="text"
                placeholder="Hello from ITR platform!"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                disabled={!isConnected}
              />
            </div>
          </div>
          <Button onClick={handleTest} disabled={testLoading || !isConnected}>
            {testLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send Test Message
          </Button>
          {!isConnected && config?.is_configured && (
            <p className="text-xs text-amber-600">Start and connect a session before sending test messages.</p>
          )}
          {!config?.is_configured && (
            <p className="text-xs text-amber-600">Configure the gateway and connect a session first.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
