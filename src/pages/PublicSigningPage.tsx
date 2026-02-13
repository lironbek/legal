import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, AlertCircle, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PublicDocumentViewer } from '@/components/signing/PublicDocumentViewer';
import { supabase } from '@/lib/supabase';

interface SigningData {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
    required: boolean;
  }>;
  recipient_name: string | null;
  status: string;
  company_name?: string;
}

type PageState = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'expired' | 'already_signed';

export default function PublicSigningPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [signingData, setSigningData] = useState<SigningData | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch signing request
  useEffect(() => {
    if (!token) {
      setPageState('error');
      setErrorMessage('קישור לא תקין');
      return;
    }

    if (!supabase) {
      setPageState('error');
      setErrorMessage('המערכת אינה זמינה כרגע');
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase!.functions.invoke('get-signing-request', {
          body: { token },
        });

        if (error) {
          setPageState('error');
          setErrorMessage('שגיאה בטעינת המסמך');
          return;
        }

        if (!data?.success) {
          if (data?.error === 'expired') {
            setPageState('expired');
          } else if (data?.error === 'already_signed') {
            setPageState('already_signed');
          } else {
            setPageState('error');
            setErrorMessage(data?.error || 'שגיאה בטעינת המסמך');
          }
          return;
        }

        setSigningData(data.signing_request);
        setDocumentUrl(data.document_url);
        setPageState('ready');
      } catch {
        setPageState('error');
        setErrorMessage('שגיאה בטעינת המסמך');
      }
    })();
  }, [token]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validateFields = (): boolean => {
    if (!signingData) return false;
    for (const field of signingData.fields) {
      if (field.required && !fieldValues[field.id]?.trim()) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!token || !validateFields() || !supabase) return;

    setPageState('submitting');

    try {
      const { data, error } = await supabase.functions.invoke('complete-signing', {
        body: {
          token,
          field_values: fieldValues,
        },
      });

      if (error || !data?.success) {
        setPageState('ready');
        setErrorMessage(data?.error || 'שגיאה בשליחת החתימה');
        return;
      }

      setPageState('success');
    } catch {
      setPageState('ready');
      setErrorMessage('שגיאה בשליחת החתימה');
    }
  };

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">טוען מסמך...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-xl font-bold">שגיאה</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto" />
            <h1 className="text-xl font-bold">פג תוקף</h1>
            <p className="text-muted-foreground">בקשת החתימה פגה תוקף. פנה לשולח לקבלת קישור חדש.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === 'already_signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold">המסמך כבר נחתם</h1>
            <p className="text-muted-foreground">מסמך זה כבר נחתם בעבר.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">תודה! המסמך נחתם בהצלחה</h1>
            <p className="text-muted-foreground">
              החתימה נשמרה והמסמך נשלח חזרה למערכת.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isValid = validateFields();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">חתימה דיגיטלית</span>
          </div>
          {signingData?.recipient_name && (
            <span className="text-sm text-muted-foreground">
              שלום, {signingData.recipient_name}
            </span>
          )}
        </div>
      </header>

      {/* Document */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-lg font-bold">{signingData?.file_name}</h1>
          <p className="text-sm text-muted-foreground">
            אנא מלא את כל השדות הנדרשים וחתום בתחתית המסמך
          </p>
        </div>

        {documentUrl && signingData && (
          <PublicDocumentViewer
            documentUrl={documentUrl}
            fileType={signingData.file_type}
            fields={signingData.fields}
            fieldValues={fieldValues}
            onFieldChange={handleFieldChange}
          />
        )}
      </main>

      {/* Sticky bottom bar */}
      <footer className="sticky bottom-0 z-20 bg-background/95 backdrop-blur border-t px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {isValid ? 'כל השדות מולאו - ניתן לחתום' : 'נא למלא את כל השדות הנדרשים'}
          </p>
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!isValid || pageState === 'submitting'}
          >
            {pageState === 'submitting' ? (
              <>
                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <CheckCircle className="ml-2 h-5 w-5" />
                חתום ואשר
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
