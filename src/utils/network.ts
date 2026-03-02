import NetInfo from '@react-native-community/netinfo';

// 네트워크 연결 상태 확인
export async function getNetworkState(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch {
    // NetInfo 실패 시 간단한 fetch 테스트
    try {
      const response = await fetch('https://clients3.google.com/generate_204', {
        method: 'HEAD',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
