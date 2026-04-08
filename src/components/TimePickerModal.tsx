import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Modal, TouchableOpacity,
  NativeScrollEvent, NativeSyntheticEvent,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/theme';

const ITEM_HEIGHT = 48;
const VISIBLE = 3;

const AMPM_ITEMS = ['오전', '오후'];
const HOUR_ITEMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINUTE_ITEMS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function WheelColumn({
  items,
  initialIndex,
  label,
  onSelect,
  minWidth = 56,
}: {
  items: string[];
  initialIndex: number;
  label: string;
  onSelect: (i: number) => void;
  minWidth?: number;
}) {
  const { colors } = useTheme();
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [initialIndex]);

  const onEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    onSelect(Math.max(0, Math.min(i, items.length - 1)));
  }, [items.length, onSelect]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginBottom: SPACING.xs }}>
        {label}
      </Text>
      <View style={{ width: minWidth, height: ITEM_HEIGHT * VISIBLE, overflow: 'hidden' }}>
        <ScrollView
          ref={ref}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={onEnd}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
        >
          {items.map((item, i) => (
            <View key={i} style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: colors.textPrimary }}>
                {item}
              </Text>
            </View>
          ))}
        </ScrollView>
        {/* 선택 영역 하이라이트 — ScrollView 위에 렌더링되지만 pointerEvents="none"으로 터치 통과 */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: ITEM_HEIGHT, left: 0, right: 0,
            height: ITEM_HEIGHT,
            backgroundColor: colors.primaryLight,
            borderRadius: BORDER_RADIUS.sm,
            opacity: 0.5,
          }}
        />
      </View>
    </View>
  );
}

interface Props {
  visible: boolean;
  hour: number;   // 0-23
  minute: number; // 0-59
  title: string;
  onConfirm: (hour: number, minute: number) => void;
  onCancel: () => void;
}

export default function TimePickerModal({ visible, hour, minute, title, onConfirm, onCancel }: Props) {
  const { colors } = useTheme();

  const ampmIdx = hour < 12 ? 0 : 1;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const minuteIdx = Math.round(minute / 5) % 12;

  const ampmRef = useRef(ampmIdx);
  const hourRef = useRef(h12 - 1);
  const minRef = useRef(minuteIdx);

  useEffect(() => {
    if (visible) {
      ampmRef.current = hour < 12 ? 0 : 1;
      hourRef.current = (hour % 12 === 0 ? 12 : hour % 12) - 1;
      minRef.current = Math.round(minute / 5) % 12;
    }
  }, [visible, hour, minute]);

  const handleConfirm = useCallback(() => {
    const isAm = ampmRef.current === 0;
    const h12sel = hourRef.current + 1; // 1-12
    let h24: number;
    if (isAm) {
      h24 = h12sel === 12 ? 0 : h12sel;
    } else {
      h24 = h12sel === 12 ? 12 : h12sel + 12;
    }
    onConfirm(h24, minRef.current * 5);
  }, [onConfirm]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: BORDER_RADIUS.xl,
          padding: SPACING.lg,
          width: '85%',
        }}>
          <Text style={{
            fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold,
            color: colors.textPrimary, textAlign: 'center', marginBottom: SPACING.lg,
          }}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: SPACING.md, marginBottom: SPACING.lg }}>
            <WheelColumn
              items={AMPM_ITEMS}
              initialIndex={ampmIdx}
              label="오전/오후"
              onSelect={i => { ampmRef.current = i; }}
              minWidth={72}
            />
            <WheelColumn
              items={HOUR_ITEMS}
              initialIndex={h12 - 1}
              label="시간"
              onSelect={i => { hourRef.current = i; }}
            />
            <WheelColumn
              items={MINUTE_ITEMS}
              initialIndex={minuteIdx}
              label="분"
              onSelect={i => { minRef.current = i; }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1, paddingVertical: SPACING.sm,
                borderRadius: BORDER_RADIUS.md, alignItems: 'center',
                backgroundColor: colors.surfaceSecondary,
              }}
            >
              <Text style={{ fontSize: FONT_SIZE.md, color: colors.textSecondary }}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={{
                flex: 1, paddingVertical: SPACING.sm,
                borderRadius: BORDER_RADIUS.md, alignItems: 'center',
                backgroundColor: colors.primary,
              }}
            >
              <Text style={{ fontSize: FONT_SIZE.md, color: colors.textOnPrimary, fontWeight: FONT_WEIGHT.semibold }}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
