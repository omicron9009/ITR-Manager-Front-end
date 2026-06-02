// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Mail, CheckCircle2, XCircle, Send, Loader2, ShieldCheck } from "lucide-react";
import {
  getEmailConfig,
  setupEmailConfig,
  testEmailConfig,
  apiErr,
} from "@/lib/api";

interface EmailConfig {
  id: string;
  sender_email: string;
  is_configured: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  use_tls: boolean;
  configured_by: string;
  created_at: string;
  updated_at: string;
}

export default function EmailConfigPage() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // SMTP form
  const [senderEmail, setSenderEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [useTls, setUseTls] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);

  // Test
  const [testRecipient, setTestRecipient] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const fetchConfig = async () => {
    try {
      const data = await getEmailConfig();
      setConfig(data);
      if (data?.sender_email) setSenderEmail(data.sender_email);
      if (data?.smtp_host) setSmtpHost(data.smtp_host);
      if (data?.smtp_port) setSmtpPort(data.smtp_port);
      if (data?.smtp_user) setSmtpUser(data.smtp_user);
      if (data?.use_tls !== undefined) setUseTls(data.use_tls);
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSetup = async () => {
    if (!senderEmail || !smtpUser || !smtpPassword) {
      toast.error("Please fill in sender email, SMTP user, and password");
      return;
    }
    setSetupLoading(true);
    try {
      const data = await setupEmailConfig({
        sender_email: senderEmail,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_password: smtpPassword,
        use_tls: useTls,
      });
      setConfig(data);
      setSmtpPassword("");
      toast.success("SMTP configuration saved successfully!");
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleTest = async () => {
    if (!testRecipient) {
      toast.error("Please enter a recipient email");
      return;
    }
    setTestLoading(true);
    try {
      await testEmailConfig(testRecipient);
      toast.success(`Test email sent to ${testRecipient}`);
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setTestLoading(false);
    }
  };

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Email Configuration</h1>
        <p className="text-slate-500 mt-1">
          Configure SMTP settings to send email notifications from the platform.
        </p>
      </div>

      {/* Status card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">Current Status</CardTitle>
            <CardDescription>Email service configuration state</CardDescription>
          </div>
          {config?.is_configured ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              <XCircle className="h-3 w-3 mr-1" /> Not Configured
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {config?.is_configured ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Sender Email</span>
                <p className="font-medium text-slate-900">{config.sender_email}</p>
              </div>
              <div>
                <span className="text-slate-500">SMTP Server</span>
                <p className="font-medium text-slate-900">{config.smtp_host}:{config.smtp_port}</p>
              </div>
              <div>
                <span className="text-slate-500">Last Updated</span>
                <p className="font-medium text-slate-900">
                  {new Date(config.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No email configuration found. Set up below.</p>
          )}
        </CardContent>
      </Card>

      {/* Step 1: SMTP Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">1</span>
            SMTP Configuration
          </CardTitle>
          <CardDescription>
            Enter your SMTP credentials. For Gmail, use an App Password (enable 2FA first, then generate at{" "}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
              myaccount.google.com/apppasswords
            </a>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sender-email">Sender Email</Label>
              <Input
                id="sender-email"
                type="email"
                placeholder="notifications@yourdomain.com"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">SMTP Username</Label>
              <Input
                id="smtp-user"
                type="text"
                placeholder="Same as sender email for Gmail"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp-password">SMTP Password (App Password)</Label>
            <Input
              id="smtp-password"
              type="password"
              placeholder="Enter your App Password (16 characters for Gmail)"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              For Gmail: Enable 2-Step Verification → Generate App Password → Use the 16-character code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                type="text"
                placeholder="smtp.gmail.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP Port</Label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="587"
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-tls"
                  checked={useTls}
                  onCheckedChange={(checked) => setUseTls(checked === true)}
                />
                <Label htmlFor="use-tls" className="text-sm font-normal cursor-pointer">
                  Use TLS (STARTTLS)
                </Label>
              </div>
            </div>
          </div>

          <Button onClick={handleSetup} disabled={setupLoading}>
            {setupLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <ShieldCheck className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Test */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">2</span>
            Test Configuration
          </CardTitle>
          <CardDescription>
            Send a test email to verify your SMTP settings are working correctly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              disabled={!config?.is_configured}
            />
            <Button onClick={handleTest} disabled={testLoading || !config?.is_configured}>
              {testLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Send Test
            </Button>
          </div>
          {!config?.is_configured && (
            <p className="text-xs text-amber-600">Save SMTP configuration first to send a test email.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
