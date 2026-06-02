import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

type Props = {
  intensity: number; // 0–1
  children: React.ReactNode;
};

// Simulates digital interference when near a high-compatibility match.
// At intensity > 0.5 the layout visibly distorts; at 1.0 it's a full glitch storm.
export const GlitchEffect: React.FC<Props> = ({ intensity, children }) => {
  const shiftX = useRef(new Animated.Value(0)).current;
  const shiftY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rLayer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (intensity <= 0.05) {
      shiftX.setValue(0);
      shiftY.setValue(0);
      opacity.setValue(1);
      return;
    }

    const mag = intensity * 6; // max pixel shift at full intensity
    const freq = Math.max(80, 600 - intensity * 500); // faster at high intensity

    const glitchX = Animated.loop(
      Animated.sequence([
        Animated.timing(shiftX, { toValue: mag, duration: freq * 0.2, useNativeDriver: true }),
        Animated.timing(shiftX, { toValue: -mag, duration: freq * 0.2, useNativeDriver: true }),
        Animated.timing(shiftX, { toValue: 0, duration: freq * 0.6, useNativeDriver: true }),
      ]),
    );
    const glitchY = Animated.loop(
      Animated.sequence([
        Animated.timing(shiftY, {
          toValue: mag * 0.4,
          duration: freq * 0.3,
          useNativeDriver: true,
        }),
        Animated.timing(shiftY, {
          toValue: -mag * 0.4,
          duration: freq * 0.3,
          useNativeDriver: true,
        }),
        Animated.timing(shiftY, { toValue: 0, duration: freq * 0.4, useNativeDriver: true }),
      ]),
    );
    const flash = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 60, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 40, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: freq, useNativeDriver: true }),
      ]),
    );
    const chromatic = Animated.loop(
      Animated.sequence([
        Animated.timing(rLayer, { toValue: 1, duration: freq * 0.4, useNativeDriver: true }),
        Animated.timing(rLayer, { toValue: 0, duration: freq * 0.6, useNativeDriver: true }),
      ]),
    );

    glitchX.start();
    glitchY.start();
    flash.start();
    chromatic.start();

    return () => {
      glitchX.stop();
      glitchY.stop();
      flash.stop();
      chromatic.stop();
    };
  }, [intensity, shiftX, shiftY, opacity, rLayer]);

  const chromaOpacity = rLayer.interpolate({
    inputRange: [0, 1],
    outputRange: [0, intensity * 0.15],
  });
  const chromaShift = intensity * 4;

  return (
    <View style={styles.container}>
      <Animated.View
        style={{ opacity, transform: [{ translateX: shiftX }, { translateY: shiftY }] }}
      >
        {children}
      </Animated.View>

      {/* Chromatic aberration red channel ghost */}
      {intensity > 0.3 && (
        <Animated.View
          style={[
            styles.chromaLayer,
            {
              opacity: chromaOpacity,
              transform: [{ translateX: chromaShift }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.chromaTint, { backgroundColor: 'rgba(255,0,110,0.25)' }]} />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'relative' },
  chromaLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  chromaTint: {
    ...StyleSheet.absoluteFillObject,
  },
});
