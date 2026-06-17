import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface Props {
  active: boolean;
  color?: string;
  size?: number;
}

const PULSE_COUNT = 3;
const PULSE_DURATION = 2200;

export function RadarPulse({ active, color = '#C9A84C', size = 160 }: Props) {
  const anims = useRef(
    Array.from({ length: PULSE_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (!active) {
      anims.forEach(a => a.setValue(0));
      return;
    }

    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((PULSE_DURATION / PULSE_COUNT) * i),
          Animated.timing(anim, {
            toValue: 1,
            duration: PULSE_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );

    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [active, anims]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size / 2,
              borderWidth: 1.5,
              borderColor: color,
              opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.7, 0] }),
              transform: [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
              ],
            },
          ]}
        />
      ))}
      {/* Center dot */}
      <View
        style={{
          width: size * 0.12,
          height: size * 0.12,
          borderRadius: size * 0.06,
          backgroundColor: active ? color : '#2A2440',
        }}
      />
      {/* Cross-hair lines */}
      {active && (
        <>
          <View style={[styles.line, styles.lineH, { borderColor: color + '30', width: size * 0.6 }]} />
          <View style={[styles.line, styles.lineV, { borderColor: color + '30', height: size * 0.6 }]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth },
  lineH: { left: '20%', right: '20%' },
  lineV: { top: '20%', bottom: '20%' },
});
