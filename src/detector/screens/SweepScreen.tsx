import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { useDetectorStore } from '../store/detector.store';
import { useMagnetometer } from '../hooks/useMagnetometer';
import { useNetworkScan } from '../hooks/useNetworkScan';
import { useBluetooth } from '../hooks/useBluetooth';
import { ThreatMeter } from '../components/ThreatMeter';
import { RadarPulse } from '../components/RadarPulse';
import { DeviceCard } from '../components/DeviceCard';
import { MagneticGraph } from '../components/MagneticGraph';
import { THREAT_COLORS } from '../services/threat.service';
import type { MagneticReading } from '../types';

const MAX_GRAPH = 60;

export function SweepScreen() {
  const {
    scanPhase,
    threatScore,
    magneticReading,
    networkDevices,
    bleDevices,
    networkScanProgress,
    startScan,
    stopScan,
    saveScan,
    resetScan,
  } = useDetectorStore();

  const [graphReadings, setGraphReadings] = useState<MagneticReading[]>([]);
  const isScanning = scanPhase === 'scanning';

  const netScan = useNetworkScan();
  const btScan = useBluetooth();
  useMagnetometer(isScanning || scanPhase === 'complete');

  useEffect(() => {
    if (magneticReading) {
      setGraphReadings((prev) => [...prev.slice(-MAX_GRAPH + 1), magneticReading]);
    }
  }, [magneticReading]);

  // Haptic alert on high/critical threat
  useEffect(() => {
    if (threatScore.level === 'critical') {
      Vibration.vibrate([0, 300, 150, 300, 150, 300]);
    } else if (threatScore.level === 'high') {
      Vibration.vibrate([0, 200, 100, 200]);
    }
  }, [threatScore.level]);

  const handleStart = useCallback(() => {
    setGraphReadings([]);
    startScan();
    netScan.start();
    btScan.start();
  }, [startScan, netScan, btScan]);

  const handleStop = useCallback(() => {
    netScan.stop();
    btScan.stop();
    stopScan();
    saveScan();
  }, [netScan, btScan, stopScan, saveScan]);

  const handleReset = useCallback(() => {
    resetScan();
    setGraphReadings([]);
  }, [resetScan]);

  const threatColor = THREAT_COLORS[threatScore.level];
  const cameraDevices = [
    ...networkDevices.filter((d) => d.isCamera),
    ...bleDevices.filter((d) => d.isCamera),
  ];
  const allDevices = [...networkDevices, ...bleDevices];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>ALL-SENSOR SWEEP</Text>
        <Text style={styles.pageSubtitle}>MAGNETIC · NETWORK · BLUETOOTH</Text>

        {/* Primary displays */}
        <View style={styles.primaryRow}>
          <RadarPulse active={isScanning} color={threatColor} size={150} />
          <ThreatMeter score={threatScore} />
        </View>

        {/* Stat grid */}
        <View style={styles.grid}>
          <GridStat label="NET" value={networkDevices.length} sub={`${networkScanProgress}%`} />
          <GridStat label="BLE" value={bleDevices.length} />
          <GridStat label="CAMS" value={cameraDevices.length} alert={cameraDevices.length > 0} />
          <GridStat
            label="µT"
            value={magneticReading ? magneticReading.anomaly.toFixed(0) : '—'}
            alert={(magneticReading?.anomaly ?? 0) > 20}
          />
        </View>

        {/* Network progress */}
        {isScanning && networkScanProgress < 100 && (
          <View style={styles.progressWrap}>
            <Text style={styles.progressLabel}>NETWORK SCAN {networkScanProgress}%</Text>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${networkScanProgress}%` as `${number}%` }]}
              />
            </View>
          </View>
        )}

        {/* Magnetic graph */}
        {graphReadings.length > 2 && <MagneticGraph readings={graphReadings} />}

        {/* Camera alert banner */}
        {cameraDevices.length > 0 && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertBannerText}>
              {cameraDevices.length} CAMERA{cameraDevices.length > 1 ? 'S' : ''} DETECTED
            </Text>
            <Text style={styles.alertBannerSub}>Verify each device below immediately</Text>
          </View>
        )}

        {/* Device list */}
        {allDevices.length > 0 && (
          <View style={styles.deviceSection}>
            <Text style={styles.sectionLabel}>DETECTED DEVICES ({allDevices.length})</Text>
            {/* Show camera devices first */}
            {cameraDevices.map((d) => (
              <DeviceCard key={d.id} device={d} />
            ))}
            {allDevices
              .filter((d) => !d.isCamera)
              .map((d) => (
                <DeviceCard key={d.id} device={d} />
              ))}
          </View>
        )}

        {scanPhase === 'idle' && (
          <View style={styles.idleHint}>
            <Text style={styles.idleHintText}>
              Tap SCAN to launch all detectors simultaneously.{'\n'}
              Sweep your phone slowly around the room — aim for corners, vents, clocks, and smoke
              detectors.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.controls}>
        {scanPhase === 'idle' && (
          <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={handleStart}>
            <Text style={styles.btnText}>START SCAN</Text>
          </TouchableOpacity>
        )}
        {isScanning && (
          <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={handleStop}>
            <Text style={styles.btnText}>STOP &amp; SAVE</Text>
          </TouchableOpacity>
        )}
        {scanPhase === 'complete' && (
          <View style={styles.completeRow}>
            <View style={[styles.completeBadge, { backgroundColor: threatColor + '18' }]}>
              <Text style={[styles.completeLabel, { color: threatColor }]}>
                SCAN COMPLETE — {threatScore.total}/100
              </Text>
            </View>
            <TouchableOpacity style={[styles.btn, styles.btnNew]} onPress={handleReset}>
              <Text style={styles.btnText}>NEW SCAN</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function GridStat({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <View style={[gs.cell, alert && gs.cellAlert]}>
      <Text style={[gs.val, alert && { color: '#EF4444' }]}>{value}</Text>
      <Text style={gs.label}>{label}</Text>
      {sub !== undefined && <Text style={gs.sub}>{sub}</Text>}
    </View>
  );
}

const gs = StyleSheet.create({
  cell: {
    flex: 1,
    backgroundColor: '#100D1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E1A2E',
    padding: 12,
    alignItems: 'center',
  },
  cellAlert: { borderColor: '#EF444440', backgroundColor: '#150A0A' },
  val: { color: '#C9A84C', fontSize: 22, fontWeight: '700', fontFamily: 'monospace' },
  label: { color: '#3D3650', fontSize: 9, letterSpacing: 2, fontFamily: 'monospace', marginTop: 2 },
  sub: { color: '#2A2440', fontSize: 9, fontFamily: 'monospace', marginTop: 1 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0A14' },
  content: { padding: 20, paddingBottom: 110 },

  pageTitle: {
    color: '#C9A84C',
    fontSize: 11,
    letterSpacing: 6,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 4,
  },
  pageSubtitle: {
    color: '#2A2440',
    fontSize: 9,
    letterSpacing: 3,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 28,
  },

  primaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
  },

  grid: { flexDirection: 'row', gap: 8, marginBottom: 16 },

  progressWrap: { marginBottom: 14 },
  progressLabel: {
    color: '#5C566E',
    fontSize: 9,
    letterSpacing: 3,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  progressTrack: { height: 4, backgroundColor: '#1A1625', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#8B5CF6', borderRadius: 2 },

  alertBanner: {
    backgroundColor: '#EF444412',
    borderWidth: 1,
    borderColor: '#EF444450',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  alertBannerText: {
    color: '#EF4444',
    fontSize: 14,
    letterSpacing: 4,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  alertBannerSub: { color: '#EF444480', fontSize: 10, marginTop: 4 },

  deviceSection: { marginTop: 8 },
  sectionLabel: {
    color: '#3D3650',
    fontSize: 9,
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginBottom: 10,
  },

  idleHint: {
    marginTop: 40,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1A2E',
    borderStyle: 'dashed',
  },
  idleHintText: {
    color: '#3D3650',
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },

  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#0D0A14',
    borderTopWidth: 1,
    borderTopColor: '#1A1625',
  },
  btn: { borderRadius: 14, padding: 18, alignItems: 'center' },
  btnStart: { backgroundColor: '#C9A84C' },
  btnStop: { backgroundColor: '#EF4444' },
  btnNew: { backgroundColor: '#8B5CF6' },
  btnText: {
    color: '#0D0A14',
    fontSize: 12,
    letterSpacing: 4,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  completeRow: { gap: 10 },
  completeBadge: { borderRadius: 10, padding: 12, alignItems: 'center' },
  completeLabel: { fontSize: 11, letterSpacing: 3, fontFamily: 'monospace', fontWeight: '600' },
});
