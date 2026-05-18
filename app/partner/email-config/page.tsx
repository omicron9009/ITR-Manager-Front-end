"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Mail, CheckCircle2, XCircle, ExternalLink, Upload, Send, Loader2, Copy } from "lucide-react";
import {
  getEmailConfig,
  setupEmailConfig,
  getEmailAuthUrl,
  authorizeEmail,
  uploadEmailToken,
  testEmailConfig,
  apiErr,
} from "@/lib/api";

interface EmailConfig {
  id: string;
  sender_email: string;
  is_configured: boolean;
  configured_by: string;
  created_at: string;
  updated_at: string;
}

export default function EmailConfigPage() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup form
  const [senderEmail, setSenderEmail] = useState("");
  const [credentialsJson, setCredentialsJson] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  // Auth flow
  const [authUrl, setAuthUrl] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Token upload
  const [tokenJson, setTokenJson] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);

  // Test
  const [testRecipient, setTestRecipient] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const fetchConfig = async () => {
    try {
      const data = await getEmailConfig();
      setConfig(data);
      if (data?.sender_email) setSenderEmail(data.sender_email);
    } catch {
      // No config yet — that's fine
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSetup = async () => {
    if (!senderEmail || !credentialsJson) {
      toast.error("Please provide both sender email and credentials JSON");
      return;
    }
    setSetupLoading(true);
    try {
      const data = await setupEmailConfig({ sender_email: senderEmail, credentials_json: credentialsJson });
      setConfig(data);
      toast.success("Email credentials saved. Now complete OAuth authorization.");
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleGetAuthUrl = async () => {
    setAuthLoading(true);
    try {
      const data = await getEmailAuthUrl();
      setAuthUrl(data.auth_url);
      toast.success(data.message || "Auth URL generated. Open it in your browser.");
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthorize = async () => {
    if (!authCode.trim()) {
      toast.error("Please enter the authorization code");
      return;
    }
    setAuthLoading(true);
    try {
      const data = await authorizeEmail(authCode.trim());
      setConfig(data);
      setAuthUrl("");
      setAuthCode("");
      toast.success("Email authorized successfully!");
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUploadToken = async () => {
    if (!tokenJson.trim()) {
      toast.error("Please paste the token JSON");
      return;
    }
    setTokenLoading(true);
    try {
      const data = await uploadEmailToken(tokenJson.trim());
      setConfig(data);
      setTokenJson("");
      toast.success("Token uploaded successfully!");
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setTokenLoading(false);
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
          Configure Gmail OAuth to send email notifications from the platform.
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
          {config ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Sender Email</span>
                <p className="font-medium text-slate-900">{config.sender_email}</p>
              </div>
              <div>
                <span className="text-slate-500">Last Updated</span>
                <p className="font-medium text-slate-900">
                  {new Date(config.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Status</span>
                <p className="font-medium text-slate-900">
                  {config.is_configured ? "Fully authorized" : "Pending authorization"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No email configuration found. Set up below.</p>
          )}
        </CardContent>
      </Card>

      {/* Step 1: Setup credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">1</span>
            Setup Credentials
          </CardTitle>
          <CardDescription>
            Provide your Gmail address and OAuth2 client credentials JSON from Google Cloud Console.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sender-email">Sender Email (Gmail)</Label>
            <Input
              id="sender-email"
              type="email"
              placeholder="notifications@yourdomain.com"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="credentials-json">Credentials JSON</Label>
            <textarea
              id="credentials-json"
              className="w-full h-32 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder='Paste the OAuth2 client credentials JSON content here...'
              value={credentialsJson}
              onChange={(e) => setCredentialsJson(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Download from Google Cloud Console → Credentials → OAuth 2.0 Client ID → Download JSON
            </p>
          </div>
          <Button onClick={handleSetup} disabled={setupLoading}>
            {setupLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Credentials
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: OAuth Authorization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">2</span>
            OAuth Authorization
          </CardTitle>
          <CardDescription>
            Generate an authorization URL, open it in your browser, authorize access, then paste the code below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={handleGetAuthUrl} disabled={authLoading || !config}>
            {authLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <ExternalLink className="h-4 w-4 mr-2" />
            Generate Auth URL
          </Button>

          {authUrl && (
            <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm font-medium text-slate-700">Open this URL in your browser and authorize:</p>
              <div className="flex items-center gap-2">
                <Input value={authUrl} readOnly className="text-xs font-mono" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(authUrl); toast.success("Copied!"); }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={authUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="auth-code">Authorization Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="auth-code"
                    placeholder="Paste the authorization code here"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                  />
                  <Button onClick={handleAuthorize} disabled={authLoading}>
                    {authLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Authorize
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alternative: Upload token directly */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-slate-500" />
            Alternative: Upload Token Directly
          </CardTitle>
          <CardDescription>
            If you already have a token JSON (generated locally), you can upload it directly instead of using the OAuth flow above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token-json">Token JSON</Label>
            <textarea
              id="token-json"
              className="w-full h-28 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder='Paste the OAuth token JSON here...'
              value={tokenJson}
              onChange={(e) => setTokenJson(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handleUploadToken} disabled={tokenLoading || !config}>
            {tokenLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Upload className="h-4 w-4 mr-2" />
            Upload Token
          </Button>
        </CardContent>
      </Card>

      {/* Step 3: Test */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">3</span>
            Test Configuration
          </CardTitle>
          <CardDescription>
            Send a test email to verify everything is working correctly.
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
            <p className="text-xs text-amber-600">Complete OAuth authorization first to test.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
