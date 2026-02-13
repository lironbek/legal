import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCompanyBySlug, getUserCompanyAssignments, getCompanies, Company } from '@/lib/dataManager';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scale, Loader2, Eye, EyeOff, AlertTriangle, Info, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { signIn, signOut, user, pending2FA, verify2FA, cancel2FA, resend2FA } = useAuth();
  const navigate = useNavigate();
  const { companySlug } = useParams<{ companySlug?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyNotFound, setCompanyNotFound] = useState(false);
  const [showMockHint, setShowMockHint] = useState(!supabase);
  const [signingOut, setSigningOut] = useState(false);

  // 2FA state
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // If user is already logged in and visiting a company-specific login, sign them out
  useEffect(() => {
    if (companySlug && user && !signingOut) {
      setSigningOut(true);
      signOut().then(() => setSigningOut(false));
    }
  }, [companySlug, user, signOut, signingOut]);

  useEffect(() => {
    if (companySlug) {
      const found = getCompanyBySlug(companySlug);
      if (found) {
        setCompany(found);
        setCompanyNotFound(false);
      } else {
        setCompany(null);
        setCompanyNotFound(true);
      }
    }
  }, [companySlug]);

  // Focus code input when 2FA is shown
  useEffect(() => {
    if (pending2FA) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [pending2FA]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Show the 2FA code as a toast (for development/testing)
  const showCodeNotification = (code: string, method: 'whatsapp' | 'email') => {
    const channel = method === 'whatsapp' ? 'WhatsApp' : 'אימייל';
    toast.info(`קוד אימות: ${code}`, {
      description: `הקוד נשלח ב-${channel} (מצב פיתוח)`,
      duration: 30000,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(email, password, company?.id);

    if (result.requires2FA) {
      // 2FA was triggered — show code notification for testing
      // In production, the code would be sent server-side
      const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]');
      const mockUser = mockUsers.find((u: any) => u.email === email);
      if (mockUser?.two_factor_method) {
        // Access the code from mock storage for notification
        // The AuthContext generates the code — we show it as a toast for demo/testing
        const pendingData = localStorage.getItem('mock-auth-user');
        // Since the user isn't logged in yet, we get the code from the toast
        // The code is stored internally in AuthContext — use resend to get it visible
        const newCode = resend2FA();
        if (newCode) {
          showCodeNotification(newCode, mockUser.two_factor_method);
        }
      }
      setResendCooldown(60);
      setLoading(false);
      return;
    }

    if (result.error) {
      setError(result.error);
      setShowMockHint(true);
      setLoading(false);
    } else {
      // Determine where to redirect after login
      if (company) {
        navigate(`/org/${company.slug}/`, { replace: true });
      } else if (result.error === null) {
        navigate('/', { replace: true });
      }
    }
  };

  const handle2FAVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFAError('');

    if (twoFACode.length !== 6) {
      setTwoFAError('יש להזין קוד בן 6 ספרות');
      return;
    }

    const result = verify2FA(twoFACode);
    if (result.error) {
      setTwoFAError(result.error);
      setTwoFACode('');
      codeInputRef.current?.focus();
    } else {
      // Login complete — redirect
      if (company) {
        navigate(`/org/${company.slug}/`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  };

  const handleResend = () => {
    const newCode = resend2FA();
    if (newCode && pending2FA) {
      showCodeNotification(newCode, pending2FA.method);
      setResendCooldown(60);
      toast.success('קוד אימות חדש נשלח');
    }
  };

  const handleCancel2FA = () => {
    cancel2FA();
    setTwoFACode('');
    setTwoFAError('');
  };

  // Still signing out — show loader
  if (signingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">מתנתק...</p>
        </div>
      </div>
    );
  }

  // Company slug provided but not found
  if (companySlug && companyNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4" dir="rtl">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">ארגון לא נמצא</h1>
          <p className="text-muted-foreground mb-6">
            הכתובת שהזנת אינה משויכת לארגון פעיל במערכת.
          </p>
          <Button variant="outline" onClick={() => navigate('/login')}>
            חזרה לדף התחברות
          </Button>
        </div>
      </div>
    );
  }

  // 2FA Verification Screen
  if (pending2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4" dir="rtl">
        <div className="w-full max-w-md">
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            {company?.logo_url ? (
              <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl mb-4">
                <img src={company.logo_url} alt={company.name} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground">אימות דו-שלבי</h1>
            <p className="text-muted-foreground mt-1">
              {pending2FA.method === 'whatsapp'
                ? `קוד אימות נשלח ב-WhatsApp אל ${pending2FA.userName}`
                : `קוד אימות נשלח לאימייל ${pending2FA.userEmail}`
              }
            </p>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">הזן קוד אימות</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handle2FAVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="2fa-code">קוד בן 6 ספרות</Label>
                  <Input
                    ref={codeInputRef}
                    id="2fa-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    dir="ltr"
                    autoComplete="one-time-code"
                  />
                </div>

                {twoFAError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                    {twoFAError}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={twoFACode.length !== 6}>
                  <ShieldCheck className="h-4 w-4 ml-2" />
                  אמת קוד
                </Button>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel2FA}
                    className="gap-1 text-muted-foreground"
                  >
                    <ArrowRight className="h-4 w-4" />
                    חזרה
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="gap-1 text-muted-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {resendCooldown > 0 ? `שלח שוב (${resendCooldown}s)` : 'שלח קוד חדש'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            הקוד בתוקף ל-5 דקות
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          {company?.logo_url ? (
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl mb-4">
              <img src={company.logo_url} alt={company.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
              <Scale className="h-10 w-10 text-primary" />
            </div>
          )}
          {company ? (
            <>
              <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
              <p className="text-muted-foreground mt-1">התחברות למערכת</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground">Legal Nexus</h1>
              <p className="text-muted-foreground mt-1">מערכת ניהול משרד עורכי דין</p>
            </>
          )}
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">התחברות למערכת</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  dir="ltr"
                  className="text-left"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="הזן סיסמה"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    dir="ltr"
                    className="text-left pl-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                  {error}
                </div>
              )}

              {/* Show credentials hint in mock mode or after failed login (Supabase unreachable) */}
              {!company && showMockHint && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-blue-800 text-sm">
                    <strong>מצב לא מקוון:</strong> השתמש באימייל של משתמש קיים במערכת.<br />
                    סיסמה: הסיסמה שהוגדרה או מספר הטלפון
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    מתחבר...
                  </>
                ) : (
                  'התחבר'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Legal Nexus Israel &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
