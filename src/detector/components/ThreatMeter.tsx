import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { THREAT_COLORS, THREAT_LABELS } from '../services/threat.service';
import type { ThreatScore } from '../types';

const SEGMENT_COLORS = [
  '#22C55E', '#22C55E', '#22C55E',   // 0-29 safe
  '#84CC16', '#F59E0B',               // 30-49
  '#F97316', '#F97316',               // 50-69
  '#EF4444', '#EF4444', '#EF4444',   // 70-100
];

interface Props {
  score: ThreatScore;
  compact?: boolean;
}

export function ThreatMeter({ score, compact = false }: Props) {
  const ring = useRef(new Animated.Value(0)).current;
  const size = compact ? 120 : 170;

  useEffect(() => {
    Animated.spring(ring, {
      toValue: score.total / 100,
      useNativeDriver: false,
      tension: 60,
      friction: 12,
    }).start();
  }, [score.total, ring]);

  const borderColor = ring.interpolate({
    inputRange: [0, 0.14, 0.34, 0.54, 0.74, 1],
    outputRange: [
      THREAT_COLORS.safe,
      THREAT_COLORS.low,
      THREAT_COLORS.medium,
      THREAT_COLORS.high,
      THREAT_COLORS.critical,
      '#FF1111',
    ],
  });

  const color = THREAT_COLORS[score.level];
  const filled = Math.round(score.total / 10);

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2, borderColor },
        ]}
      >
        <View style={styles.inner}>
          <Text style={[styles.score, { color, fontSize: compact ? 36 : 52 }]}>
            {score.total}
          </Text>
          <Text style={styles.scoreUnit}>THREAT</Text>
        </View>
      </Animated.View>

      <Text style={[styles.level, { color }]}>{THREAT_LABELS[score.level]}</Text>

      <View style={styles.segmentRow}>
        {SEGMENT_COLORS.map((c, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: i < filled ? c : '#1E1A2E' }]}
          />
        ))}
      </View>

      {!compact && (
        <View style={styles.contributors}>
          <ContribBar label="MAG" value={score.contributors.magnetic} />
          <ContribBar label="NET" value={score.contributors.network} />
          <ContribBar label="BLE" value={score.contributors.bluetooth} />
        </View>
      )}
    </View>
  );
}

function ContribBar({ label, value }: { label: string; value: number }) {
  const w = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(w, { toValue: value / 100, duration: 500, useNativeDriver: false }).start();
  }, [value, w]);

  return (
    <View style={cStyles.row}>
      <Text style={cStyles.label}>{label}</Text>
      <View style={cStyles.track}>
        <Animated.View
          style={[cStyles.fill, { flex: w, backgroundColor: value > 60 ? '#EF4444' : '#8B5CF6' }]}
        />
        <Animated.View style={[cStyles.empty, { flex: Animated.subtract(1, w) }]} />
      </View>
      <Text style={cStyles.val}>{Math.round(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 12 },
  ring: {
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0A14',
  },
  inner: { alignItems: 'center' },
  score: { fontWeight: '900', letterSpacing: -2 },
  scoreUnit: { color: '#3D3650', fontSize: 9, letterSpacing: 4, fontFamily: 'monospace', marginTop: 2 },
  level: { fontSize: 11, letterSpacing: 4, fontFamily: 'monospace', fontWeight: '700' },
  segmentRow: { flexDirection: 'row', gap: 3 },
  segment: { width: 20, height: 6, borderRadius: 2 },
  contributors: { width: '100%', gap: 6 },
});

const cStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: '#3D3650', fontSize: 9, letterSpacing: 2, fontFamily: 'monospace', width: 28 },
  track: { flex: 1, flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  empty: { height: 4, backgroundColor: '#1A1625' },
  val: { color: '#5C566E', fontSize: 10, fontFamily: 'monospace', width: 24, textAlign: 'right' },
});
