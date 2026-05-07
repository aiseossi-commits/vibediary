import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  Modal, Switch, FlatList, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, type AppColors } from '../constants/theme';
import { getSetting, setSetting } from '../db/appSettingsDao';
import {
  getAlarmPresets, addAlarmPreset, deleteAlarmPreset, toggleAlarmPreset,
  type AlarmPreset,
} from '../db/alarmPresetsDao';
import {
  requestNotificationPermission, scheduleAlarms, requestBatteryOptimizationExemption,
} from '../services/notificationService';
import { SettingsSection } from '../components/settings';

const PICKER_ITEM_H = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const BATTERY_PROMPT_KEY = 'battery_optimization_prompted';

export default function SettingsAlarmScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [alarms, setAlarms] = useState<AlarmPreset[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerHour, setPickerHour] = useState(8);
  const [pickerMinute, setPickerMinute] = useState(0);
  const hourListRef = useRef<FlatList<number>>(null);
  const minuteListRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    getAlarmPresets().then(setAlarms).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showTimePicker) return;
    const t = setTimeout(() => {
      hourListRef.current?.scrollToOffset({ offset: pickerHour * PICKER_ITEM_H, animated: false });
      minuteListRef.current?.scrollToOffset({ offset: pickerMinute * PICKER_ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTimePicker]);

  const handleAddAlarm = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert('알림 권한 필요', '설정에서 알림 권한을 허용해주세요.');
      return;
    }
    setPickerHour(8);
    setPickerMinute(0);
    setShowTimePicker(true);
  };

  const handlePickerConfirm = async () => {
    setShowTimePicker(false);
    const wasEmpty = alarms.length === 0;
    const alarm = await addAlarmPreset(pickerHour, pickerMinute);
    const next = [...alarms, alarm];
    setAlarms(next);
    await scheduleAlarms(next);

    // Android: 첫 알람 등록 시 1회 배터리 최적화 예외 안내
    if (Platform.OS === 'android' && wasEmpty) {
      const prompted = await getSetting(BATTERY_PROMPT_KEY);
      if (!prompted) {
        Alert.alert(
          '정시 알림 설정',
          '배터리 절약 모드 때문에 알림이 늦거나 오지 않을 수 있어요. 정확한 시간에 받으려면 배터리 최적화에서 이 앱을 예외로 설정해주세요.',
          [
            { text: '나중에', style: 'cancel', onPress: () => { void setSetting(BATTERY_PROMPT_KEY, '1'); } },
            { text: '설정 열기', onPress: async () => {
              await setSetting(BATTERY_PROMPT_KEY, '1');
              await requestBatteryOptimizationExemption();
            }},
          ]
        );
      }
    }
  };

  const handlePickerCancel = () => {
    setShowTimePicker(false);
  };

  const handleDeleteAlarm = async (id: string) => {
    await deleteAlarmPreset(id);
    const next = alarms.filter(a => a.id !== id);
    setAlarms(next);
    await scheduleAlarms(next);
  };

  const handleToggleAlarm = async (id: string, enabled: boolean) => {
    await toggleAlarmPreset(id, enabled);
    const next = alarms.map(a => a.id === id ? { ...a, enabled } : a);
    setAlarms(next);
    await scheduleAlarms(next);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        <SettingsSection
          title="기록 알람"
          description="지정 시간에 알림으로 빠른 기록을 할 수 있어요."
        >
          <View style={styles.card}>
            {alarms.map(alarm => (
              <View key={alarm.id} style={styles.alarmRow}>
                <Text style={styles.alarmTime}>
                  {String(alarm.hour).padStart(2, '0')}:{String(alarm.minute).padStart(2, '0')}
                </Text>
                <Switch
                  value={alarm.enabled}
                  onValueChange={(v) => handleToggleAlarm(alarm.id, v)}
                  trackColor={{ true: colors.primary }}
                />
                <TouchableOpacity onPress={() => handleDeleteAlarm(alarm.id)} style={styles.alarmDelete}>
                  <Text style={{ color: colors.textSecondary, fontSize: FONT_SIZE.md }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={handleAddAlarm}>
              <Text style={styles.addButtonText}>+ 알람 추가</Text>
            </TouchableOpacity>
          </View>
          {Platform.OS === 'android' && alarms.length > 0 && (
            <TouchableOpacity onPress={() => requestBatteryOptimizationExemption()} style={styles.batteryLink}>
              <Text style={styles.batteryLinkText}>
                알림이 늦게 오나요? 배터리 최적화 해제하기 →
              </Text>
            </TouchableOpacity>
          )}
        </SettingsSection>
      </ScrollView>

      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={handlePickerCancel}>
        <View style={styles.pickerModal}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handlePickerCancel} />
          <View style={styles.pickerBox}>
            <Text style={styles.pickerTitle}>시간 선택</Text>
            <View style={styles.pickerColumns}>
              <View style={styles.pickerColumn}>
                <View style={styles.pickerHighlight} pointerEvents="none" />
                <FlatList
                  ref={hourListRef}
                  data={HOURS}
                  keyExtractor={(item) => `h${item}`}
                  snapToInterval={PICKER_ITEM_H}
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: PICKER_ITEM_H * 2 }}
                  getItemLayout={(_, index) => ({ length: PICKER_ITEM_H, offset: PICKER_ITEM_H * index, index })}
                  extraData={pickerHour}
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.y / PICKER_ITEM_H);
                    setPickerHour(Math.max(0, Math.min(23, index)));
                  }}
                  onScrollEndDrag={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.y / PICKER_ITEM_H);
                    setPickerHour(Math.max(0, Math.min(23, index)));
                  }}
                  renderItem={({ item }) => (
                    <View style={styles.pickerItem}>
                      <Text style={item === pickerHour ? styles.pickerItemTextSelected : styles.pickerItemText}>
                        {String(item).padStart(2, '0')}
                      </Text>
                    </View>
                  )}
                />
              </View>
              <View style={styles.pickerColon}>
                <Text style={styles.pickerColonText}>:</Text>
              </View>
              <View style={styles.pickerColumn}>
                <View style={styles.pickerHighlight} pointerEvents="none" />
                <FlatList
                  ref={minuteListRef}
                  data={MINUTES}
                  keyExtractor={(item) => `m${item}`}
                  snapToInterval={PICKER_ITEM_H}
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: PICKER_ITEM_H * 2 }}
                  getItemLayout={(_, index) => ({ length: PICKER_ITEM_H, offset: PICKER_ITEM_H * index, index })}
                  extraData={pickerMinute}
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.y / PICKER_ITEM_H);
                    setPickerMinute(Math.max(0, Math.min(59, index)));
                  }}
                  onScrollEndDrag={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.y / PICKER_ITEM_H);
                    setPickerMinute(Math.max(0, Math.min(59, index)));
                  }}
                  renderItem={({ item }) => (
                    <View style={styles.pickerItem}>
                      <Text style={item === pickerMinute ? styles.pickerItemTextSelected : styles.pickerItemText}>
                        {String(item).padStart(2, '0')}
                      </Text>
                    </View>
                  )}
                />
              </View>
            </View>
            <View style={styles.pickerButtons}>
              <TouchableOpacity style={styles.pickerCancel} onPress={handlePickerCancel}>
                <Text style={styles.pickerCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerConfirm} onPress={handlePickerConfirm}>
                <Text style={styles.pickerConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    card: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
    alarmRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm },
    alarmTime: { flex: 1, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
    alarmDelete: { padding: SPACING.xs, marginLeft: SPACING.sm },
    addButton: { borderWidth: 1, borderColor: colors.border, borderRadius: BORDER_RADIUS.sm, paddingVertical: SPACING.sm, alignItems: 'center', marginTop: SPACING.sm },
    addButtonText: { color: colors.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
    batteryLink: { marginTop: SPACING.sm, paddingVertical: SPACING.xs },
    batteryLinkText: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, textAlign: 'center' as const },
    pickerModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    pickerBox: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, width: 280, overflow: 'hidden' },
    pickerTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary, textAlign: 'center', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
    pickerColumns: { flexDirection: 'row', height: PICKER_ITEM_H * 5 },
    pickerColumn: { flex: 1, position: 'relative' as const },
    pickerColon: { width: 24, alignItems: 'center' as const, justifyContent: 'center' as const },
    pickerColonText: { fontSize: FONT_SIZE.xl, color: colors.textPrimary, fontWeight: FONT_WEIGHT.bold },
    pickerHighlight: { position: 'absolute' as const, top: PICKER_ITEM_H * 2, height: PICKER_ITEM_H, left: 0, right: 0, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.primary },
    pickerItem: { height: PICKER_ITEM_H, alignItems: 'center' as const, justifyContent: 'center' as const },
    pickerItemText: { fontSize: FONT_SIZE.lg, color: colors.textSecondary },
    pickerItemTextSelected: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    pickerButtons: { flexDirection: 'row' as const, borderTopWidth: 1, borderTopColor: colors.divider },
    pickerCancel: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center' as const, borderRightWidth: 0.5, borderRightColor: colors.divider },
    pickerConfirm: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center' as const },
    pickerCancelText: { fontSize: FONT_SIZE.md, color: colors.textSecondary },
    pickerConfirmText: { fontSize: FONT_SIZE.md, color: colors.primary, fontWeight: FONT_WEIGHT.semibold },
  });
}
