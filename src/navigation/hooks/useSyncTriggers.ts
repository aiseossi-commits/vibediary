import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Session } from '@supabase/supabase-js';
import { runInitialMigration, wakeSync } from '../../services/syncService';

export function useSyncTriggers(isLoaded: boolean, session: Session | null) {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const prevConnectedRef = useRef<boolean | null>(null);
  const prevHasSessionRef = useRef<boolean>(false);

  // 앱 시작 시 Supabase 동기화 (백그라운드) — session 준비 후에만 실행
  useEffect(() => {
    if (isLoaded && session) {
      void runInitialMigration().catch(() => {});
    }
  }, [isLoaded, session]);

  // AppState active 복귀 시 재동기화
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current !== 'active' && nextState === 'active' && session) {
        void wakeSync('app_foregrounded');
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [session]);

  // 네트워크 오프라인 → 온라인 복구 시 재동기화
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isNowConnected = !!(state.isConnected && state.isInternetReachable);
      if (prevConnectedRef.current === false && isNowConnected && session) {
        void wakeSync('network_reconnected');
      }
      prevConnectedRef.current = isNowConnected;
    });
    return () => unsub();
  }, [session]);

  // 익명 인증 세션 확보 직후 재동기화 (앱 시작 시 auth가 sync보다 늦게 완료될 경우 대비)
  useEffect(() => {
    const hasSession = session !== null;
    if (!prevHasSessionRef.current && hasSession) {
      void wakeSync('session_ready');
    }
    prevHasSessionRef.current = hasSession;
  }, [session]);
}
