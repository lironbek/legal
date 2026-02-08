import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/supabase';
import { getUserCompanyAssignments, setCurrentCompany } from '@/lib/dataManager';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }: any) => {
      if (session?.user) {
        const authUser = { id: session.user.id, email: session.user.email || '' };
        setUser(authUser);
        const prof = await fetchProfile(session.user.id);
        setProfile(prof);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        if (session?.user) {
          const authUser = { id: session.user.id, email: session.user.email || '' };
          setUser(authUser);
          const prof = await fetchProfile(session.user.id);
          setProfile(prof);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string, companyId?: string): Promise<{ error: string | null }> => {
    if (!supabase) {
      // Mock mode - check mock users
      const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]');
      const mockUser = mockUsers.find((u: any) => u.email === email);
      if (mockUser) {
        // If companyId is provided, validate user is assigned to this company
        if (companyId) {
          const isAdmin = mockUser.role === 'admin';
          if (!isAdmin) {
            const assignments = getUserCompanyAssignments(mockUser.id);
            const hasAccess = assignments.some(a => a.company_id === companyId);
            if (!hasAccess) {
              return { error: 'אין לך הרשאה לארגון זה' };
            }
          }
          setCurrentCompany(companyId);
        }
        const authUser = { id: mockUser.id, email: mockUser.email };
        setUser(authUser);
        setProfile(mockUser);
        localStorage.setItem('mock-auth-user', JSON.stringify({ user: authUser, profile: mockUser }));
        return { error: null };
      }
      return { error: 'אימייל או סיסמה שגויים' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message === 'Invalid login credentials' ? 'אימייל או סיסמה שגויים' : error.message };
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
            return { error: 'אין לך הרשאה לארגון זה' };
          }
        }
        setCurrentCompany(companyId);
      }

      setUser(authUser);
      setProfile(prof);
    }
    return { error: null };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Clear mock auth too
    localStorage.removeItem('mock-auth-user');
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
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
