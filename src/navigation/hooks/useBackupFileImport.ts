import { useEffect, useRef, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { parseBackupFromUri, restoreOverwrite, restoreMerge } from '../../services/backupService';

export function useBackupFileImport(isLoaded: boolean, refreshChildren: () => Promise<void>) {
  const pendingFileUrl = useRef<string | null>(null);

  const handleIncomingFile = useCallback(async (url: string) => {
    // content:// URI (카카오톡 등)는 파일명 없이 올 수 있으므로 scheme 기준으로도 허용
    const isContentUri = url.startsWith('content://');
    const isJsonUri = url.includes('.json') || url.includes('json');
    if (!isContentUri && !isJsonUri) return;
    try {
      const data = await parseBackupFromUri(url);
      Alert.alert(
        '백업 파일',
        '복원 방식을 선택하세요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '병합 (기존 유지 + 신규 추가)',
            onPress: async () => {
              await restoreMerge(data);
              await refreshChildren();
              Alert.alert('완료', '병합 복원이 완료되었습니다.');
            },
          },
          {
            text: '덮어쓰기 (전체 교체)',
            style: 'destructive',
            onPress: () => {
              Alert.alert('주의', '기존 데이터가 모두 삭제됩니다. 계속하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                {
                  text: '덮어쓰기',
                  style: 'destructive',
                  onPress: async () => {
                    await restoreOverwrite(data);
                    await refreshChildren();
                    Alert.alert('완료', '덮어쓰기 복원이 완료되었습니다.');
                  },
                },
              ]);
            },
          },
        ]
      );
    } catch {
      Alert.alert('오류', '유효하지 않은 백업 파일입니다.');
    }
  }, [refreshChildren]);

  // 앱이 파일로 열렸을 때 처리
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) pendingFileUrl.current = url;
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (isLoaded) {
        handleIncomingFile(url);
      } else {
        pendingFileUrl.current = url;
      }
    });
    return () => sub.remove();
  }, [handleIncomingFile, isLoaded]);

  // DB 준비 완료 후 대기 중인 파일 처리
  useEffect(() => {
    if (isLoaded && pendingFileUrl.current) {
      handleIncomingFile(pendingFileUrl.current);
      pendingFileUrl.current = null;
    }
  }, [isLoaded, handleIncomingFile]);
}
