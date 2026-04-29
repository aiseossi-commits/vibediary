import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

if (Platform.OS === 'android' && GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
}

interface AuthContextValue {
  session: Session | null;
  userId: string | null;
  isAnonymous: boolean;
  isLoading: boolean;
  authError: string | null;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  userId: null,
  isAnonymous: true,
  isLoading: true,
  authError: null,
  signInWithApple: async () => {},
  signInWithGoogle: async () => {},
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

  const signInWithGoogle = async () => {
    if (Platform.OS !== 'android') {
      throw new Error('Google 로그인은 Android에서만 지원됩니다');
    }
    if (!GOOGLE_WEB_CLIENT_ID) {
      throw new Error('Google Web Client ID가 설정되지 않았습니다 (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)');
    }

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo.data?.idToken ?? (userInfo as any).idToken;

    if (!idToken) {
      throw new Error('Google ID 토큰을 받지 못했습니다');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
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
      signInWithGoogle,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export { statusCodes as GoogleSignInStatusCodes };

export function useAuth() {
  return useContext(AuthContext);
}
