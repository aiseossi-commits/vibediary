import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { getAIUsage, incrementAIUsage, AI_MONTHLY_LIMIT } from '../db/appSettingsDao';

const IS_PREMIUM = false; // 결제 시스템 도입 전 고정값

export function useAIUsage() {
  const [usageCount, setUsageCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { count, month } = await getAIUsage();
    setUsageCount(month === currentMonth ? count : 0);
    setLoaded(true);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const remaining = IS_PREMIUM ? Infinity : Math.max(0, AI_MONTHLY_LIMIT - usageCount);
  const canUseAI = IS_PREMIUM || usageCount < AI_MONTHLY_LIMIT;

  const checkAndIncrement = useCallback(async (): Promise<boolean> => {
    if (IS_PREMIUM) return true;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { count, month } = await getAIUsage();
    const effectiveCount = month === currentMonth ? count : 0;
    if (effectiveCount >= AI_MONTHLY_LIMIT) {
      Alert.alert(
        '이번 달 AI 사용 완료',
        `무료 플랜은 월 ${AI_MONTHLY_LIMIT}회까지 사용할 수 있어요.\n다음 달에 다시 이용하거나 프리미엄으로 업그레이드하세요.`,
        [{ text: '확인', style: 'cancel' }]
      );
      return false;
    }
    const newCount = await incrementAIUsage();
    setUsageCount(newCount);
    return true;
  }, []);

  return { usageCount, remaining, isPremium: IS_PREMIUM, canUseAI, checkAndIncrement, loaded };
}
