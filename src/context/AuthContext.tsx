import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  userId: string | null;
  isAnonymous: boolean;
  isLoading: boolean;
  authError: string | null;
  signInWithApple: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  userId: null,
  isAnonymous: true,
  isLoading: true,
  authError: null,
  signInWithApple: async () => {},
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
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
          if (signInError) {
            setAuthError(`익명 인증 재시도 실패: ${signInError.message}`);
          } else {
            setSession(signInData.session);
            setAuthError(null);
          }
        } catch (retryErr) {
          const retryErrMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
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

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple 로그인은 iOS에서만 지원됩니다');
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple 인증 토큰을 받지 못했습니다');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) throw error;
    setSession(data.session);
  };

  const isAnonymous = session?.user?.is_anonymous ?? true;

  return (
    <AuthContext.Provider value={{
      session,
      userId: session?.user.id ?? null,
      isAnonymous,
      isLoading,
      authError,
      signInWithApple,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
