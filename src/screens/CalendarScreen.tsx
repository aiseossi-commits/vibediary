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
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import RecordCard from '../components/RecordCard';
import WaveLoader from '../components/WaveLoader';
import { getDailyRecordSummaries, getRecordsByDate, isDatabaseReady } from '../db';
import { processTextRecord } from '../services/recordPipeline';
import { analyzeDailySummary } from '../services/aiProcessor';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;

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
    header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    calendar: { backgroundColor: colors.background },
    dayCell: { width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center', margin: 2 },
    dayCellSelected: { borderWidth: 1.5, borderColor: colors.primary },
    dayText: { fontSize: FONT_SIZE.sm, color: colors.textPrimary },
    dayTextToday: { color: colors.primary, fontWeight: FONT_WEIGHT.semibold },
    dayTextSelected: { fontWeight: FONT_WEIGHT.bold },
    dayTextDisabled: { color: colors.textTertiary },
    pearlDot: { position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.secondary },
    legend: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.xs },
    legendLabel: { fontSize: FONT_SIZE.xs, color: colors.textTertiary },
    legendDot: { width: 14, height: 14, borderRadius: 3 },
    legendSpacer: { flex: 1 },
    pearlDotSmall: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
    dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
    dimTouchable: { flex: 1 },
    sheet: {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT,
      backgroundColor: colors.surface,
      borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl,
      zIndex: 20, ...SHADOW.lg,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: SPACING.sm },
    sheetClose: { position: 'absolute', top: SPACING.md, right: SPACING.md, padding: SPACING.sm },
    sheetCloseText: { fontSize: FONT_SIZE.md, color: colors.textTertiary },
    sheetDate: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
    sheetScroll: { flex: 1 },
    sheetContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
    aiCards: { marginBottom: SPACING.md },
    aiLoading: { alignItems: 'center', paddingVertical: SPACING.lg, gap: SPACING.sm },
    aiLoadingText: { fontSize: FONT_SIZE.sm, color: colors.textTertiary },
    aiCardRow: { flexDirection: 'row', gap: SPACING.sm },
    aiCard: { flex: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, ...SHADOW.sm },
    aiCardRational: { backgroundColor: colors.surfaceSecondary, borderLeftWidth: 3, borderLeftColor: colors.primary },
    aiCardEmotional: { backgroundColor: colors.surfaceSecondary, borderLeftWidth: 3, borderLeftColor: colors.accent },
    aiCardLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.textTertiary, marginBottom: SPACING.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
    aiCardText: { fontSize: FONT_SIZE.sm, color: colors.textPrimary, lineHeight: 20 },
    emptyDay: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
    emptyText: { fontSize: FONT_SIZE.md, color: colors.textSecondary },
    recordButton: {
      paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md,
      borderWidth: 1.5, borderColor: colors.primary,
      alignItems: 'center',
    },
    recordButtonText: { fontSize: FONT_SIZE.md, color: colors.primary, fontWeight: FONT_WEIGHT.medium },
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
    staleBar: {
      backgroundColor: colors.accent + '33',
      borderRadius: BORDER_RADIUS.sm,
      padding: SPACING.sm,
      marginBottom: SPACING.sm,
      alignItems: 'center',
    },
    staleBarText: { fontSize: FONT_SIZE.sm, color: colors.accent, fontWeight: FONT_WEIGHT.medium },
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
  });
}

export default function CalendarScreen() {
  const navigation = useNavigation<any>();
  const { colors, densityColors, isDark } = useTheme();
  const { activeChild } = useChild();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [dailySummaries, setDailySummaries] = useState<DailyRecordSummary[]>([]);
  const [dayRecords, setDayRecords] = useState<RecordWithTags[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [textInput, setTextInput] = useState('')
  const [isSaving, setIsSaving] = useState(false);
  const [aiResult, setAiResult] = useState<{ rational: string; emotional: string } | null>(null);
  const [isAIStale, setIsAIStale] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [calendarKey, setCalendarKey] = useState(0);
  const [calendarCurrent, setCalendarCurrent] = useState<string | undefined>(undefined);
  const aiCache = useRef<Record<string, { rational: string; emotional: string }>>({});

  const sheetAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const dimAnim = useRef(new Animated.Value(0)).current;

  const currentMonthRef = useRef(currentMonth);
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => { currentMonthRef.current = currentMonth; }, [currentMonth]);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

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

  const handleDatePickerConfirm = useCallback(() => {
    const yearMonth = `${pickerYear}-${String(pickerMonth).padStart(2, '0')}`;
    const newCurrent = `${yearMonth}-01`;
    setCurrentMonth(yearMonth);
    setCalendarCurrent(newCurrent);
    setCalendarKey(k => k + 1);
    loadMonthData(yearMonth);
    setShowDatePicker(false);
  }, [pickerYear, pickerMonth, loadMonthData]);

  const loadAIAnalysis = useCallback(async (date: string, records: RecordWithTags[]) => {
    if (records.length === 0) return;
    if (aiCache.current[date]) { setAiResult(aiCache.current[date]); return; }
    setIsLoadingAI(true);
    try {
      const summaries = records.map((r) => r.summary);
      const tags = records.flatMap((r) => r.tags.map((t) => t.name));
      const result = await analyzeDailySummary(summaries, tags);
      aiCache.current[date] = result;
      setAiResult(result);
    } catch {
      setAiResult(null);
    } finally {
      setIsLoadingAI(false);
    }
  }, []);

  const handleRefreshAI = useCallback(async () => {
    delete aiCache.current[selectedDate];
    setIsAIStale(false);
    setAiResult(null);
    loadAIAnalysis(selectedDate, dayRecords);
  }, [selectedDate, dayRecords, loadAIAnalysis]);

  useFocusEffect(useCallback(() => { loadMonthData(currentMonthRef.current); }, [loadMonthData]));

  useEffect(() => { loadMonthData(currentMonthRef.current); }, [activeChild?.id, loadMonthData]);

  const handleDayPress = useCallback(async (day: { dateString: string }) => {
    const date = day.dateString;
    setSelectedDate(date);
    setAiResult(null);
    setIsAIStale(false);
    const records = await loadDayRecords(date);
    openSheet();
    loadAIAnalysis(date, records ?? []);
  }, [loadDayRecords, openSheet, loadAIAnalysis]);

  const handleMonthChange = useCallback((month: { year: number; month: number }) => {
    const yearMonth = `${month.year}-${String(month.month).padStart(2, '0')}`;
    setCurrentMonth(yearMonth);
    loadMonthData(yearMonth);
  }, [loadMonthData]);

  const handleRecordPress = useCallback((recordId: string) => {
    navigation.navigate('RecordDetail', { recordId });
  }, [navigation]);

  const handleStartRecording = useCallback(() => {
    closeSheet();
    navigation.navigate('Recording', { date: selectedDate });
  }, [navigation, selectedDate, closeSheet]);

  const handleSaveText = useCallback(async () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      const hadAiResult = aiResult !== null;
      const hadRecords = dayRecords.length > 0;
      await processTextRecord(trimmed, activeChild?.id);
      setTextInput('');
      Alert.alert('저장 완료', '기록이 저장되었습니다.');
      delete aiCache.current[selectedDate];
      const updatedRecords = await loadDayRecords(selectedDate);
      await loadMonthData(currentMonth);
      if (hadAiResult) {
        setIsAIStale(true);
      } else if (!hadRecords) {
        loadAIAnalysis(selectedDate, updatedRecords ?? []);
      }
    } catch (error) {
      Alert.alert('저장 실패', '기록 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [textInput, selectedDate, activeChild?.id, loadDayRecords, loadMonthData, currentMonth, aiResult, dayRecords, loadAIAnalysis]);

  const summaryMap = useMemo(() => {
    const map: Record<string, DailyRecordSummary> = {};
    for (const s of dailySummaries) map[s.date] = s;
    return map;
  }, [dailySummaries]);

  const CustomDay = useCallback(({ date, state }: any) => {
    const dateStr = date?.dateString ?? '';
    const summary = summaryMap[dateStr];
    const count = summary?.count ?? 0;
    const isMedical = summary ? hasMedical(summary.tags) : false;
    const isSelected = dateStr === selectedDate;
    const isToday = state === 'today';
    const bgColor = getDensityColor(count, densityColors);

    return (
      <TouchableOpacity
        onPress={() => handleDayPress({ dateString: dateStr })}
        style={[styles.dayCell, { backgroundColor: bgColor }, isSelected && styles.dayCellSelected]}
        activeOpacity={0.7}
      >
        {isMedical && <View style={styles.pearlDot} />}
        <Text style={[
          styles.dayText,
          isToday && styles.dayTextToday,
          isSelected && styles.dayTextSelected,
          state === 'disabled' && styles.dayTextDisabled,
        ]}>
          {date?.day}
        </Text>
      </TouchableOpacity>
    );
  }, [summaryMap, selectedDate, handleDayPress, styles, densityColors]);

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
      </View>

      {isSheetOpen && (
        <Animated.View style={[styles.dim, { opacity: dimAnim }]}>
          <TouchableOpacity style={styles.dimTouchable} onPress={closeSheet} />
        </Animated.View>
      )}

      {isSheetOpen && (
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetDate}>{formattedDate}</Text>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {dayRecords.length > 0 && (
                <View style={styles.aiCards}>
                  {isLoadingAI ? (
                    <View style={styles.aiLoading}>
                      <WaveLoader size={0.7} color={colors.primary} />
                      <Text style={styles.aiLoadingText}>바다가 분석 중...</Text>
                    </View>
                  ) : aiResult ? (
                    <>
                      {isAIStale && (
                        <TouchableOpacity onPress={handleRefreshAI} style={styles.staleBar}>
                          <Text style={styles.staleBarText}>최신 기록이 반영되지 않았어요 · 새로고침</Text>
                        </TouchableOpacity>
                      )}
                      <View style={styles.aiCardRow}>
                        <View style={[styles.aiCard, styles.aiCardRational]}>
                          <Text style={styles.aiCardLabel}>T의 하루 요약</Text>
                          <Text style={styles.aiCardText}>{aiResult.rational}</Text>
                        </View>
                        <View style={[styles.aiCard, styles.aiCardEmotional]}>
                          <Text style={styles.aiCardLabel}>F의 하루 공감</Text>
                          <Text style={styles.aiCardText}>{aiResult.emotional}</Text>
                        </View>
                      </View>
                    </>
                  ) : null}
                </View>
              )}

              {isLoadingRecords ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: SPACING.lg }} />
              ) : dayRecords.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyText}>이 날은 기록이 없어요</Text>
                  <TouchableOpacity onPress={handleStartRecording} style={styles.recordButton}>
                    <Text style={styles.recordButtonText}>녹음 시작하기</Text>
                  </TouchableOpacity>
                  <View style={styles.inputDivider}>
                    <View style={styles.inputDividerLine} />
                    <Text style={styles.inputDividerText}>또는</Text>
                    <View style={styles.inputDividerLine} />
                  </View>
                  <View style={styles.textInputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="텍스트로 기록하기..."
                      placeholderTextColor={colors.textTertiary}
                      value={textInput}
                      onChangeText={setTextInput}
                      multiline
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
                  {dayRecords.map((item) => (
                    <RecordCard key={item.id} record={item} onPress={() => handleRecordPress(item.id)} />
                  ))}
                  <TouchableOpacity onPress={handleStartRecording} style={[styles.recordButton, { marginTop: SPACING.sm }]}>
                    <Text style={styles.recordButtonText}>녹음 추가하기</Text>
                  </TouchableOpacity>
                  <View style={styles.inputDivider}>
                    <View style={styles.inputDividerLine} />
                    <Text style={styles.inputDividerText}>또는</Text>
                    <View style={styles.inputDividerLine} />
                  </View>
                  <View style={styles.textInputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="텍스트로 추가 기록하기..."
                      placeholderTextColor={colors.textTertiary}
                      value={textInput}
                      onChangeText={setTextInput}
                      multiline
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
          </KeyboardAvoidingView>

          <TouchableOpacity onPress={closeSheet} style={styles.sheetClose}>
            <Text style={styles.sheetCloseText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
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
    </SafeAreaView>
  );
}
