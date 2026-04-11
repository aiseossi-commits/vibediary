import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS, type AppColors } from '../constants/theme';
import { DEFAULT_EVENT_NAMES, formatEventDuration } from '../constants/events';
import { createEvent, endEvent, type ActiveEvent, getEventNamePresets, addEventNamePreset, deleteEventNamePreset, getHiddenDefaultEventNames, hideDefaultEventName, upsertDailyLog, getDailyLogsForEvents, todayStr, type EventSeverity } from '../db/eventDao';

interface Props {
  visible: boolean;
  onClose: () => void;
  childId: string;
  activeEvents: ActiveEvent[];
  onChanged: () => void;
}

const SCREEN_H = Dimensions.get('window').height;
const STRIP_ITEM_W = 60;

function maxDayInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function todayDate() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

// ── DatePickerStrip ──────────────────────────────────────────────────────────
interface StripProps {
  data: number[];
  selectedIndex: number;
  renderLabel: (v: number) => string;
  onSelect: (index: number) => void;
  colors: AppColors;
}

function DatePickerStrip({ data, selectedIndex, renderLabel, onSelect, colors }: StripProps) {
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < data.length) {
      listRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
    }
  }, [selectedIndex, data]);

  return (
    <FlatList
      ref={listRef}
      horizontal
      data={data}
      keyExtractor={v => v.toString()}
      snapToInterval={STRIP_ITEM_W}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      initialScrollIndex={selectedIndex}
      getItemLayout={(_, i) => ({ length: STRIP_ITEM_W, offset: STRIP_ITEM_W * i, index: i })}
      onMomentumScrollEnd={e => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / STRIP_ITEM_W);
        onSelect(Math.min(Math.max(idx, 0), data.length - 1));
      }}
      renderItem={({ item, index }) => {
        const active = index === selectedIndex;
        return (
          <TouchableOpacity
            style={{
              width: STRIP_ITEM_W,
              alignItems: 'center',
              paddingVertical: SPACING.xs + 2,
              borderRadius: BORDER_RADIUS.sm,
              backgroundColor: active ? colors.primary + '18' : 'transparent',
            }}
            onPress={() => {
              onSelect(index);
              listRef.current?.scrollToIndex({ index, animated: true });
            }}
          >
            <Text style={{
              fontSize: FONT_SIZE.md,
              color: active ? colors.primary : colors.textSecondary,
              fontWeight: active ? '700' : '400',
            }}>
              {renderLabel(item)}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

// ── SegmentedDatePicker ──────────────────────────────────────────────────────
type DateField = 'year' | 'month' | 'day';

interface DatePickerProps {
  year: number;
  month: number;
  day: number;
  onChange: (year: number, month: number, day: number) => void;
  colors: AppColors;
}

function SegmentedDatePicker({ year, month, day, onChange, colors }: DatePickerProps) {
  const [activeField, setActiveField] = useState<DateField | null>(null);

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i), [currentYear]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => {
    const max = maxDayInMonth(year, month);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [year, month]);

  function updateYear(idx: number) {
    const y = years[idx];
    onChange(y, month, Math.min(day, maxDayInMonth(y, month)));
  }
  function updateMonth(idx: number) {
    const m = months[idx];
    onChange(year, m, Math.min(day, maxDayInMonth(year, m)));
  }
  function updateDay(idx: number) { onChange(year, month, days[idx]); }
  function toggle(field: DateField) { setActiveField(prev => prev === field ? null : field); }

  const seg = (field: DateField, label: string) => (
    <TouchableOpacity
      style={{
        paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: activeField === field ? colors.primary + '18' : 'transparent',
        borderWidth: 1,
        borderColor: activeField === field ? colors.primary : colors.border,
      }}
      onPress={() => toggle(field)}
    >
      <Text style={{
        fontSize: FONT_SIZE.md, fontWeight: '600',
        color: activeField === field ? colors.primary : colors.textPrimary,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ marginBottom: SPACING.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs }}>
        {seg('year', `${year}년`)}
        {seg('month', `${month}월`)}
        {seg('day', `${day}일`)}
        {activeField && (
          <TouchableOpacity onPress={() => setActiveField(null)} style={{ marginLeft: 'auto' }}>
            <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textTertiary }}>닫기</Text>
          </TouchableOpacity>
        )}
      </View>
      {activeField === 'year' && (
        <DatePickerStrip data={years} selectedIndex={years.indexOf(year)}
          renderLabel={v => `${v}년`} onSelect={updateYear} colors={colors} />
      )}
      {activeField === 'month' && (
        <DatePickerStrip data={months} selectedIndex={month - 1}
          renderLabel={v => `${v}월`} onSelect={updateMonth} colors={colors} />
      )}
      {activeField === 'day' && (
        <DatePickerStrip data={days} selectedIndex={day - 1}
          renderLabel={v => `${v}일`} onSelect={updateDay} colors={colors} />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
function createStyles(colors: AppColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: BORDER_RADIUS.xl,
      borderTopRightRadius: BORDER_RADIUS.xl,
      paddingBottom: 24,
      maxHeight: SCREEN_H * 0.88,
    },
    handle: {
      width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
      alignSelf: 'center', marginTop: 12, marginBottom: 8,
    },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: colors.textPrimary },
    section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
    sectionTitle: {
      fontSize: FONT_SIZE.sm, fontWeight: '600', color: colors.textSecondary,
      marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    activeEventRow: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md, paddingTop: SPACING.sm + 2, paddingBottom: SPACING.sm,
      marginBottom: SPACING.xs,
    },
    activeEventTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xs },
    activeEventInfo: { flex: 1 },
    activeEventName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: colors.textPrimary },
    activeEventDuration: { fontSize: FONT_SIZE.sm, color: colors.primary, marginTop: 2 },
    endButton: {
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
      backgroundColor: colors.error + '20',
      borderRadius: BORDER_RADIUS.sm,
    },
    endButtonText: { fontSize: FONT_SIZE.sm, color: colors.error, fontWeight: '600' },
    severityRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs },
    severityBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 4,
      borderRadius: BORDER_RADIUS.sm,
      borderWidth: 1, borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    severityBtnText: { fontSize: FONT_SIZE.xs, fontWeight: '500', color: colors.textTertiary },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1, borderColor: colors.border,
    },
    chipText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    customChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingLeft: SPACING.md, paddingRight: SPACING.xs + 2, paddingVertical: SPACING.xs + 2,
      backgroundColor: colors.primary + '12',
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1, borderColor: colors.primary + '44',
    },
    customChipText: { fontSize: FONT_SIZE.sm, color: colors.primary, fontWeight: '500' },
    customInputRow: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    customInput: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
      color: colors.textPrimary, fontSize: FONT_SIZE.md,
      borderWidth: 1, borderColor: colors.border,
    },
    addButton: {
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    },
    addButtonText: { color: colors.textOnPrimary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
    emptyText: { fontSize: FONT_SIZE.sm, color: colors.textTertiary, textAlign: 'center', paddingVertical: SPACING.md },
    divider: { height: 1, backgroundColor: colors.divider, marginHorizontal: SPACING.lg, marginBottom: SPACING.md },
    startDateLabel: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginBottom: SPACING.xs },
    stagedSection: {
      marginBottom: SPACING.md,
      padding: SPACING.sm,
      backgroundColor: colors.primary + '0d',
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: colors.primary + '33',
    },
    stagedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xs },
    stagedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, flex: 1 },
    stagedChip: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingLeft: SPACING.sm, paddingRight: 4, paddingVertical: 3,
      backgroundColor: colors.primary + '20',
      borderRadius: BORDER_RADIUS.full,
    },
    stagedChipText: { fontSize: FONT_SIZE.xs, color: colors.primary, fontWeight: '600' },
    confirmButton: {
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.sm,
      marginLeft: SPACING.sm,
    },
    confirmButtonText: { fontSize: FONT_SIZE.sm, color: colors.textOnPrimary, fontWeight: '700' },
  });
}

// ── EventTrackerModal ────────────────────────────────────────────────────────
interface StagedItem { name: string; isNew: boolean; }

export default function EventTrackerModal({ visible, onClose, childId, activeEvents, onChanged }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [customName, setCustomName] = useState('');
  const [startDate, setStartDate] = useState(todayDate);
  const [customPresets, setCustomPresets] = useState<string[]>([]);
  const [hiddenDefaults, setHiddenDefaults] = useState<string[]>([]);
  const [staged, setStaged] = useState<StagedItem[]>([]);
  const [todayLogs, setTodayLogs] = useState<Record<number, EventSeverity>>({});

  const loadPresets = useCallback(async () => {
    const [presets, hidden] = await Promise.all([
      getEventNamePresets(childId),
      getHiddenDefaultEventNames(childId),
    ]);
    setCustomPresets(presets);
    setHiddenDefaults(hidden);
  }, [childId]);

  const loadTodayLogs = useCallback(async () => {
    if (activeEvents.length === 0) return;
    const logs = await getDailyLogsForEvents(activeEvents.map(e => e.id), todayStr());
    setTodayLogs(logs);
  }, [activeEvents]);

  useEffect(() => {
    if (visible) { loadPresets(); loadTodayLogs(); }
    else {
      setCustomName('');
      setStartDate(todayDate());
      setStaged([]);
    }
  }, [visible, loadPresets, loadTodayLogs]);

  function getStartMs() {
    const d = new Date(startDate.year, startDate.month - 1, startDate.day);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function stageItem(name: string, isNew = false) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (staged.some(s => s.name === trimmed)) return;
    setStaged(prev => [...prev, { name: trimmed, isNew }]);
    if (isNew) setCustomName('');
  }

  function unstageItem(name: string) {
    setStaged(prev => prev.filter(s => s.name !== name));
  }

  async function handleConfirm() {
    if (staged.length === 0) return;
    const startMs = getStartMs();
    for (const item of staged) {
      await createEvent(childId, item.name, startMs);
      if (item.isNew) await addEventNamePreset(childId, item.name);
    }
    setStaged([]);
    await loadPresets();
    onChanged();
  }

  async function handleSeverity(eventId: number, severity: EventSeverity) {
    await upsertDailyLog(eventId, todayStr(), severity);
    setTodayLogs(prev => ({ ...prev, [eventId]: severity }));
  }

  async function handleDeletePreset(name: string) {
    await deleteEventNamePreset(childId, name);
    await loadPresets();
  }

  async function handleHideDefault(name: string) {
    await hideDefaultEventName(childId, name);
    await loadPresets();
  }

  async function handleEnd(event: ActiveEvent) {
    Alert.alert(
      `"${event.name}" 종료`,
      '언제 나았나요?',
      [
        {
          text: '오늘 종료',
          onPress: async () => {
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            await endEvent(event.id, end.getTime());
            onChanged();
          },
        },
        { text: '취소', style: 'cancel' },
      ]
    );
  }

  function handleClose() {
    setCustomName('');
    setStartDate(todayDate());
    setStaged([]);
    onClose();
  }

  const visibleDefaults = DEFAULT_EVENT_NAMES.filter(n => !hiddenDefaults.includes(n));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.headerTitle}>지금 무슨 일이 있나요?</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* 활성 이벤트 목록 */}
              {activeEvents.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>지금 진행 중</Text>
                  {activeEvents.map(ev => {
                    const current = todayLogs[ev.id] ?? null;
                    const SEVERITIES: { value: EventSeverity; label: string; color: string }[] = [
                      { value: 'high',   label: '심함', color: colors.error },
                      { value: 'medium', label: '보통', color: '#f59e0b' },
                      { value: 'low',    label: '약함', color: '#22c55e' },
                      { value: 'none',   label: '없음', color: colors.textTertiary },
                    ];
                    return (
                      <View key={ev.id} style={styles.activeEventRow}>
                        <View style={styles.activeEventTopRow}>
                          <View style={styles.activeEventInfo}>
                            <Text style={styles.activeEventName}>{ev.name}</Text>
                            <Text style={styles.activeEventDuration}>{formatEventDuration(ev.startedAt)}</Text>
                          </View>
                          <TouchableOpacity style={styles.endButton} onPress={() => handleEnd(ev)}>
                            <Text style={styles.endButtonText}>종료</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.severityRow}>
                          {SEVERITIES.map(s => {
                            const active = current === s.value;
                            return (
                              <TouchableOpacity
                                key={s.value}
                                style={[styles.severityBtn, active && { backgroundColor: s.color + '22', borderColor: s.color }]}
                                onPress={() => handleSeverity(ev.id, s.value)}
                              >
                                <Text style={[styles.severityBtnText, active && { color: s.color, fontWeight: '700' }]}>
                                  {s.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {activeEvents.length > 0 && <View style={styles.divider} />}

              {/* 새 증상·상태 추가 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>새 증상·상태 추가</Text>

                {/* 스테이징 목록 */}
                {staged.length > 0 && (
                  <View style={styles.stagedSection}>
                    <View style={styles.stagedRow}>
                      <View style={styles.stagedChips}>
                        {staged.map(item => (
                          <View key={item.name} style={styles.stagedChip}>
                            <Text style={styles.stagedChipText}>{item.name}</Text>
                            <TouchableOpacity onPress={() => unstageItem(item.name)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}>
                              <Ionicons name="close-circle" size={14} color={colors.primary + '99'} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                        <Text style={styles.confirmButtonText}>확정</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* 시작일 */}
                <Text style={styles.startDateLabel}>시작일</Text>
                <SegmentedDatePicker
                  year={startDate.year} month={startDate.month} day={startDate.day}
                  onChange={(y, m, d) => setStartDate({ year: y, month: m, day: d })}
                  colors={colors}
                />

                {/* 직접 입력 */}
                <View style={styles.customInputRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="직접 입력 (예: 두드러기, 틱 증상...)"
                    placeholderTextColor={colors.textTertiary}
                    value={customName}
                    onChangeText={setCustomName}
                    returnKeyType="done"
                    onSubmitEditing={() => stageItem(customName, true)}
                    autoFocus={false}
                  />
                  <TouchableOpacity
                    style={[styles.addButton, !customName.trim() && { opacity: 0.4 }]}
                    onPress={() => stageItem(customName, true)}
                    disabled={!customName.trim()}
                  >
                    <Text style={styles.addButtonText}>추가</Text>
                  </TouchableOpacity>
                </View>

                {/* 나의 증상 칩 */}
                {customPresets.length > 0 && (
                  <View style={[styles.chipGrid, { marginBottom: SPACING.sm }]}>
                    {customPresets.map(name => {
                      const isStaged = staged.some(s => s.name === name);
                      return (
                        <View key={name} style={[styles.customChip, isStaged && { opacity: 0.45 }]}>
                          <TouchableOpacity onPress={() => stageItem(name)} disabled={isStaged}>
                            <Text style={styles.customChipText}>{name}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeletePreset(name)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                            <Ionicons name="close-circle" size={15} color={colors.primary + '88'} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* 기본 칩 */}
                {visibleDefaults.length > 0 && (
                  <View style={styles.chipGrid}>
                    {visibleDefaults.map(name => {
                      const isStaged = staged.some(s => s.name === name);
                      return (
                        <View key={name} style={[styles.chip, isStaged && { opacity: 0.45 }]}>
                          <TouchableOpacity onPress={() => stageItem(name)} disabled={isStaged}>
                            <Text style={styles.chipText}>{name}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleHideDefault(name)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                            <Ionicons name="close-circle" size={15} color={colors.textTertiary + 'aa'} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
