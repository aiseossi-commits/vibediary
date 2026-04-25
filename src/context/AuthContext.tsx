import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  userId: string | null;
  isLoading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  userId: null,
  isLoading: true,
  authError: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setAuthError(null);
        } else {
          const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
          if (signInError) {
            console.error('[Auth] signInAnonymously failed:', signInError.message);
            setAuthError(`익명 인증 실패: ${signInError.message}`);
            throw signInError;
          }
          setSession(signInData.session);
          setAuthError(null);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('[Auth] getSession failed:', errMsg);
        // 세션 복원 실패 시 새 익명 계정 재시도 (토큰 손상 등 예외 상황)
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
          if (signInError) {
            console.error('[Auth] signInAnonymously retry failed:', signInError.message);
            setAuthError(`익명 인증 재시도 실패: ${signInError.message}`);
          } else {
            setSession(signInData.session);
            setAuthError(null);
          }
        } catch (retryErr) {
          const retryErrMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
          console.error('[Auth] signInAnonymously retry threw:', retryErrMsg);
          setAuthError(`익명 인증 재시도 실패: ${retryErrMsg}`);
        }
      } finally {
        setIsLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, userId: session?.user.id ?? null, isLoading, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
