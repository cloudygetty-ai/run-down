import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MagneticReading } from '../types';

interface Props {
  readings: MagneticReading[];
}

const GRAPH_H = 72;
const BAR_W = 3;
const BAR_GAP = 1;
const ANOMALY_THRESHOLD = 15; // µT — above this = suspicious

export function MagneticGraph({ readings }: Props) {
  const maxAnomaly = Math.max(ANOMALY_THRESHOLD * 2, ...readings.map(r => r.anomaly));
  const latest = readings[readings.length - 1];
  const peak = readings.length ? Math.max(...readings.map(r => r.anomaly)) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>MAGNETIC ANOMALY</Text>
        <Text style={styles.unit}>µT above baseline</Text>
      </View>

      <View style={styles.graphArea}>
        {/* Threshold line */}
        <View
          style={[
            styles.thresholdLine,
            { bottom: (ANOMALY_THRESHOLD / maxAnomaly) * GRAPH_H },
          ]}
        />

        {/* Bars */}
        {readings.map((r, i) => {
          const barH = Math.max(2, (r.anomaly / maxAnomaly) * GRAPH_H);
          const hot = r.anomaly > ANOMALY_THRESHOLD;
          return (
            <View
              key={i}
              style={{
                width: BAR_W,
                height: barH,
                marginRight: BAR_GAP,
                borderRadius: 1,
                backgroundColor: hot ? '#EF4444' : '#8B5CF6',
                alignSelf: 'flex-end',
                opacity: 0.85,
              }}
            />
          );
        })}
      </View>

      <View style={styles.footer}>
        <Stat label="NOW" value={`${(latest?.anomaly ?? 0).toFixed(1)} µT`} hot={(latest?.anomaly ?? 0) > ANOMALY_THRESHOLD} />
        <Stat label="BASE" value={`${(latest?.baseline ?? 0).toFixed(1)} µT`} />
        <Stat label="PEAK" value={`${peak.toFixed(1)} µT`} hot={peak > ANOMALY_THRESHOLD} />
        <Stat label="MAG" value={`${(latest?.magnitude ?? 0).toFixed(0)} µT`} />
      </View>
    </View>
  );
}

function Stat({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statVal, hot && { color: '#EF4444' }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0A0814', borderRadius: 12, padding: 14, marginVertical: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: '#5C566E', fontSize: 10, letterSpacing: 3, fontFamily: 'monospace' },
  unit: { color: '#3D3650', fontSize: 9, fontFamily: 'monospace' },
  graphArea: {
    height: GRAPH_H,
    flexDirection: 'row',
    alignItems: 'flex-end',
    overflow: 'hidden',
    position: 'relative',
  },
  thresholdLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F59E0B50',
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  stat: { alignItems: 'center' },
  statVal: { color: '#C9A84C', fontSize: 12, fontFamily: 'monospace', fontWeight: '600' },
  statLabel: { color: '#3D3650', fontSize: 8, letterSpacing: 2, fontFamily: 'monospace', marginTop: 2 },
});
