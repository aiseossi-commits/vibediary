import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
} from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface TagChipProps {
  name: string;
  tag?: { id: number; name: string };
  onPress?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

// 카테고리별 도트 색상 (모든 32개 기본 태그 커버)
const TAG_CATEGORY: Record<string, 'medical' | 'medication' | 'behavior' | 'therapy' | 'daily'> = {
  // 치료 계열
  '#치료': 'therapy', '#언어치료': 'therapy', '#작업치료': 'therapy', '#감각통합치료': 'therapy',
  '#ABA치료': 'therapy', '#놀이치료': 'therapy', '#물리치료': 'therapy', '#뇌파치료': 'therapy', '#한의학': 'therapy',
  // 투약 계열
  '#투약': 'medication', '#처방약': 'medication', '#보충제': 'medication', '#동종요법': 'medication', '#패치': 'medication',
  // 의료/신체
  '#의료': 'medical', '#건강': 'medical', '#배변': 'medical', '#수면': 'medical', '#감각': 'medical', '#각성': 'medical',
  // 행동/정서
  '#행동': 'behavior', '#기분': 'behavior', '#상동행동': 'behavior', '#자해': 'behavior', '#공격행동': 'behavior',
  // 일상/기타
  '#일상': 'daily', '#식사': 'daily', '#식단': 'daily', '#발달': 'daily', '#검사': 'daily', '#상담': 'daily', '#교육기관': 'daily',
};

function getTagColor(name: string, colors: ReturnType<typeof useTheme>['colors']): string {
  const cat = TAG_CATEGORY[name];
  switch (cat) {
    case 'medical': return colors.tagMedical;
    case 'medication': return colors.tagMedication;
    case 'behavior': return colors.tagBehavior;
    case 'therapy': return colors.tagTherapy;
    case 'daily': return colors.tagDaily;
    default: return colors.textTertiary; // 커스텀 태그
  }
}

export default function TagChip({
  name: nameProp,
  tag,
  onPress,
  onRemove,
  selected = false,
  size = 'sm',
  style,
}: TagChipProps) {
  const { colors } = useTheme();
  const name = tag?.name ?? nameProp ?? '';
  const tagColor = getTagColor(name, colors);
  const isSmall = size === 'sm';

  const chipContent = (
    <View
      style={[
        styles.chip,
        isSmall ? styles.chipSmall : styles.chipMedium,
        // 선택 시만 컬러 배경, 비선택은 투명 (가독성 우선)
        selected ? { backgroundColor: tagColor } : null,
        style,
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: selected ? colors.textOnPrimary : tagColor },
        ]}
      />
      <Text
        style={[
          styles.label,
          isSmall ? styles.labelSmall : styles.labelMedium,
          // 비선택 상태에선 텍스트는 연한 회색(textSecondary), 카테고리 색은 도트로만 표현
          { color: selected ? colors.textOnPrimary : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          style={styles.removeButton}
        >
          <Text
            style={[
              styles.removeIcon,
              { color: selected ? colors.textOnPrimary : colors.textTertiary },
            ]}
          >
            x
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {chipContent}
      </TouchableOpacity>
    );
  }

  return chipContent;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
  },
  chipSmall: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  chipMedium: {
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.xs + 2,
    gap: SPACING.xs + 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: FONT_WEIGHT.medium,
  },
  labelSmall: {
    fontSize: FONT_SIZE.xs,
  },
  labelMedium: {
    fontSize: FONT_SIZE.sm,
  },
  removeButton: {
    marginLeft: SPACING.xs - 2,
  },
  removeIcon: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE.xs + 2,
  },
});
