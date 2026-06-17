import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDetectorStore } from '../store/detector.store';
import { THREAT_COLORS, THREAT_LABELS } from '../services/threat.service';
import type { ScanResult } from '../types';

export function HistoryScreen() {
  const history = useDetectorStore(s => s.history);

  const totalScans = history.length;
  const camerasFound = history.filter(s => s.cameraDetected).length;
  const avgScore = totalScans
    ? Math.round(history.reduce((a, s) => a + s.threatScore, 0) / totalScans)
    : 0;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>SCAN HISTORY</Text>
        <Text style={styles.subtitle}>{totalScans} SCAN{totalScans !== 1 ? 'S' : ''} RECORDED</Text>

        {/* Summary stats */}
        {totalScans > 0 && (
          <View style={styles.summaryRow}>
            <SumCard label="SCANS" value={totalScans.toString()} />
            <SumCard label="CAMERAS" value={camerasFound.toString()} alert={camerasFound > 0} />
            <SumCard label="AVG THREAT" value={avgScore.toString()} />
          </View>
        )}

        {history.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyPrimary}>NO HISTORY YET</Text>
            <Text style={styles.emptySecondary}>
              Complete a sweep to build your scan history.{'\n'}
              History stores up to 100 scans.
            </Text>
          </View>
        ) : (
          history.map(scan => <ScanCard key={scan.id} scan={scan} />)
        )}
      </ScrollView>
    </View>
  );
}

function ScanCard({ scan }: { scan: ScanResult }) {
  const color = THREAT_COLORS[scan.threatLevel];
  const label = THREAT_LABELS[scan.threatLevel];
  const date = new Date(scan.timestamp);
  const durationSec = Math.round(scan.duration / 1000);
  const cameras = [...scan.networkDevices, ...scan.bleDevices].filter(d => d.isCamera);

  return (
    <View style={[styles.card, scan.cameraDetected && styles.cardAlert]}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.cardDate}>
            {date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            {'  '}
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={[styles.cardLevel, { color }]}>{label}</Text>
        </View>
        <View style={[styles.scoreBubble, { backgroundColor: color + '18' }]}>
          <Text style={[styles.scoreNum, { color }]}>{scan.threatScore}</Text>
          <Text style={styles.scoreUnit}>/100</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric label="DURATION"   value={`${durationSec}s`} />
        <Metric label="NETWORK"    value={scan.networkDevices.length.toString()} />
        <Metric label="BLUETOOTH"  value={scan.bleDevices.length.toString()} />
        <Metric label="MAG PEAK"   value={`${Math.round(scan.magneticAnomalyPeak)}µT`} />
      </View>

      {scan.cameraDetected && cameras.length > 0 && (
        <View style={styles.cameraList}>
          <Text style={styles.cameraListTitle}>CAMERAS DETECTED</Text>
          {cameras.map((c, i) => (
            <Text key={i} style={styles.cameraItem}>
              {'› '}{('ip' in c) ? c.ip : (c.name ?? 'Unknown BLE device')}
              {'  '}({c.confidence}% confidence)
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function SumCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <View style={[sum.card, alert && sum.alert]}>
      <Text style={[sum.val, alert && { color: '#EF4444' }]}>{value}</Text>
      <Text style={sum.label}>{label}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={met.cell}>
      <Text style={met.val}>{value}</Text>
      <Text style={met.label}>{label}</Text>
    </View>
  );
}

const sum = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#100D1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E1A2E',
    padding: 12,
    alignItems: 'center',
  },
  alert: { borderColor: '#EF444440', backgroundColor: '#150A0A' },
  val: { color: '#C9A84C', fontSize: 24, fontWeight: '700', fontFamily: 'monospace' },
  label: { color: '#3D3650', fontSize: 8, letterSpacing: 2, fontFamily: 'monospace', marginTop: 2 },
});

const met = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center' },
  val: { color: '#C9A84C', fontSize: 14, fontFamily: 'monospace', fontWeight: '600', marginBottom: 2 },
  label: { color: '#3D3650', fontSize: 8, letterSpacing: 1, fontFamily: 'monospace' },
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
    marginBottom: 20,
  },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyPrimary: { color: '#3D3650', fontSize: 12, letterSpacing: 4, fontFamily: 'monospace' },
  emptySecondary: { color: '#2A2440', fontSize: 11, textAlign: 'center', lineHeight: 18 },
  card: {
    backgroundColor: '#100D1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1A2E',
    padding: 16,
    marginBottom: 12,
  },
  cardAlert: { borderColor: '#EF444440', backgroundColor: '#150A0A' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardDate: { color: '#4B4560', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 },
  cardLevel: { fontSize: 13, letterSpacing: 3, fontFamily: 'monospace', fontWeight: '700' },
  scoreBubble: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  scoreNum: { fontSize: 26, fontWeight: '900', fontFamily: 'monospace' },
  scoreUnit: { color: '#3D3650', fontSize: 9, fontFamily: 'monospace' },
  metrics: { flexDirection: 'row' },
  cameraList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EF444430',
  },
  cameraListTitle: {
    color: '#EF4444',
    fontSize: 9,
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  cameraItem: { color: '#EF444490', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 },
});
