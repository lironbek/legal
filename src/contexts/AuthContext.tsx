import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/supabase';
import { getUserCompanyAssignments, setCurrentCompany } from '@/lib/dataManager';
import { addAuditEntry } from '@/lib/auditLog';

interface AuthUser {
  id: string;
  email: string;
}

interface Pending2FA {
  authUser: AuthUser;
  profile: UserProfile;
  code: string;
  method: 'whatsapp' | 'email';
  expiresAt: number;
  companyId?: string;
}

interface SignInResult {
  error: string | null;
  requires2FA?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string, companyId?: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  // 2FA
  pending2FA: { method: 'whatsapp' | 'email'; userEmail: string; userName: string } | null;
  verify2FA: (code: string) => { error: string | null };
  cancel2FA: () => void;
  resend2FA: () => string | null;
  // Impersonation
  isImpersonating: boolean;
  realAdmin: { user: AuthUser; profile: UserProfile } | null;
  startImpersonation: (targetUser: AuthUser, targetProfile: UserProfile) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Login rate limiter: max 5 attempts per 60 seconds
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 60_000;
const loginAttempts: { ts: number }[] = [];

function isLoginRateLimited(): boolean {
  const now = Date.now();
  // Remove old entries
  while (loginAttempts.length > 0 && now - loginAttempts[0].ts > LOGIN_WINDOW_MS) {
    loginAttempts.shift();
  }
  return loginAttempts.length >= LOGIN_MAX_ATTEMPTS;
}

function recordLoginAttempt(): void {
  loginAttempts.push({ ts: Date.now() });
}

// Generate a random 6-digit 2FA code
function generate2FACode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

const TWO_FA_CODE_TTL = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [realAdmin, setRealAdmin] = useState<{ user: AuthUser; profile: UserProfile } | null>(null);
  const [pending2FAState, setPending2FAState] = useState<Pending2FA | null>(null);

  const isImpersonating = realAdmin !== null;

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        console.warn('Failed to fetch profile:', error);
        return null;
      }
      return data as UserProfile;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      // No Supabase connection - check localStorage for mock auth
      const mockAuth = localStorage.getItem('mock-auth-user');
      if (mockAuth) {
        try {
          const parsed = JSON.parse(mockAuth);
          setUser(parsed.user);
          setProfile(parsed.profile);
        } catch {
          // invalid mock auth
        }
      }
      setLoading(false);
      return;
    }

    // Helper: restore mock auth from localStorage
    const restoreMockAuth = () => {
      const mockAuth = localStorage.getItem('mock-auth-user');
      if (mockAuth) {
        try {
          const parsed = JSON.parse(mockAuth);
          setUser(parsed.user);
          setProfile(parsed.profile);
        } catch {
          // invalid mock auth
        }
      }
    };

    // Get initial session with timeout fallback
    const sessionTimeout = setTimeout(() => {
      console.warn('Supabase session check timed out - falling back to mock mode');
      restoreMockAuth();
      setLoading(false);
    }, 3000);

    supabase.auth.getSession().then(async ({ data: { session } }: any) => {
      clearTimeout(sessionTimeout);
      if (session?.user) {
        const prof = await fetchProfile(session.user.id);
        if (prof) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          setProfile(prof);
        } else {
          // Session exists but no profile - invalid user, sign out
          console.warn('Supabase session exists but no profile found - signing out');
          await supabase.auth.signOut();
          restoreMockAuth();
        }
      } else {
        restoreMockAuth();
      }
      setLoading(false);
    }).catch((err: any) => {
      clearTimeout(sessionTimeout);
      console.warn('Failed to get Supabase session:', err);
      restoreMockAuth();
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          if (prof) {
            setUser({ id: session.user.id, email: session.user.email || '' });
            setProfile(prof);
          } else {
            // No profile - don't auto-login
            setUser(null);
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      clearTimeout(sessionTimeout);
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  // Complete login: set user state and persist
  const completeLogin = useCallback((authUser: AuthUser, prof: UserProfile, companyId?: string) => {
    if (companyId) {
      setCurrentCompany(companyId);
    }
    setUser(authUser);
    setProfile(prof);
    localStorage.setItem('mock-auth-user', JSON.stringify({ user: authUser, profile: prof }));

    addAuditEntry({
      action: 'login_success',
      user_email: authUser.email,
      user_name: prof.full_name || authUser.email,
      user_id: authUser.id,
      company_context: companyId || undefined,
    });
  }, []);

  // Start 2FA: generate code, store pending state, return code for sending
  const start2FA = useCallback((authUser: AuthUser, prof: UserProfile, method: 'whatsapp' | 'email', companyId?: string): string => {
    const code = generate2FACode();
    setPending2FAState({
      authUser,
      profile: prof,
      code,
      method,
      expiresAt: Date.now() + TWO_FA_CODE_TTL,
      companyId,
    });

    addAuditEntry({
      action: 'login_2fa_sent',
      user_email: authUser.email,
      user_name: prof.full_name || authUser.email,
      user_id: authUser.id,
      details: `קוד אימות נשלח ב-${method === 'whatsapp' ? 'WhatsApp' : 'אימייל'}`,
    });

    return code;
  }, []);

  // Helper: try mock login against localStorage users
  const tryMockSignIn = useCallback((email: string, password: string, companyId?: string): SignInResult => {
    const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]');
    const mockUser = mockUsers.find((u: any) => u.email === email);

    if (!mockUser) {
      addAuditEntry({
        action: 'login_failed',
        user_email: email,
        user_name: email,
        details: 'משתמש לא נמצא',
      });
      return { error: 'אימייל או סיסמה שגויים' };
    }

    // Validate password: check stored password, or phone number as fallback
    const mockPasswords = JSON.parse(localStorage.getItem('mock-passwords') || '{}');
    const storedPassword = mockPasswords[email];
    if (storedPassword) {
      // User has a stored password - must match
      if (password !== storedPassword) {
        addAuditEntry({
          action: 'login_failed',
          user_email: email,
          user_name: mockUser.full_name || email,
          user_id: mockUser.id,
          details: 'סיסמה שגויה',
        });
        return { error: 'אימייל או סיסמה שגויים' };
      }
    } else if (mockUser.phone) {
      // No stored password - phone number is the default password
      if (password !== mockUser.phone) {
        addAuditEntry({
          action: 'login_failed',
          user_email: email,
          user_name: mockUser.full_name || email,
          user_id: mockUser.id,
          details: 'סיסמה שגויה (ברירת מחדל: טלפון)',
        });
        return { error: 'אימייל או סיסמה שגויים. הסיסמה הראשונית היא מספר הטלפון' };
      }
    } else {
      // No stored password AND no phone — reject login (no open-door fallback)
      addAuditEntry({
        action: 'login_failed',
        user_email: email,
        user_name: mockUser.full_name || email,
        user_id: mockUser.id,
        details: 'למשתמש אין סיסמה מוגדרת',
      });
      return { error: 'אימייל או סיסמה שגויים' };
    }

    // Password validated — check if 2FA is enabled
    const twoFAMethod = mockUser.two_factor_method;
    if (twoFAMethod && twoFAMethod !== 'none') {
      const authUser = { id: mockUser.id, email: mockUser.email };
      start2FA(authUser, mockUser, twoFAMethod, companyId);
      return { error: null, requires2FA: true };
    }

    // No 2FA — complete login immediately
    const authUser = { id: mockUser.id, email: mockUser.email };
    completeLogin(authUser, mockUser, companyId);
    return { error: null };
  }, [completeLogin, start2FA]);

  const signIn = useCallback(async (email: string, password: string, companyId?: string): Promise<SignInResult> => {
    // Rate limiting
    if (isLoginRateLimited()) {
      return { error: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד דקה.' };
    }
    recordLoginAttempt();

    // If no Supabase client, go straight to mock mode
    if (!supabase) {
      return tryMockSignIn(email, password, companyId);
    }

    // Try real Supabase auth with timeout
    try {
      const signInResult = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 3000))
      ]);

      const { data, error } = signInResult as any;
      if (error) {
        // Network / fetch errors → mock fallback
        if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed')) {
          console.warn('Supabase auth failed (network), trying mock mode:', error.message);
          return tryMockSignIn(email, password, companyId);
        }
        // Invalid credentials from Supabase — do NOT fall back to mock mode,
        // as that would bypass the real auth rejection.
        if (error.message === 'Invalid login credentials') {
          addAuditEntry({
            action: 'login_failed',
            user_email: email,
            user_name: email,
            details: 'אימייל או סיסמה שגויים',
          });
          return { error: 'אימייל או סיסמה שגויים' };
        }
        return { error: error.message };
      }
      if (data.user) {
        const authUser = { id: data.user.id, email: data.user.email || '' };
        const prof = await fetchProfile(data.user.id);

        // If companyId is provided, validate user is assigned to this company
        if (companyId) {
          const isAdmin = prof?.role === 'admin';
          if (!isAdmin) {
            const assignments = getUserCompanyAssignments(data.user.id);
            const hasAccess = assignments.some(a => a.company_id === companyId);
            if (!hasAccess) {
              await supabase.auth.signOut();
              addAuditEntry({
                action: 'login_failed',
                user_email: data.user.email || email,
                user_name: prof?.full_name || email,
                user_id: data.user.id,
                details: 'אין הרשאה לארגון',
                company_context: companyId,
              });
              return { error: 'אין לך הרשאה לארגון זה' };
            }
          }
        }

        // Check if 2FA is enabled for this user
        const twoFAMethod = prof?.two_factor_method;
        if (twoFAMethod && twoFAMethod !== 'none' && prof) {
          // Sign out of Supabase until 2FA is verified
          await supabase.auth.signOut();
          start2FA(authUser, prof, twoFAMethod, companyId);
          return { error: null, requires2FA: true };
        }

        // No 2FA — complete login
        setUser(authUser);
        setProfile(prof);

        if (companyId) {
          setCurrentCompany(companyId);
        }

        addAuditEntry({
          action: 'login_success',
          user_email: data.user.email || '',
          user_name: prof?.full_name || data.user.email || '',
          user_id: data.user.id,
          company_context: companyId || undefined,
        });
      }
      return { error: null };
    } catch (err) {
      // Timeout or network error → fall back to mock mode
      console.warn('Supabase signIn failed, trying mock mode:', err);
      return tryMockSignIn(email, password, companyId);
    }
  }, [fetchProfile, tryMockSignIn, start2FA]);

  // Verify 2FA code
  const verify2FA = useCallback((code: string): { error: string | null } => {
    if (!pending2FAState) {
      return { error: 'אין תהליך אימות פעיל' };
    }

    if (Date.now() > pending2FAState.expiresAt) {
      setPending2FAState(null);
      addAuditEntry({
        action: 'login_2fa_expired',
        user_email: pending2FAState.authUser.email,
        user_name: pending2FAState.profile.full_name || pending2FAState.authUser.email,
        user_id: pending2FAState.authUser.id,
      });
      return { error: 'קוד האימות פג תוקף. נסה להתחבר שוב.' };
    }

    if (code !== pending2FAState.code) {
      addAuditEntry({
        action: 'login_2fa_failed',
        user_email: pending2FAState.authUser.email,
        user_name: pending2FAState.profile.full_name || pending2FAState.authUser.email,
        user_id: pending2FAState.authUser.id,
        details: 'קוד אימות שגוי',
      });
      return { error: 'קוד אימות שגוי' };
    }

    // Code is correct — complete login
    completeLogin(pending2FAState.authUser, pending2FAState.profile, pending2FAState.companyId);
    setPending2FAState(null);

    addAuditEntry({
      action: 'login_2fa_verified',
      user_email: pending2FAState.authUser.email,
      user_name: pending2FAState.profile.full_name || pending2FAState.authUser.email,
      user_id: pending2FAState.authUser.id,
    });

    return { error: null };
  }, [pending2FAState, completeLogin]);

  // Cancel 2FA flow
  const cancel2FA = useCallback(() => {
    if (pending2FAState) {
      addAuditEntry({
        action: 'login_2fa_cancelled',
        user_email: pending2FAState.authUser.email,
        user_name: pending2FAState.profile.full_name || pending2FAState.authUser.email,
        user_id: pending2FAState.authUser.id,
      });
    }
    setPending2FAState(null);
  }, [pending2FAState]);

  // Resend 2FA code — returns new code for caller to dispatch
  const resend2FA = useCallback((): string | null => {
    if (!pending2FAState) return null;
    const newCode = generate2FACode();
    setPending2FAState({
      ...pending2FAState,
      code: newCode,
      expiresAt: Date.now() + TWO_FA_CODE_TTL,
    });

    addAuditEntry({
      action: 'login_2fa_sent',
      user_email: pending2FAState.authUser.email,
      user_name: pending2FAState.profile.full_name || pending2FAState.authUser.email,
      user_id: pending2FAState.authUser.id,
      details: `קוד אימות חדש נשלח ב-${pending2FAState.method === 'whatsapp' ? 'WhatsApp' : 'אימייל'}`,
    });

    return newCode;
  }, [pending2FAState]);

  // Exposed pending 2FA info (without the secret code)
  const pending2FA = pending2FAState
    ? { method: pending2FAState.method, userEmail: pending2FAState.authUser.email, userName: pending2FAState.profile.full_name }
    : null;

  const signOut = useCallback(async () => {
    // Log before clearing state
    if (user) {
      addAuditEntry({
        action: 'logout',
        user_email: user.email,
        user_name: profile?.full_name || user.email,
        user_id: user.id,
      });
    }

    // Clear impersonation state
    setRealAdmin(null);

    // Clear local state immediately (don't wait for Supabase)
    localStorage.removeItem('mock-auth-user');
    setUser(null);
    setProfile(null);
    // Try Supabase signOut with timeout - don't block on failure
    if (supabase) {
      try {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);
      } catch {
        // Ignore - local state already cleared
      }
    }
  }, [user, profile]);

  // Impersonation
  const startImpersonation = useCallback((targetUser: AuthUser, targetProfile: UserProfile) => {
    if (!user || !profile || profile.role !== 'admin') return;

    addAuditEntry({
      action: 'impersonation_start',
      user_email: user.email,
      user_name: profile.full_name,
      user_id: user.id,
      details: `צפייה כמשתמש: ${targetProfile.full_name} (${targetUser.email})`,
    });

    // Save real admin identity
    setRealAdmin({ user, profile });

    // Override with target user
    setUser(targetUser);
    setProfile(targetProfile);
  }, [user, profile]);

  const stopImpersonation = useCallback(() => {
    if (!realAdmin) return;

    addAuditEntry({
      action: 'impersonation_stop',
      user_email: realAdmin.user.email,
      user_name: realAdmin.profile.full_name,
      user_id: realAdmin.user.id,
      details: `סיום צפייה כמשתמש: ${profile?.full_name || user?.email}`,
    });

    // Restore admin identity
    setUser(realAdmin.user);
    setProfile(realAdmin.profile);
    setRealAdmin(null);
  }, [realAdmin, user, profile]);

  return (
    <AuthContext.Provider value={{
      user, profile, loading, signIn, signOut,
      pending2FA, verify2FA, cancel2FA, resend2FA,
      isImpersonating, realAdmin, startImpersonation, stopImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
