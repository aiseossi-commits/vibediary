import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BORDER_RADIUS, type AppColors } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean; // SettingsRow처럼 자체 패딩 가진 자식이 들어올 때
}

/**
 * SettingsCard
 * - surface 배경 + radius
 * - 자식들 사이에 자동 divider 삽입 (View 자식 기준)
 */
export default function SettingsCard({ children, style, noPadding = true }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // 자식 사이에 divider 삽입 (Fragment / null / boolean 제외)
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.card, !noPadding && styles.cardPadded, style]}>
      {items.map((child, idx) => (
        <React.Fragment key={idx}>
          {child}
          {idx < items.length - 1 ? <View style={styles.divider} /> : null}
        </React.Fragment>
      ))}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      overflow: 'hidden',
    },
    cardPadded: {
      padding: 16,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginLeft: 16,
    },
  });
}
