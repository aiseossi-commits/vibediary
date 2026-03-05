import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import RecordCard from '../components/RecordCard';
import { getDailyRecordSummaries, getRecordsByDate, isDatabaseReady } from '../db';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, TAG_COLOR_MAP } from '../constants/theme';
import type { RecordWithTags, DailyRecordSummary } from '../types/record';

type ViewMode = 'month' | 'week';

export default function CalendarScreen() {
  const navigation = useNavigation<any>();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [currentMonth, setCurrentMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [dailySummaries, setDailySummaries] = useState<DailyRecordSummary[]>([]);
  const [dayRecords, setDayRecords] = useState<RecordWithTags[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // refs to avoid stale closure in useFocusEffect without causing re-runs on state change
  const currentMonthRef = useRef(currentMonth);
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => { currentMonthRef.current = currentMonth; }, [currentMonth]);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

  // 월별 데이터 로드
  const loadMonthData = useCallback(async (yearMonth: string) => {
    if (!isDatabaseReady()) {
      setDailySummaries([]);
      return;
    }
    try {
      const summaries = await getDailyRecordSummaries(yearMonth);
      setDailySummaries(summaries);
    } catch (error) {
      console.warn('캘린더 데이터 로드 실패:', error);
    }
  }, []);

  // 날짜별 기록 로드
  const loadDayRecords = useCallback(async (date: string) => {
    if (!isDatabaseReady()) {
      setDayRecords([]);
      return;
    }
    try {
      const records = await getRecordsByDate(date);
      setDayRecords(records);
    } catch (error) {
      console.warn('날짜별 기록 로드 실패:', error);
    }
  }, []);

  // 화면 포커스 시 데이터 로드 (refs 사용으로 불필요한 재실행 방지)
  useFocusEffect(
    useCallback(() => {
      loadMonthData(currentMonthRef.current);
      loadDayRecords(selectedDateRef.current);
    }, [loadMonthData, loadDayRecords])
  );

  // 캘린더 마킹 데이터 생성 (태그별 색상 점)
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    for (const summary of dailySummaries) {
      const dots = summary.tags.slice(0, 3).map((tag) => ({
        key: tag,
        color: TAG_COLOR_MAP[tag] || COLORS.textSecondary,
      }));

      marks[summary.date] = {
        dots,
        marked: true,
      };
    }

    // 선택된 날짜 표시
    if (marks[selectedDate]) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: COLORS.primaryLight,
      };
    } else {
      marks[selectedDate] = {
        selected: true,
        selectedColor: COLORS.primaryLight,
        dots: [],
      };
    }

    return marks;
  }, [dailySummaries, selectedDate]);

  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      setSelectedDate(day.dateString);
      loadDayRecords(day.dateString);
    },
    [loadDayRecords]
  );

  const handleMonthChange = useCallback(
    (month: { year: number; month: number }) => {
      const yearMonth = `${month.year}-${String(month.month).padStart(2, '0')}`;
      setCurrentMonth(yearMonth);
      loadMonthData(yearMonth);
    },
    [loadMonthData]
  );

  const handleRecordPress = useCallback(
    (recordId: string) => {
      navigation.navigate('RecordDetail', { recordId });
    },
    [navigation]
  );

  const handleStartRecording = useCallback(() => {
    navigation.navigate('Recording', { date: selectedDate });
  }, [navigation, selectedDate]);

  // 선택된 날짜 포맷
  const formattedDate = useMemo(() => {
    const date = new Date(selectedDate + 'T00:00:00');
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${month}월 ${day}일 (${weekday})`;
  }, [selectedDate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>캘린더</Text>
        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
          style={styles.viewModeButton}
        >
          <Text style={styles.viewModeText}>
            {viewMode === 'month' ? '주별' : '월별'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 캘린더 */}
      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        hideExtraDays={viewMode === 'week'}
        theme={{
          backgroundColor: COLORS.background,
          calendarBackground: COLORS.surface,
          textSectionTitleColor: COLORS.textSecondary,
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: COLORS.textOnPrimary,
          todayTextColor: COLORS.primary,
          dayTextColor: COLORS.textPrimary,
          textDisabledColor: COLORS.textTertiary,
          arrowColor: COLORS.primary,
          monthTextColor: COLORS.textPrimary,
          textDayFontWeight: FONT_WEIGHT.regular,
          textMonthFontWeight: FONT_WEIGHT.semibold,
          textDayHeaderFontWeight: FONT_WEIGHT.medium,
          textDayFontSize: FONT_SIZE.md,
          textMonthFontSize: FONT_SIZE.lg,
          textDayHeaderFontSize: FONT_SIZE.sm,
        }}
        style={styles.calendar}
      />

      {/* 선택 날짜 기록 목록 */}
      <View style={styles.recordsSection}>
        <Text style={styles.dateHeader}>{formattedDate}</Text>

        {dayRecords.length === 0 ? (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyText}>이 날은 기록이 없어요</Text>
            <TouchableOpacity onPress={handleStartRecording} style={styles.recordButton}>
              <Text style={styles.recordButtonText}>녹음 시작하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={dayRecords}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RecordCard record={item} onPress={() => handleRecordPress(item.id)} />
            )}
            contentContainerStyle={styles.recordsList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  viewModeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceSecondary,
  },
  viewModeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recordsSection: {
    flex: 1,
    paddingTop: SPACING.md,
  },
  dateHeader: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyDay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  recordButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  recordButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textOnPrimary,
    fontWeight: FONT_WEIGHT.medium,
  },
  recordsList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
});
