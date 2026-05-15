import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

const BG = '#0EA5A0';
const TEXT = '#F1F5F9';

type Props = {
  visible: boolean;
  onFadeOutEnd?: () => void;
};

export default function SplashOverlay({ visible, onFadeOutEnd }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [textOpacity]);

  useEffect(() => {
    if (!visible) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onFadeOutEnd?.());
    }
  }, [visible, opacity, onFadeOutEnd]);

  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, styles.container, { opacity }]}>
      <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
        <Text style={styles.line}>기록에 치이지 말고,</Text>
        <Text style={styles.line}>그냥 말하세요</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { alignItems: 'center' },
  line: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -1,
    lineHeight: 34,
  },
});
