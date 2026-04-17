import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import {
  SPACING,
  TOUCH_TARGET,
  BORDER_RADIUS,
  FONT_SIZE,
  type AppColors,
} from '../constants/theme';
import { HOME_WIDGETS } from '../constants/homeWidgets';
import { useHomeWidgetSettings } from '../hooks/useHomeWidgetSettings';
import { getSetting } from '../db/appSettingsDao';

const HOME_SUBTITLE_KEY = 'home_subtitle';
const HOME_SUBTITLE_DEFAULT = '말하는 순간, 기억이 됩니다.';
import type { RecordWithTags } from '../types/record';
import { getAllRecords, isDatabaseReady, getActiveEvents, type ActiveEvent } from '../db';
import { processTextRecord, runSTTOnly, processFromText } from '../services/recordPipeline';
import { processOfflineQueue } from '../services/offlineQueue';
import { warmDeno } from '../services/aiProcessor';
import { formatEventDurationShort } from '../constants/events';
import { useRecording } from '../hooks/useRecording';
import { parseMultiEntries } from '../services/aiProcessor';
import RecordCard from '../components/RecordCard';
import EventTrackerModal from '../components/EventTrackerModal';
import * as FileSystem from 'expo-file-system';

interface HomeScreenProps {
  navigation: any;
}

const PAGE_SIZE = 10;
const PEARL_SIZE = 160;
const PULSE_COUNT = 3;


function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 24, paddingVertical: 20,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center' },
    titleChevron: { marginLeft: 4, marginTop: 2 },
    title: { fontSize: 30, fontWeight: '700' as const, color: colors.textPrimary, letterSpacing: -0.6 },
    subtitle: { fontSize: 13, color: colors.textTertiary, marginTop: 4, letterSpacing: 0.2 },
    headerRight: { flexDirection: 'row', gap: SPACING.sm },
    headerIcon: { padding: SPACING.sm },
    listContent: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 0 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: SPACING.xxl },
    listFooter: { paddingVertical: SPACING.xl, alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyHint: { fontSize: 15, color: colors.textTertiary, textAlign: 'center', lineHeight: 24 },
    inputBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface,
      borderBottomWidth: 1, borderBottomColor: colors.divider,
      paddingHorizontal: 16, paddingVertical: 6,
      width: '100%', gap: SPACING.sm,
    },
    pearlCenter: { alignItems: 'center', marginTop: 60, marginBottom: 24 },
    pearlWrapper: { width: PEARL_SIZE, height: PEARL_SIZE, alignItems: 'center', justifyContent: 'center' },
    pulseRing: { position: 'absolute', width: PEARL_SIZE, height: PEARL_SIZE, borderRadius: PEARL_SIZE / 2, backgroundColor: colors.primary },
    pearlButton: {
      width: PEARL_SIZE, height: PEARL_SIZE, borderRadius: PEARL_SIZE / 2,
      backgroundColor: colors.micBg, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: colors.micBorder,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 1, elevation: 2,
    },
    pearlLabel: { fontSize: 15, fontWeight: '500' as const, color: colors.micLabel, marginTop: 16, opacity: 0.85, letterSpacing: 0.2 },
    pearlRecordingButton: { backgroundColor: colors.recordingRedLight, borderColor: colors.recordingRed },
    inlineTimerText: { fontSize: 15, fontWeight: '600' as const, color: colors.recordingRed, marginTop: 12, letterSpacing: 1.5 },
    inlineCancelBtn: { paddingVertical: 8, paddingHorizontal: 16, marginTop: 2 },
    inlineCancelBtnText: { fontSize: 14, color: colors.textTertiary },
    inlineProcessingText: { fontSize: 15, fontWeight: '500' as const, color: colors.textSecondary, marginTop: 12, letterSpacing: 0.3 },
    inlineAiModeLabel: { fontSize: 12, color: colors.primary, marginTop: 6, opacity: 0.8, letterSpacing: 0.3 },
    inlineResultText: { fontSize: 14, fontWeight: '600' as const, color: colors.primary, marginTop: 10, textAlign: 'center' as const },
    typingInput: { flex: 1, fontSize: 15, color: colors.textPrimary, paddingVertical: SPACING.sm },
    sendButton: {
      width: TOUCH_TARGET.min, height: TOUCH_TARGET.min, borderRadius: TOUCH_TARGET.min / 2,
      backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center',
    },
    modalBox: {
      backgroundColor: colors.surface, borderRadius: 20,
      paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xl, width: '75%',
      borderWidth: 1, borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 17, fontWeight: '600' as const, color: colors.textPrimary,
      textAlign: 'center', marginBottom: SPACING.md,
    },
    modalItem: {
      paddingVertical: 14, paddingHorizontal: 16,
      borderRadius: 12, marginBottom: SPACING.xs,
    },
    modalItemActive: { backgroundColor: colors.primary },
    modalItemText: { fontSize: 15, color: colors.textPrimary },
    modalItemTextActive: { fontWeight: '600' as const, color: colors.textOnPrimary },
    modalCancel: {
      marginTop: 8, paddingVertical: 14, alignItems: 'center',
      borderTopWidth: 1, borderTopColor: colors.divider,
    },
    modalCancelText: { fontSize: 15, color: colors.textTertiary },
    eventSection: {
      paddingHorizontal: SPACING.lg, paddingTop: SPACING.xs, paddingBottom: SPACING.xs,
    },
    eventSectionHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: SPACING.xs,
    },
    eventSectionLabel: {
      fontSize: FONT_SIZE.sm, fontWeight: '600', color: colors.textSecondary,
    },
    eventBadgeRow: {
      flexDirection: 'row', alignItems: 'center',
      gap: SPACING.xs,
    },
    eventBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.primary + '20',
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
      borderWidth: 1.5, borderColor: colors.primary + '88',
    },
    eventBadgeText: { fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: '700' },
    eventBadgeAdd: {
      backgroundColor: 'transparent',
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
      borderWidth: 1, borderColor: colors.border,
    },
    eventBadgeAddText: { fontSize: FONT_SIZE.sm, color: colors.textTertiary },
    eventBadgeMore: {
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
      borderWidth: 1, borderColor: colors.border,
    },
    eventBadgeMoreText: { fontSize: FONT_SIZE.sm, color: colors.textTertiary },
    eventBadgeHint: { fontSize: FONT_SIZE.xs, color: colors.textTertiary, marginTop: 2 },
  });
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { children: childList, activeChild, setActiveChild } = useChild();
  const { settings: widgetSettings, reload: reloadWidgets } = useHomeWidgetSettings();

  const [records, setRecords] = useState<RecordWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [childModalVisible, setChildModalVisible] = useState(false);
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [subtitle, setSubtitle] = useState(HOME_SUBTITLE_DEFAULT);

  const pulseAnims = useRef(
    Array.from({ length: PULSE_COUNT }, () => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const loops = pulseAnims.map(({ scale, opacity }, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(i * 600),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1.9, duration: 1800, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(opacity, { toValue: 0.08, duration: 400, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach((l) => l.stop());
  }, [pulseAnims]);

  const activeChildIdRef = useRef(activeChild?.id);
  useEffect(() => { activeChildIdRef.current = activeChild?.id; }, [activeChild?.id]);

  const loadActiveEvents = useCallback(async () => {
    if (!activeChild?.id) { setActiveEvents([]); return; }
    try {
      const events = await getActiveEvents(activeChild.id);
      setActiveEvents(events);
    } catch (e) {
      console.error('[Home] loadActiveEvents error:', e);
    }
  }, [activeChild?.id]);

  const loadRecords = useCallback(async () => {
    try {
      if (!isDatabaseReady()) { setRecords([]); return; }
      const filterChildId = activeChildIdRef.current;
      const timeout = new Promise<RecordWithTags[]>((_, reject) => setTimeout(() => reject(new Error('DB query timeout')), 5000));
      const data = await Promise.race([getAllRecords(PAGE_SIZE, 0, filterChildId), timeout]);
      setRecords(data);
      setShowEmptyState(data.length === 0);
    } catch (e) {
      console.error('[Home] loadRecords error:', e);
      setRecords([]);
      setShowEmptyState(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadRecords();
      loadActiveEvents();
      reloadWidgets();
      getSetting(HOME_SUBTITLE_KEY).then(val => {
        setSubtitle(val ?? HOME_SUBTITLE_DEFAULT);
      });
      warmDeno();
      processOfflineQueue().then(() => loadRecords()).catch(() => {});
      return () => setShowEmptyState(false);
    }, [loadRecords, loadActiveEvents, reloadWidgets])
  );

  useEffect(() => { loadRecords(); loadActiveEvents(); }, [activeChild?.id]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadRecords();
    processOfflineQueue().then(() => loadRecords()).catch(() => {});
  }, [loadRecords]);
  const handleRecordPress = useCallback((record: RecordWithTags) => { navigation.navigate('RecordDetail', { recordId: record.id }); }, [navigation]);
  const handlePearlPress = useCallback(() => { navigation.navigate('Recording'); }, [navigation]);

  // --- AI 입력 모드 (롱프레스 인라인 녹음) ---
  const rec = useRecording();
  const [inlineProcessing, setInlineProcessing] = useState(false);
  const [inlineResult, setInlineResult] = useState<string | null>(null);

  const processInlineRecording = useCallback(async (uri: string) => {
    setInlineProcessing(true);
    setInlineResult(null);
    try {
      const text = await runSTTOnly(uri, activeChild?.name);
      if (!text.trim()) {
        Alert.alert('음성 입력 없음', '음성이 인식되지 않았습니다. 다시 시도해 주세요.');
        return;
      }

      // 날짜별 분리 파싱 (실패 시 오늘 날짜로 단일 항목 fallback)
      const today = new Date().toISOString().slice(0, 10);
      let entries: { date: string; text: string }[];
      try {
        entries = await parseMultiEntries(text, today);
      } catch {
        entries = [{ date: today, text }];
      }

      // 각 항목 AI 처리 + DB 저장
      for (const entry of entries) {
        const createdAt = new Date(entry.date + 'T12:00:00').getTime();
        await processFromText(uri, entry.text, createdAt, activeChild?.id);
      }

      // 복수 저장 시 피드백
      if (entries.length > 1) {
        setInlineResult(`${entries.length}개 기록이 캘린더에 저장됐어요`);
        setTimeout(() => setInlineResult(null), 3500);
      }

      loadRecords();
      processOfflineQueue().then(() => loadRecords()).catch(() => {});
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg === 'NO_SPEECH') {
        Alert.alert('음성 없음', '음성이 인식되지 않았습니다.');
      } else {
        Alert.alert('오류', '기록 저장에 실패했습니다.');
      }
    } finally {
      setInlineProcessing(false);
    }
  }, [activeChild?.id, activeChild?.name, loadRecords]);

  const handleInlineStop = useCallback(async () => {
    if (!rec.isRecording) return;
    const MIN_DURATION = 3;
    const SILENCE_THRESHOLD = 0.08;
    const LOW_AUDIO_THRESHOLD = 0.15;
    try {
      if (rec.duration <= MIN_DURATION) { await rec.stop(); return; }
      const avgLevel = rec.getAverageAudioLevel();
      const result = await rec.stop();
      if (avgLevel <= SILENCE_THRESHOLD) {
        Alert.alert('녹음된 내용이 없습니다', '음성이 감지되지 않았습니다.');
        FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});
        return;
      }
      if (avgLevel <= LOW_AUDIO_THRESHOLD) {
        Alert.alert('녹음 음량이 낮습니다', '음성이 잘 들리지 않을 수 있습니다. 저장할까요?', [
          { text: '취소', style: 'cancel', onPress: () => { FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {}); } },
          { text: '저장', onPress: () => processInlineRecording(result.uri) },
        ]);
      } else {
        await processInlineRecording(result.uri);
      }
    } catch {
      Alert.alert('오류', '녹음 저장에 실패했습니다.');
    }
  }, [rec, processInlineRecording]);

  const handleLongPressRecord = useCallback(async () => {
    await rec.start();
  }, [rec]);

  const handleInlineCancel = useCallback(async () => {
    try { await rec.stop(); } catch {}
  }, [rec]);

  // 30초 자동 종료
  useEffect(() => {
    if (rec.isRecording && rec.duration >= 30) {
      handleInlineStop();
    }
  }, [rec.duration, rec.isRecording, handleInlineStop]);

  const handleTextSubmit = useCallback(async () => {
    const text = textInput.trim();
    if (!text || isSaving) return;
    setIsSaving(true);
    setTextInput('');
    try {
      await processTextRecord(text, activeChild?.id);
      loadRecords();
      processOfflineQueue().then(() => loadRecords()).catch(() => {});
    }
    catch (e) { Alert.alert('저장 실패', '기록 저장 중 오류가 발생했습니다.'); console.error('텍스트 저장 오류:', e); }
    finally { setIsSaving(false); }
  }, [textInput, isSaving, loadRecords, activeChild?.id]);

  const renderItem = useCallback(({ item }: { item: RecordWithTags }) => (
    <RecordCard record={item} onPress={() => handleRecordPress(item)} />
  ), [handleRecordPress]);


  const hasRecords = records.length > 0;

  const micIconColor = colors.micIcon;

  const PearlButton = (
    <View style={{ alignItems: 'center' }}>
      <View style={styles.pearlWrapper}>
        {!rec.isRecording && !inlineProcessing && pulseAnims.map(({ scale, opacity }, i) => (
          <Animated.View key={i} style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
        ))}
        {inlineProcessing ? (
          <View style={styles.pearlButton}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : rec.isRecording ? (
          <TouchableOpacity
            onPress={handleInlineStop}
            activeOpacity={0.8}
            style={[styles.pearlButton, styles.pearlRecordingButton]}
            accessibilityLabel="녹음 중지"
            accessibilityRole="button"
          >
            <View style={{ width: 28, height: 28, borderRadius: 5, backgroundColor: colors.recordingRed }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handlePearlPress}
            onLongPress={handleLongPressRecord}
            delayLongPress={400}
            activeOpacity={0.85}
            style={styles.pearlButton}
            accessibilityLabel="음성 녹음 시작"
            accessibilityRole="button"
          >
            <Ionicons name="mic-outline" size={52} color={micIconColor} />
          </TouchableOpacity>
        )}
      </View>
      {rec.isRecording && (
        <>
          <Text style={styles.inlineTimerText}>
            {Math.floor(rec.duration / 60)}:{String(rec.duration % 60).padStart(2, '0')}
          </Text>
          <Text style={styles.inlineAiModeLabel}>✦ AI 입력 모드 — 날짜를 말하면 자동 분류</Text>
          <TouchableOpacity onPress={handleInlineCancel} style={styles.inlineCancelBtn}>
            <Text style={styles.inlineCancelBtnText}>취소</Text>
          </TouchableOpacity>
        </>
      )}
      {inlineProcessing && (
        <Text style={styles.inlineProcessingText}>기록중...</Text>
      )}
      {inlineResult && (
        <Text style={styles.inlineResultText}>{inlineResult}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {activeChild && (
        <EventTrackerModal
          visible={eventModalVisible}
          onClose={() => setEventModalVisible(false)}
          childId={activeChild.id}
          activeEvents={activeEvents}
          onChanged={() => { setEventModalVisible(false); loadActiveEvents(); }}
        />
      )}

      <Modal visible={childModalVisible} transparent animationType="fade" onRequestClose={() => setChildModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setChildModalVisible(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>바다 전환</Text>
            {childList.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.modalItem, c.id === activeChild?.id && styles.modalItemActive]}
                onPress={() => { setActiveChild(c.id); setChildModalVisible(false); }}
              >
                <Text style={[styles.modalItemText, c.id === activeChild?.id && styles.modalItemTextActive]}>
                  {c.id === activeChild?.id ? '✓ ' : ''}{c.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setChildModalVisible(false)}>
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.header}>
        <View>
          <TouchableOpacity
            onPress={() => {
              if (childList.length < 2) return;
              setChildModalVisible(true);
            }}
            activeOpacity={childList.length >= 2 ? 0.7 : 1}
            style={styles.titleRow}
          >
            <Text style={styles.title}>
              {activeChild ? `${activeChild.name}의 ${isDark ? '밤바다' : '바다'}` : (isDark ? '밤바다' : '바다')}
            </Text>
            {childList.length >= 2 && (
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} style={styles.titleChevron} />
            )}
          </TouchableOpacity>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerIcon} accessibilityLabel="설정" accessibilityRole="button">
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Tags')} style={styles.headerIcon} accessibilityLabel="태그 관리" accessibilityRole="button">
            <Ionicons name="pricetags-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {widgetSettings[HOME_WIDGETS.TEXT_INPUT] && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.typingInput}
              placeholder="기록을 입력하세요..."
              placeholderTextColor={colors.textTertiary}
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={handleTextSubmit}
              returnKeyType="send"
              multiline={false}
              editable={!isSaving}
            />
            <TouchableOpacity
              onPress={handleTextSubmit}
              style={[styles.sendButton, !textInput.trim() && !isSaving && { opacity: 0.35 }]}
              disabled={isSaving || !textInput.trim()}
              accessibilityLabel="텍스트 기록 전송"
              accessibilityRole="button"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Ionicons name="send" size={18} color={colors.textOnPrimary} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {widgetSettings[HOME_WIDGETS.EVENT_TRACKER] && (
          <View style={styles.eventSection}>
            <TouchableOpacity style={styles.eventSectionHeader} onPress={() => setEventModalVisible(true)}>
              <Text style={styles.eventSectionLabel}>증상·상태 추적</Text>
              <Ionicons name="add" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            {activeEvents.length > 0 ? (
              <View style={styles.eventBadgeRow}>
                {activeEvents.slice(0, 2).map(ev => (
                  <TouchableOpacity key={ev.id} style={styles.eventBadge} onPress={() => setEventModalVisible(true)}>
                    <Ionicons name="time-outline" size={12} color={colors.primary} />
                    <Text style={styles.eventBadgeText}>{ev.name} · {formatEventDurationShort(ev.startedAt)}</Text>
                  </TouchableOpacity>
                ))}
                {activeEvents.length > 2 && (
                  <TouchableOpacity style={styles.eventBadgeMore} onPress={() => setEventModalVisible(true)}>
                    <Text style={styles.eventBadgeMoreText}>+{activeEvents.length - 2}개 →</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text style={styles.eventBadgeHint}>"언제부터 이랬나요?" — 병원·치료사에게 바로 알려줄 수 있어요</Text>
            )}
          </View>
        )}

        {widgetSettings[HOME_WIDGETS.VOICE_INPUT] && (
          <View style={styles.pearlCenter}>
            {PearlButton}
          </View>
        )}

        {widgetSettings[HOME_WIDGETS.RECENT_RECORDS] && (
          !hasRecords && showEmptyState ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyHint}>마이크를 눌러서 말하거나,{'\n'}기록창에 타이핑해서 입력하세요</Text>
            </View>
          ) : (
            <FlatList
              data={records}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
              }
              ListEmptyComponent={isLoading ? <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View> : null}
            />
          )
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
