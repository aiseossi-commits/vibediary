import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS, type AppColors } from '../constants/theme';
import { DEFAULT_EVENT_NAMES, formatEventDuration } from '../constants/events';
import { createEvent, endEvent, type ActiveEvent } from '../db/activeEventsDao';

interface Props {
  visible: boolean;
  onClose: () => void;
  childId: string;
  activeEvents: ActiveEvent[];
  onChanged: () => void;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: BORDER_RADIUS.xl,
      borderTopRightRadius: BORDER_RADIUS.xl,
      paddingBottom: 36,
      maxHeight: '85%',
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
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
      marginBottom: SPACING.xs,
    },
    activeEventInfo: { flex: 1 },
    activeEventName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: colors.textPrimary },
    activeEventDuration: { fontSize: FONT_SIZE.sm, color: colors.primary, marginTop: 2 },
    endButton: {
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
      backgroundColor: colors.error + '20',
      borderRadius: BORDER_RADIUS.sm,
    },
    endButtonText: { fontSize: FONT_SIZE.sm, color: colors.error, fontWeight: '600' },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
    chip: {
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1, borderColor: colors.border,
    },
    chipText: { fontSize: FONT_SIZE.sm, color: colors.textSecondary },
    customInputRow: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      marginTop: SPACING.sm,
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
  });
}

export default function EventTrackerModal({ visible, onClose, childId, activeEvents, onChanged }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    if (!visible) setCustomName('');
  }, [visible]);

  async function handleAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await createEvent(childId, trimmed, today.getTime());
    setCustomName('');
    onChanged();
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.headerTitle}>이벤트 추적</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* 활성 이벤트 목록 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>진행 중</Text>
                {activeEvents.length === 0 ? (
                  <Text style={styles.emptyText}>진행 중인 이벤트가 없어요</Text>
                ) : (
                  activeEvents.map(ev => (
                    <View key={ev.id} style={styles.activeEventRow}>
                      <View style={styles.activeEventInfo}>
                        <Text style={styles.activeEventName}>{ev.name}</Text>
                        <Text style={styles.activeEventDuration}>{formatEventDuration(ev.startedAt)}</Text>
                      </View>
                      <TouchableOpacity style={styles.endButton} onPress={() => handleEnd(ev)}>
                        <Text style={styles.endButtonText}>종료</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.divider} />

              {/* 새 이벤트 추가 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>새 이벤트 추가</Text>
                <View style={styles.chipGrid}>
                  {DEFAULT_EVENT_NAMES.map(name => (
                    <TouchableOpacity key={name} style={styles.chip} onPress={() => handleAdd(name)}>
                      <Text style={styles.chipText}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.customInputRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="직접 입력..."
                    placeholderTextColor={colors.textTertiary}
                    value={customName}
                    onChangeText={setCustomName}
                    returnKeyType="done"
                    onSubmitEditing={() => handleAdd(customName)}
                  />
                  <TouchableOpacity
                    style={[styles.addButton, !customName.trim() && { opacity: 0.4 }]}
                    onPress={() => handleAdd(customName)}
                    disabled={!customName.trim()}
                  >
                    <Text style={styles.addButtonText}>추가</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
