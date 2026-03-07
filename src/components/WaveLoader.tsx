import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const BAR_COUNT = 6;
const MAX_HEIGHT = 40;
const MIN_HEIGHT = 8;
const BAR_WIDTH = 5;
const STAGGER_DELAY = 110;
const DURATION = 380;

interface WaveLoaderProps {
  color?: string;
  size?: number;
}

export default function WaveLoader({ color, size = 1 }: WaveLoaderProps) {
  const { colors } = useTheme();
  const barColor = color ?? colors.secondary;

  const animations = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(MIN_HEIGHT))
  ).current;

  useEffect(() => {
    const loops = animations.map((anim, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(i * STAGGER_DELAY),
          Animated.timing(anim, { toValue: MAX_HEIGHT, duration: DURATION, useNativeDriver: false }),
          Animated.timing(anim, { toValue: MIN_HEIGHT, duration: DURATION, useNativeDriver: false }),
        ])
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach((l) => l.stop());
  }, [animations]);

  return (
    <View style={[styles.container, { height: MAX_HEIGHT * size + 8 }]}>
      {animations.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              width: BAR_WIDTH * size,
              height: anim.interpolate({
                inputRange: [MIN_HEIGHT, MAX_HEIGHT],
                outputRange: [MIN_HEIGHT * size, MAX_HEIGHT * size],
              }),
              backgroundColor: barColor,
              borderRadius: (BAR_WIDTH * size) / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
  },
  bar: {
    borderRadius: 3,
  },
});
