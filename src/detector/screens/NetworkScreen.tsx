import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDetectorStore } from '../store/detector.store';
import { useNetworkScan } from '../hooks/useNetworkScan';
import { DeviceCard } from '../components/DeviceCard';

export function NetworkScreen() {
  const { networkDevices, networkScanProgress, resetScan } = useDetectorStore();

  const netScan = useNetworkScan();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const handleStart = useCallback(async () => {
    resetScan();
    setDone(false);
    setRunning(true);
    await netScan.start();
    setRunning(false);
    setDone(true);
  }, [netScan, resetScan]);

  const handleStop = useCallback(() => {
    netScan.stop();
    setRunning(false);
    setDone(true);
  }, [netScan]);

  const cameras = networkDevices.filter((d) => d.isCamera);
  const others = networkDevices.filter((d) => !d.isCamera);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>NETWORK SCANNER</Text>
        <Text style={styles.subtitle}>PROBING LOCAL SUBNET · COMMON CAMERA PORTS</Text>

        {/* How it works */}
        <View style={styles.infoCard}>
          <Row label="METHOD" value="HTTP probe  ·  port fingerprint" />
          <Row label="PORTS" value="80 · 554 · 8080 · 8554 · 8888 · 443" />
          <Row label="SIGNATURES" value="Hikvision · Dahua · Axis · ONVIF · RTSP" />
          <Row label="SUBNET" value="192.168.1.0/24  (254 hosts)" />
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressStatus}>
              {running
                ? `SCANNING  ${networkScanProgress}%`
                : done
                ? 'SCAN COMPLETE'
                : 'READY TO SCAN'}
            </Text>
            <Text style={styles.progressCount}>
              {networkDevices.length} device{networkDevices.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${running ? networkScanProgress : done ? 100 : 0}%` as `${number}%` },
              ]}
            />
          </View>
        </View>

        {/* Cameras */}
        {cameras.length > 0 && (
          <>
            <SectionLabel label={`CAMERAS DETECTED  (${cameras.length})`} alert />
            {cameras.map((d) => (
              <DeviceCard key={d.id} device={d} />
            ))}
          </>
        )}

        {/* Other devices */}
        {others.length > 0 && (
          <>
            <SectionLabel label={`OTHER DEVICES  (${others.length})`} />
            {others.map((d) => (
              <DeviceCard key={d.id} device={d} />
            ))}
          </>
        )}

        {!running && !done && (
          <View style={styles.empty}>
            <Text style={styles.emptyPrimary}>NETWORK SCAN</Text>
            <Text style={styles.emptySecondary}>
              Scans your local WiFi subnet for IP cameras,{'\n'}
              DVRs, NVRs, and other video devices.
            </Text>
          </View>
        )}

        {done && cameras.length === 0 && networkDevices.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyPrimary}>NO CAMERAS FOUND</Text>
            <Text style={styles.emptySecondary}>
              No IP cameras detected on the network.{'\n'}
              Wireless cameras may use cellular or local recording.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.controls}>
        {!running ? (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleStart}>
            <Text style={styles.btnText}>SCAN NETWORK</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={handleStop}>
            <Text style={styles.btnText}>STOP SCAN</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

function SectionLabel({ label, alert }: { label: string; alert?: boolean }) {
  return <Text style={[sectionStyles.label, alert && { color: '#EF4444' }]}>{label}</Text>;
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1625',
  },
  label: { width: 90, color: '#3D3650', fontSize: 9, letterSpacing: 2, fontFamily: 'monospace' },
  value: { flex: 1, color: '#7B748C', fontSize: 10, fontFamily: 'monospace' },
});

const sectionStyles = StyleSheet.create({
  label: {
    color: '#3D3650',
    fontSize: 9,
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginTop: 20,
    marginBottom: 10,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0A14' },
  content: { padding: 20, paddingBottom: 100 },
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
    letterSpacing: 2,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#0A0814',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  progressCard: {
    backgroundColor: '#100D1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1A2E',
    padding: 16,
    marginBottom: 4,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressStatus: { color: '#C9A84C', fontSize: 10, letterSpacing: 3, fontFamily: 'monospace' },
  progressCount: { color: '#8B5CF6', fontSize: 10, letterSpacing: 2, fontFamily: 'monospace' },
  progressTrack: { height: 4, backgroundColor: '#1A1625', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#8B5CF6', borderRadius: 2 },
  empty: { alignItems: 'center', marginTop: 48, gap: 12 },
  emptyPrimary: { color: '#3D3650', fontSize: 12, letterSpacing: 4, fontFamily: 'monospace' },
  emptySecondary: { color: '#2A2440', fontSize: 11, textAlign: 'center', lineHeight: 18 },
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
  btnPrimary: { backgroundColor: '#C9A84C' },
  btnStop: { backgroundColor: '#EF4444' },
  btnText: {
    color: '#0D0A14',
    fontSize: 12,
    letterSpacing: 4,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
});
