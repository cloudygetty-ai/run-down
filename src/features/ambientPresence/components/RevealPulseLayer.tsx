import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

type Props = {
  isActive: boolean;
  width: number;
  height: number;
};

// Full-map overlay that "breathes" gold during the 10-second Reveal Pulse window.
// useNativeDriver: false is required because we animate backgroundColor.
export const RevealPulseLayer: React.FC<Props> = ({ isActive, width, height }) => {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Flash in → hold → fade out over the ~10-second window
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1_000, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0.5, duration: 7_500, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1_500, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.timing(glow, { toValue: 0, duration: 800, useNativeDriver: false }).start();
    }
  }, [isActive]);

  const backgroundColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(192, 160, 96, 0)', 'rgba(192, 160, 96, 0.07)'],
  });

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(192, 160, 96, 0)', 'rgba(192, 160, 96, 0.25)'],
  });

  return (
    <View style={[styles.wrapper, { width, height }]} pointerEvents="none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor }]}
      />
      {/* Thin perimeter ring that pulses with the overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { borderWidth: 1, borderColor }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
});
