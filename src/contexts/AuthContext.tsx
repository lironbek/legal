import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/supabase';
import { getUserCompanyAssignments, setCurrentCompany } from '@/lib/dataManager';
import { addAuditEntry } from '@/lib/auditLog';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string, companyId?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  // Impersonation
  isImpersonating: boolean;
  realAdmin: { user: AuthUser; profile: UserProfile } | null;
  startImpersonation: (targetUser: AuthUser, targetProfile: UserProfile) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [realAdmin, setRealAdmin] = useState<{ user: AuthUser; profile: UserProfile } | null>(null);

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

  // Helper: try mock login against localStorage users
  const tryMockSignIn = useCallback((email: string, password: string, companyId?: string): { error: string | null } => {
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
    }
    // If no stored password AND no phone - allow any password (legacy/admin users)

    if (companyId) {
      setCurrentCompany(companyId);
    }

    const authUser = { id: mockUser.id, email: mockUser.email };
    setUser(authUser);
    setProfile(mockUser);
    localStorage.setItem('mock-auth-user', JSON.stringify({ user: authUser, profile: mockUser }));

    addAuditEntry({
      action: 'login_success',
      user_email: mockUser.email,
      user_name: mockUser.full_name || mockUser.email,
      user_id: mockUser.id,
      company_context: companyId || undefined,
    });

    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string, companyId?: string): Promise<{ error: string | null }> => {
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
        // Invalid credentials → try mock mode as fallback (user may be a local-only user)
        if (error.message === 'Invalid login credentials') {
          const mockResult = tryMockSignIn(email, password, companyId);
          if (!mockResult.error) return mockResult;
          addAuditEntry({
            action: 'login_failed',
            user_email: email,
            user_name: email,
            details: 'אימייל או סיסמה שגויים (Supabase + mock)',
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
          setCurrentCompany(companyId);
        }

        setUser(authUser);
        setProfile(prof);

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
  }, [fetchProfile, tryMockSignIn]);

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
