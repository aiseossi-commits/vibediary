import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Alert,
  Keyboard,
  PanResponder,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import RecordCard from '../components/RecordCard';
import TimePickerModal from '../components/TimePickerModal';
import { getDailyRecordSummaries, getRecordsByDate, isDatabaseReady, getEventsByDateRange, deleteEvent, getDailyLogsForEvents, getDailySummaryCache, saveDailySummaryCache, type ActiveEvent, type EventSeverity } from '../db';
import { Ionicons } from '@expo/vector-icons';
import { formatEventDuration } from '../constants/events';
import { processTextRecord } from '../services/recordPipeline';
import { processOfflineQueue } from '../services/sync';
import { takePhoto, pickPhotoFromLibrary } from '../services/photoService';
import PhotoActionModal from '../components/PhotoActionModal';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
  type AppColors,
} from '../constants/theme';
import type { RecordWithTags, DailyRecordSummary } from '../types/record';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;

async function generateDaySummary(records: RecordWithTags[], date: string): Promise<string> {
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL;
  const workerSecret = process.env.EXPO_PUBLIC_WORKER_SECRET;
  if (!workerUrl || !workerSecret) throw new Error('NO_WORKER');

  const d = new Date(date + 'T00:00:00');
  const formatted = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  const recordsText = records.map((r, i) => `[${i + 1}] ${r.summary}`).join('\n');
  const prompt = `다음은 ${formatted}의 기록 ${records.length}건입니다. 보호자 시점에서 그날의 주요 상황을 2~3문장으로 자연스럽게 요약해주세요. 번호나 목록 형식 없이 서술하세요.\n\n${recordsText}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${workerUrl}/ai?model=gemini-2.5-flash-lite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Secret': workerSecret },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

function formatTimeHM(h: number, m: number): string {
  const period = h < 12 ? '오전' : '오후';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${displayH}:${String(m).padStart(2, '0')}`;
}

function getDensityColor(count: number, densityColors: readonly string[]): string {
  if (count === 0) return densityColors[0];
  if (count === 1) return densityColors[1];
  if (count <= 3) return densityColors[2];
  if (count <= 6) return densityColors[3];
  return densityColors[4];
}

function hasMedical(tags: string[]): boolean {
  return tags.includes('#의료');
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    title: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, fontFamily: 'Pretendard-Bold', color: colors.textPrimary, letterSpacing: -0.6 },
    calendar: { backgroundColor: colors.background },
    dayCell: { width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center', margin: 2 },
    dayCellSelected: { borderWidth: 1.5, borderColor: colors.primary },
    dayText: { fontSize: FONT_SIZE.sm, color: colors.textPrimary },
    dayTextToday: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
    dayTextSelected: { fontWeight: FONT_WEIGHT.bold },
    dayTextDisabled: { color: colors.textTertiary },
    pearlDot: { position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.secondary },
    photoDot: { position: 'absolute', top: 3, left: 3, width: 6, height: 6, borderRadius: 1, backgroundColor: colors.primary },
    eventDotsRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
    eventDot: { width: 4, height: 4, borderRadius: 2 },
    legend: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.xs },
    legendLabel: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
    legendDot: { width: 14, height: 14, borderRadius: 3 },
    legendSpacer: { flex: 1 },
    pearlDotSmall: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
    dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
    dimTouchable: { flex: 1 },
    sheet: {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT,
      backgroundColor: colors.background,
      borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl,
      zIndex: 20, ...SHADOW.lg,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: SPACING.sm },
    sheetClose: { position: 'absolute', top: SPACING.md, right: SPACING.md, padding: SPACING.sm },
    sheetCloseText: { fontSize: FONT_SIZE.md, color: colors.textTertiary },
    sheetDate: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
    sheetScroll: { flex: 1 },
    sheetContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
    emptyDay: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
    emptyText: { fontSize: FONT_SIZE.md, color: colors.textSecondary },
    recordButton: {
      paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md,
      borderWidth: 1.5, borderColor: colors.primary,
      alignItems: 'center',
    },
    recordButtonText: { fontSize: FONT_SIZE.md, color: colors.primary, fontWeight: FONT_WEIGHT.medium },
    cameraButton: {
      paddingVertical: SPACING.md, paddingHorizontal: SPACING.md,
      borderRadius: BORDER_RADIUS.md, borderWidth: 1.5, borderColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    textInputContainer: { marginTop: SPACING.md, gap: SPACING.sm },
    textInput: {
      borderWidth: 1, borderColor: colors.border, borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md, fontSize: FONT_SIZE.md, color: colors.textPrimary,
      backgroundColor: colors.surfaceSecondary, minHeight: 80, textAlignVertical: 'top',
    },
    saveButton: { paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: colors.primary, alignItems: 'center' },
    saveButtonText: { fontSize: FONT_SIZE.md, color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.medium },
    inputDivider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
    inputDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    inputDividerText: { fontSize: FONT_SIZE.sm, color: colors.textTertiary },
    calendarMonthBtn: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, alignSelf: 'center' },
    calendarMonthText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary },
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    pickerContainer: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, width: '85%' },
    pickerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, textAlign: 'center', marginBottom: SPACING.md },
    pickerYearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg, marginBottom: SPACING.md },
    pickerArrow: { fontSize: 24, color: colors.primary, paddingHorizontal: SPACING.sm },
    pickerYearText: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, minWidth: 80, textAlign: 'center' },
    pickerMonthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
    pickerMonthItem: { width: '22%', paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, alignItems: 'center', backgroundColor: colors.surfaceSecondary },
    pickerMonthItemSelected: { backgroundColor: colors.primary },
    pickerMonthText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    pickerMonthTextSelected: { color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.semibold },
    pickerButtonRow: { flexDirection: 'row', gap: SPACING.sm },
    pickerCancelBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, alignItems: 'center', backgroundColor: colors.surfaceSecondary },
    pickerCancelText: { fontSize: FONT_SIZE.md, color: colors.textSecondary },
    pickerConfirmBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, alignItems: 'center', backgroundColor: colors.primary },
    pickerConfirmText: { fontSize: FONT_SIZE.md, color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.semibold },
    dayEventSection: {
      marginBottom: SPACING.md,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
    },
    dayEventSectionTitle: {
      fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm,
    },
    dayEventRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 3 },
    dayEventDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    dayEventName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, flexShrink: 1 },
    dayEventPeriod: { fontSize: FONT_SIZE.xs, color: colors.textSecondary },
    dayEventBadge: {
      fontSize: FONT_SIZE.xs, color: colors.error, fontWeight: FONT_WEIGHT.medium,
      backgroundColor: colors.error + '18', borderRadius: BORDER_RADIUS.sm,
      paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden',
    },
    timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm },
    timeLabel: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    timeButton: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.surfaceSecondary },
    timeButtonText: { fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: FONT_WEIGHT.medium },
    sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheetContainer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: BORDER_RADIUS.lg, borderTopRightRadius: BORDER_RADIUS.lg,
      paddingTop: SPACING.sm, paddingBottom: SPACING.xxl, paddingHorizontal: SPACING.lg,
    },
    eventSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: SPACING.md },
    sheetEventName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, marginBottom: SPACING.lg },
    sheetDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: colors.error + '18', paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
    sheetDeleteText: { fontSize: FONT_SIZE.md, color: colors.error, fontWeight: FONT_WEIGHT.medium },
    sheetCancelBtn: { paddingVertical: SPACING.md, alignItems: 'center' },
    sheetCancelText: { fontSize: FONT_SIZE.md, color: colors.textSecondary },
    daySummaryCard: {
      backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md,
      padding: 14, marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    },
    daySummaryHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: SPACING.sm,
    },
    daySummaryCount: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary },
    daySummaryHint: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
    daySummaryPreview: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: SPACING.sm },
    daySummaryTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    daySummaryTag: { fontSize: FONT_SIZE.xs, color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: BORDER_RADIUS.full },
    daySummaryTagMore: { fontSize: FONT_SIZE.xs, color: colors.textTertiary, alignSelf: 'center' },
    collapseRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: SPACING.md, marginBottom: SPACING.xs },
    collapseBtn: { fontSize: FONT_SIZE.sm, color: colors.textTertiary },
  });
}

export default function CalendarScreen() {
  const navigation = useNavigation<any>();
  const { colors, densityColors, isDark } = useTheme();
  const { activeChild } = useChild();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dailySummaries, setDailySummaries] = useState<DailyRecordSummary[]>([]);
  const [monthEvents, setMonthEvents] = useState<ActiveEvent[]>([]);
  const [dayEventLogs, setDayEventLogs] = useState<Record<string, EventSeverity>>({});
  const [dayRecords, setDayRecords] = useState<RecordWithTags[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [textInput, setTextInput] = useState('')
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [inputHour, setInputHour] = useState(() => new Date().getHours());
  const [inputMinute, setInputMinute] = useState(() => Math.round(new Date().getMinutes() / 5) * 5 % 60);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [calendarKey, setCalendarKey] = useState(0);
  const [calendarCurrent, setCalendarCurrent] = useState<string | undefined>(undefined);
  const [selectedEventForSheet, setSelectedEventForSheet] = useState<{ id: string; name: string } | null>(null);
  const [photoModal, setPhotoModal] = useState<{ uri: string; base64?: string } | null>(null);
  const [isExpandedRecords, setIsExpandedRecords] = useState(false);
  const [daySummaryText, setDaySummaryText] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const sheetAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const dimAnim = useRef(new Animated.Value(0)).current;
  const contentSlideAnim = useRef(new Animated.Value(0)).current;
  const [kbHeight, setKbHeight] = useState(0);
  const sheetScrollRef = useRef<ScrollView>(null);

  const currentMonthRef = useRef(currentMonth);
  const selectedDateRef = useRef(selectedDate);
  const isSheetOpenRef = useRef(isSheetOpen);
  useEffect(() => { currentMonthRef.current = currentMonth; }, [currentMonth]);
  useEffect(() => { isSheetOpenRef.current = isSheetOpen; }, [isSheetOpen]);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
    const now = new Date();
    setInputHour(now.getHours());
    setInputMinute(Math.round(now.getMinutes() / 5) * 5 % 60);
    setIsExpandedRecords(false);
    setDaySummaryText(null);
    setIsSummarizing(false);
  }, [selectedDate]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const openSheet = useCallback(() => {
    setIsSheetOpen(true);
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
      Animated.timing(dimAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [sheetAnim, dimAnim]);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: SHEET_HEIGHT, duration: 280, useNativeDriver: true }),
      Animated.timing(dimAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setIsSheetOpen(false));
  }, [sheetAnim, dimAnim]);

  const loadMonthData = useCallback(async (yearMonth: string) => {
    if (!isDatabaseReady()) return;
    try {
      const summaries = await getDailyRecordSummaries(yearMonth, activeChild?.id);
      setDailySummaries(summaries);
      if (activeChild?.id) {
        const [y, m] = yearMonth.split('-').map(Number);
        const from = new Date(y, m - 1, 1).getTime();
        const to = new Date(y, m, 0, 23, 59, 59, 999).getTime();
        const events = await getEventsByDateRange(activeChild.id, from, to);
        setMonthEvents(events);
      } else {
        setMonthEvents([]);
      }
    } catch (error) {
      console.warn('캘린더 데이터 로드 실패:', error);
    }
  }, [activeChild?.id]);

  const loadDayRecords = useCallback(async (date: string) => {
    if (!isDatabaseReady()) return;
    setIsLoadingRecords(true);
    try {
      const records = await getRecordsByDate(date, activeChild?.id);
      setDayRecords(records);
      return records;
    } catch {
      setDayRecords([]);
      return [];
    } finally {
      setIsLoadingRecords(false);
    }
  }, [activeChild?.id]);

  const loadOrGenerateSummary = useCallback(async (date: string, records: RecordWithTags[]) => {
    if (records.length === 0) return;
    try {
      const cached = await getDailySummaryCache(date, activeChild?.id);
      if (cached) { setDaySummaryText(cached); return; }
    } catch { /* DB 미준비 시 무시 */ }

    setIsSummarizing(true);
    try {
      const text = await generateDaySummary(records, date);
      if (text) {
        setDaySummaryText(text);
        await saveDailySummaryCache(date, activeChild?.id, text).catch(() => {});
      }
    } catch {
      // 실패 시 요약 없이 유지
    } finally {
      setIsSummarizing(false);
    }
  }, [activeChild?.id]);

  const handleDeleteEvent = useCallback(async (id: string) => {
    await deleteEvent(id);
    loadMonthData(currentMonthRef.current);
  }, [loadMonthData]);

  const handleDatePickerConfirm = useCallback(() => {
    const yearMonth = `${pickerYear}-${String(pickerMonth).padStart(2, '0')}`;
    const newCurrent = `${yearMonth}-01`;
    setCurrentMonth(yearMonth);
    setCalendarCurrent(newCurrent);
    setCalendarKey(k => k + 1);
    loadMonthData(yearMonth);
    setShowDatePicker(false);
  }, [pickerYear, pickerMonth, loadMonthData]);

  useFocusEffect(useCallback(() => {
    loadMonthData(currentMonthRef.current);
    // RecordDetail에서 삭제/수정 후 복귀 시 시트 기록 갱신
    if (isSheetOpen) {
      loadDayRecords(selectedDateRef.current);
    }
    // AI 처리 중인 기록 큐 처리 후 시트 기록 갱신
    processOfflineQueue()
      .then(() => { if (isSheetOpenRef.current) loadDayRecords(selectedDateRef.current); })
      .catch(() => {});
  }, [loadMonthData, loadDayRecords, isSheetOpen]));

  useEffect(() => { loadMonthData(currentMonthRef.current); }, [activeChild?.id, loadMonthData]);

  const handleDayPress = useCallback(async (day: { dateString: string }) => {
    const date = day.dateString;
    setSelectedDate(date);
    const records = await loadDayRecords(date) ?? [];
    openSheet();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (date !== todayStr && records.length > 0) {
      loadOrGenerateSummary(date, records);
    }
  }, [loadDayRecords, openSheet, loadOrGenerateSummary]);

  const handleMonthChange = useCallback((month: { year: number; month: number }) => {
    const yearMonth = `${month.year}-${String(month.month).padStart(2, '0')}`;
    setCurrentMonth(yearMonth);
    loadMonthData(yearMonth);
  }, [loadMonthData]);

  // 날짜 이동 (스와이프용) — ref로 최신 상태 참조
  const isSwipingRef = useRef(false);
  const navigateDayRef = useRef<(delta: number) => void>(() => {});
  useEffect(() => {
    navigateDayRef.current = (delta: number) => {
      if (isSwipingRef.current) return;
      isSwipingRef.current = true;

      const slideOut = delta > 0 ? -SCREEN_WIDTH : SCREEN_WIDTH;

      // 1) 현재 콘텐츠 밀어내기
      Animated.timing(contentSlideAnim, {
        toValue: slideOut,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        // 2) 날짜 변경 + 데이터 로드
        const d = new Date(selectedDateRef.current + 'T00:00:00');
        d.setDate(d.getDate() + delta);
        const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        handleDayPress({ dateString: newDate });
        if (newMonth !== currentMonthRef.current) {
          setCurrentMonth(newMonth);
          loadMonthData(newMonth);
        }

        // 3) 반대쪽에서 새 콘텐츠 밀어넣기
        contentSlideAnim.setValue(-slideOut);
        Animated.timing(contentSlideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          isSwipingRef.current = false;
        });
      });
    };
  }, [handleDayPress, loadMonthData, contentSlideAnim]);

  const swipePan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderMove: (_, g) => {
      contentSlideAnim.setValue(g.dx);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -60) {
        navigateDayRef.current(1);   // 왼쪽 → 다음날
      } else if (g.dx > 60) {
        navigateDayRef.current(-1);  // 오른쪽 → 전날
      } else {
        // 임계값 미달 → 원위치 복귀
        Animated.spring(contentSlideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  })).current;

  const handleRecordPress = useCallback((recordId: string) => {
    navigation.navigate('RecordDetail', { recordId });
  }, [navigation]);

  const handleCameraPress = useCallback(() => {
    Alert.alert('사진 추가', '', [
      {
        text: '카메라로 찍기', onPress: async () => {
          try {
            const result = await takePhoto();
            if (result) setPhotoModal(result);
          } catch (e) {
            Alert.alert('오류', e instanceof Error ? e.message : '카메라를 열 수 없습니다');
          }
        },
      },
      {
        text: '앨범에서 선택', onPress: async () => {
          try {
            const result = await pickPhotoFromLibrary();
            if (result) setPhotoModal(result);
          } catch (e) {
            Alert.alert('오류', e instanceof Error ? e.message : '앨범을 열 수 없습니다');
          }
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  }, []);

  const handleStartRecording = useCallback(() => {
    closeSheet();
    navigation.navigate('Recording', { date: selectedDate });
  }, [navigation, selectedDate, closeSheet]);

  const handleSaveText = useCallback(async () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setHours(inputHour, inputMinute, 0, 0);
      await processTextRecord(trimmed, activeChild?.id, selectedDate, d.getTime());
      setTextInput('');
      Alert.alert('저장 완료', '기록이 저장되었습니다.');
      await loadDayRecords(selectedDate);
      processOfflineQueue()
        .then(() => loadDayRecords(selectedDate))
        .catch(() => {});
      await loadMonthData(currentMonth);
    } catch {
      Alert.alert('저장 실패', '기록 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [textInput, selectedDate, activeChild?.id, loadDayRecords, loadMonthData, currentMonth, inputHour, inputMinute]);

  const summaryMap = useMemo(() => {
    const map: Record<string, DailyRecordSummary> = {};
    for (const s of dailySummaries) map[s.date] = s;
    return map;
  }, [dailySummaries]);

  const EVENT_DOT_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#A855F7', '#F59E0B', '#06B6D4'];

  const dayEvents = useMemo(() => {
    const dayStart = new Date(selectedDate + 'T00:00:00').getTime();
    const dayEnd = dayStart + 86399999;
    return monthEvents.filter(ev =>
      ev.startedAt <= dayEnd && (ev.endedAt === null || ev.endedAt >= dayStart)
    );
  }, [monthEvents, selectedDate]);

  useEffect(() => {
    if (dayEvents.length === 0) { setDayEventLogs({}); return; }
    getDailyLogsForEvents(dayEvents.map(e => e.id), selectedDate).then(setDayEventLogs);
  }, [dayEvents, selectedDate]);

  const eventDateMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const ev of monthEvents) {
      const start = new Date(ev.startedAt);
      const end = ev.endedAt ? new Date(ev.endedAt) : new Date();
      const color = EVENT_DOT_COLORS[monthEvents.indexOf(ev) % EVENT_DOT_COLORS.length];
      const cur = new Date(start);
      cur.setHours(0, 0, 0, 0);
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
        if (!map[key]) map[key] = [];
        if (!map[key].includes(color)) map[key].push(color);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [monthEvents]);

  const isToday = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return selectedDate === todayStr;
  }, [selectedDate]);

  const daySummaryData = useMemo(() => {
    if (dayRecords.length === 0) return null;
    const tagCounts = new Map<string, number>();
    for (const r of dayRecords) {
      for (const t of r.tags) tagCounts.set(t.name, (tagCounts.get(t.name) ?? 0) + 1);
    }
    const sortedTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0]);
    return { count: dayRecords.length, preview: dayRecords[0].summary, tags: sortedTags };
  }, [dayRecords]);

  const CustomDay = useCallback(({ date, state }: any) => {
    const dateStr = date?.dateString ?? '';
    const summary = summaryMap[dateStr];
    const count = summary?.count ?? 0;
    const isMedical = summary ? hasMedical(summary.tags) : false;
    const hasPhoto = summary?.hasPhoto ?? false;
    const isSelected = dateStr === selectedDate;
    const isToday = state === 'today';
    const bgColor = getDensityColor(count, densityColors);
    const eventColors = eventDateMap[dateStr] ?? [];
    const visibleDots = eventColors.slice(0, 3);
    const hasMore = eventColors.length > 3;

    return (
      <TouchableOpacity
        onPress={() => handleDayPress({ dateString: dateStr })}
        style={[styles.dayCell, { backgroundColor: isToday ? colors.primary : bgColor }, isSelected && styles.dayCellSelected]}
        activeOpacity={0.7}
      >
        {isMedical && <View style={styles.pearlDot} />}
        {hasPhoto && <View style={styles.photoDot} />}
        <Text style={[
          styles.dayText,
          isToday ? styles.dayTextToday : isSelected && styles.dayTextSelected,
          state === 'disabled' && styles.dayTextDisabled,
        ]}>
          {date?.day}
        </Text>
        {visibleDots.length > 0 && (
          <View style={styles.eventDotsRow}>
            {visibleDots.map((c, i) => (
              <View key={i} style={[styles.eventDot, { backgroundColor: c }]} />
            ))}
            {hasMore && <Text style={{ fontSize: 6, color: colors.textTertiary, lineHeight: 6 }}>…</Text>}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [summaryMap, eventDateMap, selectedDate, handleDayPress, styles, densityColors, colors]);

  const formattedDate = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
  }, [selectedDate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>캘린더</Text>
      </View>

      <Calendar
        key={`${calendarKey}-${isDark ? 'dark' : 'light'}`}
        current={calendarCurrent}
        dayComponent={CustomDay}
        onMonthChange={handleMonthChange}
        renderHeader={() => (
          <TouchableOpacity
            onPress={() => {
              const [y, m] = currentMonth.split('-');
              setPickerYear(parseInt(y));
              setPickerMonth(parseInt(m));
              setShowDatePicker(true);
            }}
            style={styles.calendarMonthBtn}
          >
            <Text style={styles.calendarMonthText}>
              {currentMonth.split('-')[0]}년 {parseInt(currentMonth.split('-')[1])}월 ▾
            </Text>
          </TouchableOpacity>
        )}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.background,
          textSectionTitleColor: colors.textTertiary,
          arrowColor: colors.primary,
          monthTextColor: colors.textPrimary,
          dayTextColor: colors.textPrimary,
          todayTextColor: colors.primary,
          textDisabledColor: colors.textTertiary,
          textMonthFontWeight: FONT_WEIGHT.semibold,
          textDayHeaderFontWeight: FONT_WEIGHT.medium,
          textMonthFontSize: FONT_SIZE.lg,
          textDayHeaderFontSize: FONT_SIZE.sm,
        }}
        style={styles.calendar}
      />

      <View style={styles.legend}>
        <Text style={styles.legendLabel}>기록 적음</Text>
        {densityColors.slice(1).map((color, i) => (
          <View key={i} style={[styles.legendDot, { backgroundColor: color }]} />
        ))}
        <Text style={styles.legendLabel}>많음</Text>
        <View style={styles.legendSpacer} />
        <View style={styles.pearlDotSmall} />
        <Text style={styles.legendLabel}>의료 기록</Text>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: EVENT_DOT_COLORS[0] }} />
        <Text style={styles.legendLabel}>증상 추적</Text>
      </View>

      {isSheetOpen && (
        <Animated.View style={[styles.dim, { opacity: dimAnim }]}>
          <TouchableOpacity style={styles.dimTouchable} onPress={closeSheet} />
        </Animated.View>
      )}

      {isSheetOpen && (
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: sheetAnim }], bottom: kbHeight }]}
          {...swipePan.panHandlers}
        >
          <View style={styles.sheetHandle} />

          <Animated.View style={{ flex: 1, transform: [{ translateX: contentSlideAnim }] }}>
          <Text style={styles.sheetDate}>{formattedDate}</Text>

          <ScrollView
            ref={sheetScrollRef}
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 이 날 활성 증상 */}
            {dayEvents.length > 0 && (
              <View style={styles.dayEventSection}>
                <Text style={styles.dayEventSectionTitle}>이 날의 증상</Text>
                {dayEvents.map((ev) => {
                  const dotColor = EVENT_DOT_COLORS[monthEvents.indexOf(ev) % EVENT_DOT_COLORS.length];
                  const ended = ev.endedAt !== null && ev.endedAt <= new Date(selectedDate + 'T23:59:59').getTime();
                  const severity = dayEventLogs[ev.id] ?? null;
                  const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
                    high:   { label: '심함', color: colors.error },
                    medium: { label: '보통', color: '#f59e0b' },
                    low:    { label: '약함', color: '#22c55e' },
                    none:   { label: '없음', color: colors.textTertiary },
                  };
                  const severityInfo = severity ? SEVERITY_LABELS[severity] : null;
                  return (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.dayEventRow}
                      onLongPress={() => setSelectedEventForSheet({ id: ev.id, name: ev.name })}
                      delayLongPress={400}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.dayEventDot, { backgroundColor: dotColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dayEventName}>{ev.name}</Text>
                        <Text style={styles.dayEventPeriod}>{formatEventDuration(ev.startedAt)}</Text>
                      </View>
                      {severityInfo && (
                        <Text style={[styles.dayEventBadge, { color: severityInfo.color, borderColor: severityInfo.color + '44', backgroundColor: severityInfo.color + '15' }]}>
                          {severityInfo.label}
                        </Text>
                      )}
                      {ended && !severityInfo && <Text style={styles.dayEventBadge}>종료</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {isLoadingRecords ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: SPACING.lg }} />
            ) : dayRecords.length === 0 ? (
              <View style={styles.emptyDay}>
                <Text style={styles.emptyText}>이 날은 기록이 없어요</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.sm, alignSelf: 'stretch' }}>
                  <TouchableOpacity onPress={handleStartRecording} style={[styles.recordButton, { flex: 1 }]}>
                    <Text style={styles.recordButtonText}>녹음 시작하기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCameraPress} style={styles.cameraButton}>
                    <Ionicons name="camera-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputDivider, { alignSelf: 'stretch' }]}>
                  <View style={styles.inputDividerLine} />
                  <Text style={styles.inputDividerText}>또는</Text>
                  <View style={styles.inputDividerLine} />
                </View>
                <View style={[styles.textInputContainer, { alignSelf: 'stretch' }]}>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>시간 설정</Text>
                    <TouchableOpacity style={styles.timeButton} onPress={() => setShowTimePicker(true)}>
                      <Text style={styles.timeButtonText}>{formatTimeHM(inputHour, inputMinute)}</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="텍스트로 기록하기..."
                    placeholderTextColor={colors.textTertiary}
                    value={textInput}
                    onChangeText={setTextInput}
                    multiline
                    onFocus={() => setTimeout(() => sheetScrollRef.current?.scrollToEnd({ animated: true }), 150)}
                  />
                  <TouchableOpacity
                    onPress={handleSaveText}
                    style={[styles.saveButton, { opacity: textInput.trim() ? 1 : 0.5 }]}
                    disabled={!textInput.trim() || isSaving}
                  >
                    <Text style={styles.saveButtonText}>{isSaving ? '저장 중...' : '저장'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {isToday || isExpandedRecords ? (
                  <>
                    {isExpandedRecords && !isToday && (
                      <View style={styles.collapseRow}>
                        <TouchableOpacity onPress={() => setIsExpandedRecords(false)}>
                          <Text style={styles.collapseBtn}>접기 ▴</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {dayRecords.map((item) => (
                      <RecordCard
                        key={item.id}
                        record={item}
                        onPress={() => handleRecordPress(item.id)}
                        customLabel={`${new Date(item.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })} · ${(item.audioPath || item.source === 'voice') ? '음성 기록' : '직접 입력'}`}
                        timeOnly={true}
                      />
                    ))}
                  </>
                ) : (
                  daySummaryData && (
                    <TouchableOpacity
                      onLongPress={() => setIsExpandedRecords(true)}
                      delayLongPress={400}
                      activeOpacity={0.85}
                      style={styles.daySummaryCard}
                    >
                      <View style={styles.daySummaryHeader}>
                        <Text style={styles.daySummaryCount}>기록 {daySummaryData.count}건</Text>
                        <Text style={styles.daySummaryHint}>길게 눌러 펼치기</Text>
                      </View>
                      {isSummarizing ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm }}>
                          <ActivityIndicator size="small" color={colors.textTertiary} />
                          <Text style={styles.daySummaryPreview}>요약 중...</Text>
                        </View>
                      ) : (
                        <Text style={styles.daySummaryPreview} numberOfLines={4}>
                          {daySummaryText ?? daySummaryData.preview}
                        </Text>
                      )}
                      {daySummaryData.tags.length > 0 && (
                        <View style={styles.daySummaryTags}>
                          {daySummaryData.tags.slice(0, 4).map(tag => (
                            <Text key={tag} style={styles.daySummaryTag}>{tag}</Text>
                          ))}
                          {daySummaryData.tags.length > 4 && (
                            <Text style={styles.daySummaryTagMore}>+{daySummaryData.tags.length - 4}</Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                )}
                <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm }}>
                  <TouchableOpacity onPress={handleStartRecording} style={[styles.recordButton, { flex: 1 }]}>
                    <Text style={styles.recordButtonText}>녹음 추가하기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCameraPress} style={styles.cameraButton}>
                    <Ionicons name="camera-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputDivider}>
                  <View style={styles.inputDividerLine} />
                  <Text style={styles.inputDividerText}>또는</Text>
                  <View style={styles.inputDividerLine} />
                </View>
                <View style={styles.textInputContainer}>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>시간 설정</Text>
                    <TouchableOpacity style={styles.timeButton} onPress={() => setShowTimePicker(true)}>
                      <Text style={styles.timeButtonText}>{formatTimeHM(inputHour, inputMinute)}</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="텍스트로 추가 기록하기..."
                    placeholderTextColor={colors.textTertiary}
                    value={textInput}
                    onChangeText={setTextInput}
                    multiline
                    onFocus={() => setTimeout(() => sheetScrollRef.current?.scrollToEnd({ animated: true }), 150)}
                  />
                  <TouchableOpacity
                    onPress={handleSaveText}
                    style={[styles.saveButton, { opacity: textInput.trim() ? 1 : 0.5 }]}
                    disabled={!textInput.trim() || isSaving}
                  >
                    <Text style={styles.saveButtonText}>{isSaving ? '저장 중...' : '저장'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
          </Animated.View>

          <TouchableOpacity onPress={closeSheet} style={styles.sheetClose}>
            <Text style={styles.sheetCloseText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      <TimePickerModal
        visible={showTimePicker}
        hour={inputHour}
        minute={inputMinute}
        title="시간 설정"
        onConfirm={(h, m) => { setInputHour(h); setInputMinute(m); setShowTimePicker(false); }}
        onCancel={() => setShowTimePicker(false)}
      />
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>날짜 선택</Text>
            <View style={styles.pickerYearRow}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)}>
                <Text style={styles.pickerArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.pickerYearText}>{pickerYear}년</Text>
              <TouchableOpacity onPress={() => setPickerYear(y => y + 1)}>
                <Text style={styles.pickerArrow}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerMonthGrid}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.pickerMonthItem, pickerMonth === m && styles.pickerMonthItemSelected]}
                  onPress={() => setPickerMonth(m)}
                >
                  <Text style={[styles.pickerMonthText, pickerMonth === m && styles.pickerMonthTextSelected]}>
                    {m}월
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.pickerButtonRow}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.pickerCancelBtn}>
                <Text style={styles.pickerCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDatePickerConfirm} style={styles.pickerConfirmBtn}>
                <Text style={styles.pickerConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 이벤트 롱프레스 삭제 Bottom Sheet */}
      <Modal
        visible={selectedEventForSheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEventForSheet(null)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setSelectedEventForSheet(null)}
        />
        <View style={styles.sheetContainer}>
          <View style={styles.eventSheetHandle} />
          <Text style={styles.sheetEventName} numberOfLines={2}>
            {selectedEventForSheet?.name}
          </Text>
          <TouchableOpacity
            style={styles.sheetDeleteBtn}
            onPress={async () => {
              if (selectedEventForSheet) {
                await handleDeleteEvent(selectedEventForSheet.id);
                setSelectedEventForSheet(null);
              }
            }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.sheetDeleteText}>삭제</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetCancelBtn}
            onPress={() => setSelectedEventForSheet(null)}
          >
            <Text style={styles.sheetCancelText}>취소</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <PhotoActionModal
        visible={!!photoModal}
        photoUri={photoModal?.uri ?? ''}
        photoBase64={photoModal?.base64}
        date={selectedDate}
        onClose={() => setPhotoModal(null)}
        onSaved={() => {
          setPhotoModal(null);
          loadDayRecords(selectedDate);
        }}
      />
    </SafeAreaView>
  );
}
