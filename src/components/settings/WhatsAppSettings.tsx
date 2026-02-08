import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Key,
  Link,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  ExternalLink,
  Save,
} from 'lucide-react';

export function WhatsAppSettings() {
  const [instanceId, setInstanceId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'checking' | 'connected' | 'error'>('unknown');
  const [statusMessage, setStatusMessage] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const savedInstanceId = localStorage.getItem('whatsapp-instance-id') || '';
    const savedToken = localStorage.getItem('whatsapp-api-token') || '';
    setInstanceId(savedInstanceId);
    setApiToken(savedToken);
  }, []);

  const handleSave = () => {
    localStorage.setItem('whatsapp-instance-id', instanceId);
    localStorage.setItem('whatsapp-api-token', apiToken);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testConnection = async () => {
    if (!instanceId || !apiToken) {
      setConnectionStatus('error');
      setStatusMessage('יש להזין Instance ID ו-API Token');
      return;
    }

    setConnectionStatus('checking');
    setStatusMessage('בודק חיבור...');

    try {
      const response = await fetch(
        `https://api.green-api.com/waInstance${instanceId}/getStateInstance/${apiToken}`
      );
      const data = await response.json();

      if (data.stateInstance === 'authorized') {
        setConnectionStatus('connected');
        setStatusMessage('החיבור תקין - WhatsApp מחובר');
      } else if (data.stateInstance === 'notAuthorized') {
        setConnectionStatus('error');
        setStatusMessage('WhatsApp לא מורשה - יש לסרוק QR code בלוח הבקרה של Green API');
      } else {
        setConnectionStatus('error');
        setStatusMessage(`סטטוס: ${data.stateInstance || 'לא ידוע'}`);
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setStatusMessage(`שגיאת חיבור: ${error.message}`);
    }
  };

  const webhookUrl = instanceId
    ? `${import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'}/functions/v1/whatsapp-webhook`
    : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Connection Credentials */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            פרטי חיבור Green API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instanceId">Instance ID</Label>
              <Input
                id="instanceId"
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                placeholder="1234567890"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiToken">API Token</Label>
              <Input
                id="apiToken"
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxx"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 ml-2" />
              {saved ? 'נשמר!' : 'שמור'}
            </Button>
            <Button variant="outline" onClick={testConnection} disabled={connectionStatus === 'checking'}>
              {connectionStatus === 'checking' ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 ml-2" />
              )}
              בדוק חיבור
            </Button>
          </div>

          {/* Connection Status */}
          {connectionStatus !== 'unknown' && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              connectionStatus === 'connected'
                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                : connectionStatus === 'error'
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-muted/50'
            }`}>
              {connectionStatus === 'connected' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : connectionStatus === 'error' ? (
                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              ) : (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0" />
              )}
              <span className={`text-sm ${
                connectionStatus === 'connected' ? 'text-emerald-700 dark:text-emerald-400' :
                connectionStatus === 'error' ? 'text-red-700 dark:text-red-400' :
                'text-muted-foreground'
              }`}>
                {statusMessage}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            כתובת Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            הגדר את הכתובת הבאה כ-Webhook URL בהגדרות Green API כדי לקבל מסמכים מ-WhatsApp:
          </p>
          <div className="flex gap-2">
            <Input
              value={webhookUrl}
              readOnly
              dir="ltr"
              className="font-mono text-xs"
              placeholder="הזן Instance ID למעלה לקבלת כתובת"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(webhookUrl)}
              disabled={!webhookUrl}
              title="העתק"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>הגדרות נדרשות בלוח הבקרה של Green API:</p>
            <ul className="list-disc list-inside space-y-0.5 mr-2">
              <li>Webhook URL: הכתובת למעלה</li>
              <li>incomingMessageReceived: מופעל</li>
              <li>stateInstanceChanged: מופעל (אופציונלי)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            איך זה עובד?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">1</Badge>
              <p>משתמש שולח תמונה או מסמך PDF לנייד WhatsApp המחובר</p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">2</Badge>
              <p>Green API מעביר את ההודעה ל-Webhook של המערכת</p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">3</Badge>
              <p>המערכת מזהה את המשתמש לפי מספר הטלפון ומעבדת את המסמך באמצעות Claude AI</p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">4</Badge>
              <p>המסמך הסרוק מופיע במסך "מסמכים סרוקים" עם סטטוס "לאימות"</p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">5</Badge>
              <p>המשתמש מקבל הודעת WhatsApp עם סיכום המסמך שנסרק</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
