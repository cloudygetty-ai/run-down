import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDetectorStore } from '../store/detector.store';
import { useMagnetometer } from '../hooks/useMagnetometer';
import { MagneticGraph } from '../components/MagneticGraph';
import type { MagneticReading } from '../types';

interface Threshold {
  label: string;
  max: number;
  color: string;
  desc: string;
}

const THRESHOLDS: Threshold[] = [
  { label: 'BASELINE', max: 8, color: '#22C55E', desc: 'Normal ambient field' },
  { label: 'SLIGHT ANOMALY', max: 20, color: '#84CC16', desc: 'Minor electronic interference' },
  { label: 'ELECTRONICS', max: 45, color: '#F59E0B', desc: 'Nearby electronic device' },
  { label: 'STRONG ANOMALY', max: 80, color: '#F97316', desc: 'Likely hidden hardware' },
  {
    label: 'DEVICE DETECTED',
    max: Infinity,
    color: '#EF4444',
    desc: 'Camera or surveillance device',
  },
];

function getThreshold(anomaly: number): Threshold {
  return THRESHOLDS.find((t) => anomaly <= t.max) ?? THRESHOLDS[THRESHOLDS.length - 1];
}

export function MagnetometerScreen() {
  const magneticReading = useDetectorStore((s) => s.magneticReading);
  const [readings, setReadings] = useState<MagneticReading[]>([]);
  const [peak, setPeak] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useMagnetometer(true);

  useEffect(() => {
    if (!magneticReading) {
      return;
    }
    setReadings((prev) => [...prev.slice(-120), magneticReading]);
    setPeak((prev) => Math.max(prev, magneticReading.anomaly));
  }, [magneticReading]);

  const anomaly = magneticReading?.anomaly ?? 0;
  const threshold = getThreshold(anomaly);
  const hot = anomaly > 20;

  // Pulse animation when anomaly is high
  useEffect(() => {
    if (!hot) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hot, pulseAnim]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>MAGNETIC DETECTOR</Text>
        <Text style={styles.subtitle}>MOVE PHONE SLOWLY — WATCH FOR SPIKES</Text>

        {/* Main anomaly display */}
        <Animated.View
          style={[
            styles.mainCard,
            { borderColor: threshold.color + '50', transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={[styles.anomalyNum, { color: threshold.color }]}>{anomaly.toFixed(1)}</Text>
          <Text style={styles.anomalyUnit}>µT ANOMALY</Text>
          <Text style={[styles.thresholdLabel, { color: threshold.color }]}>{threshold.label}</Text>
          <Text style={styles.thresholdDesc}>{threshold.desc}</Text>
        </Animated.View>

        {/* X / Y / Z breakdown */}
        <View style={styles.xyzRow}>
          {(['x', 'y', 'z'] as const).map((axis) => (
            <View key={axis} style={styles.xyzCard}>
              <Text style={styles.xyzAxis}>{axis.toUpperCase()}</Text>
              <Text style={styles.xyzVal}>{(magneticReading?.[axis] ?? 0).toFixed(1)}</Text>
              <Text style={styles.xyzUnit}>µT</Text>
            </View>
          ))}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            label="MAGNITUDE"
            value={`${(magneticReading?.magnitude ?? 0).toFixed(1)} µT`}
          />
          <StatCard label="BASELINE" value={`${(magneticReading?.baseline ?? 0).toFixed(1)} µT`} />
          <StatCard label="SESSION PEAK" value={`${peak.toFixed(1)} µT`} hot={peak > 20} />
        </View>

        {/* Graph */}
        {readings.length > 2 && <MagneticGraph readings={readings} />}

        {/* Threshold guide */}
        <View style={styles.guide}>
          <Text style={styles.guideTitle}>ANOMALY THRESHOLDS</Text>
          {THRESHOLDS.map((t) => (
            <View key={t.label} style={styles.guideRow}>
              <View style={[styles.guideDot, { backgroundColor: t.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.guideLabel, { color: t.color }]}>{t.label}</Text>
                <Text style={styles.guideDesc}>{t.desc}</Text>
              </View>
              <Text style={styles.guideRange}>
                {t.max === Infinity ? '> 80 µT' : `≤ ${t.max} µT`}
              </Text>
            </View>
          ))}
        </View>

        {/* Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>WHERE TO SCAN</Text>
          {[
            'Smoke detectors — common hiding spot',
            'Alarm clocks, USB chargers, picture frames',
            'Air vents, wall outlets, ceiling fixtures',
            'TV remotes, pens, books on shelves',
            'Move within 5 cm of suspicious objects',
          ].map((tip, i) => (
            <Text key={i} style={styles.tip}>{`›  ${tip}`}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <View style={sc.card}>
      <Text style={[sc.val, hot && { color: '#EF4444' }]}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#100D1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E1A2E',
    padding: 12,
    alignItems: 'center',
  },
  val: {
    color: '#C9A84C',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  label: {
    color: '#3D3650',
    fontSize: 8,
    letterSpacing: 2,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0A14' },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    color: '#C9A84C',
    fontSize: 11,
    letterSpacing: 6,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: '#2A2440',
    fontSize: 9,
    letterSpacing: 3,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 24,
  },
  mainCard: {
    backgroundColor: '#100D1A',
    borderRadius: 16,
    borderWidth: 2,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  anomalyNum: { fontSize: 68, fontWeight: '900', fontFamily: 'monospace', letterSpacing: -2 },
  anomalyUnit: {
    color: '#3D3650',
    fontSize: 10,
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  thresholdLabel: {
    fontSize: 12,
    letterSpacing: 4,
    fontFamily: 'monospace',
    fontWeight: '700',
    marginTop: 14,
  },
  thresholdDesc: { color: '#5C566E', fontSize: 11, marginTop: 4 },
  xyzRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  xyzCard: {
    flex: 1,
    backgroundColor: '#100D1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E1A2E',
    padding: 14,
    alignItems: 'center',
  },
  xyzAxis: {
    color: '#5C566E',
    fontSize: 9,
    letterSpacing: 3,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  xyzVal: { color: '#8B5CF6', fontSize: 16, fontFamily: 'monospace', fontWeight: '600' },
  xyzUnit: { color: '#3D3650', fontSize: 9, fontFamily: 'monospace', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  guide: {
    backgroundColor: '#0A0814',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  guideTitle: {
    color: '#3D3650',
    fontSize: 9,
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginBottom: 14,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1A1625',
  },
  guideDot: { width: 8, height: 8, borderRadius: 4 },
  guideLabel: { fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: '600' },
  guideDesc: { color: '#3D3650', fontSize: 9, marginTop: 1 },
  guideRange: { color: '#3D3650', fontSize: 9, fontFamily: 'monospace' },
  tips: { backgroundColor: '#0A0814', borderRadius: 12, padding: 16 },
  tipsTitle: {
    color: '#C9A84C',
    fontSize: 9,
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  tip: { color: '#5C566E', fontSize: 12, lineHeight: 22 },
});
