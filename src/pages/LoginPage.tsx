import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCompanyBySlug, getUserCompanyAssignments, getCompanies, Company } from '@/lib/dataManager';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Scale, Loader2, Eye, EyeOff, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw, Briefcase, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';

// Shared brand panel for all login states
function BrandPanel({ company }: { company: Company | null }) {
  return (
    <div
      className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #4338ca 0%, #5b4fd4 40%, #7c6be6 100%)' }}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full" />

      <div className="relative z-10 flex flex-col justify-between h-full p-10 text-white">
        {/* Top: Logo */}
        <div className="flex items-center gap-3">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-10 w-10 object-contain rounded-lg bg-white/10 p-1" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Scale className="h-5 w-5" />
            </div>
          )}
          <span className="text-lg font-bold tracking-tight">
            {company?.name || 'Legal Nexus'}
          </span>
        </div>

        {/* Center: Hero text */}
        <div className="space-y-6">
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
            {company ? 'ברוכים הבאים\nלמערכת המשרד' : 'ניהול משרד\nעורכי דין\nמהדור הבא'}
          </h2>
          <p className="text-white/70 text-lg max-w-xs leading-relaxed">
            מערכת חכמה לניהול תיקים, לקוחות ומסמכים במקום אחד
          </p>

          {/* Feature highlights */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Briefcase className="h-4 w-4" />
              </div>
              <span className="text-sm">ניהול תיקים ומעקב התקדמות</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4" />
              </div>
              <span className="text-sm">אבטחה מתקדמת ואימות דו-שלבי</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-sm">ניהול לקוחות ומשתמשים</span>
            </div>
          </div>
        </div>

        {/* Bottom: Footer */}
        <p className="text-white/40 text-xs">
          Legal Nexus Israel &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

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
      const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]');
      const mockUser = mockUsers.find((u: any) => u.email === email);
      if (mockUser?.two_factor_method) {
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
setLoading(false);
    } else {
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
      <div className="min-h-screen flex" dir="rtl">
        <BrandPanel company={company} />
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">מתנתק...</p>
          </div>
        </div>
      </div>
    );
  }

  // Company slug provided but not found
  if (companySlug && companyNotFound) {
    return (
      <div className="min-h-screen flex" dir="rtl">
        <BrandPanel company={null} />
        <div className="flex-1 flex items-center justify-center bg-background p-8">
          <div className="w-full max-w-sm text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-5 ring-1 ring-destructive/10">
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
      </div>
    );
  }

  // 2FA Verification Screen
  if (pending2FA) {
    return (
      <div className="min-h-screen flex" dir="rtl">
        <BrandPanel company={company} />
        <div className="flex-1 flex items-center justify-center bg-background p-8">
          <div className="w-full max-w-sm">
            {/* Mobile-only brand */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">אימות דו-שלבי</h1>
            </div>

            {/* Desktop title */}
            <div className="hidden lg:block mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">אימות דו-שלבי</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {pending2FA.method === 'whatsapp'
                  ? `קוד אימות נשלח ב-WhatsApp אל ${pending2FA.userName}`
                  : `קוד אימות נשלח לאימייל ${pending2FA.userEmail}`
                }
              </p>
            </div>

            <form onSubmit={handle2FAVerify} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="2fa-code" className="text-sm font-medium">קוד בן 6 ספרות</Label>
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
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                  dir="ltr"
                  autoComplete="one-time-code"
                />
              </div>

              {twoFAError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                  {twoFAError}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base font-medium" disabled={twoFACode.length !== 6}>
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

              <p className="text-center text-xs text-muted-foreground pt-2">
                הקוד בתוקף ל-5 דקות
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <BrandPanel company={company} />

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          {/* Mobile-only brand header */}
          <div className="lg:hidden text-center mb-8">
            {company?.logo_url ? (
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4">
                <img src={company.logo_url} alt={company.name} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Scale className="h-8 w-8 text-primary" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground">
              {company?.name || 'Legal Nexus'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">מערכת ניהול משרד עורכי דין</p>
          </div>

          {/* Desktop title */}
          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">התחברות למערכת</h1>
            <p className="text-muted-foreground mt-2 text-sm">הזן את פרטי ההתחברות שלך כדי להמשיך</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                dir="ltr"
                className="text-left h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">סיסמה</Label>
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
                  className="text-left pl-10 h-11"
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

            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
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

          {/* Mobile footer */}
          <p className="lg:hidden text-center text-xs text-muted-foreground/60 mt-8">
            Legal Nexus Israel &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
