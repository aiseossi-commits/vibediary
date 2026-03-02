import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  TAG_COLOR_MAP,
} from '../constants/theme';

export interface TagChipProps {
  name: string;
  tag?: { id: number; name: string };
  onPress?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md';
  style?: ViewStyle;
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
  const name = tag?.name ?? nameProp ?? '';
  const tagColor = TAG_COLOR_MAP[name] ?? COLORS.textSecondary;
  const isSmall = size === 'sm';

  const chipContent = (
    <View
      style={[
        styles.chip,
        isSmall ? styles.chipSmall : styles.chipMedium,
        { backgroundColor: selected ? tagColor : `${tagColor}18` },
        style,
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: selected ? COLORS.textOnPrimary : tagColor },
        ]}
      />
      <Text
        style={[
          styles.label,
          isSmall ? styles.labelSmall : styles.labelMedium,
          { color: selected ? COLORS.textOnPrimary : tagColor },
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
              { color: selected ? COLORS.textOnPrimary : tagColor },
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
