import React, { useCallback, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useDetectorStore } from '../store/detector.store';
import { useBluetooth } from '../hooks/useBluetooth';
import { DeviceCard } from '../components/DeviceCard';
import { SignalBars } from '../components/SignalBars';

export function BluetoothScreen() {
  const bleDevices = useDetectorStore(s => s.bleDevices);
  const resetScan = useDetectorStore(s => s.resetScan);
  const btScan = useBluetooth();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const handleStart = useCallback(async () => {
    resetScan();
    setDone(false);
    setRunning(true);
    await btScan.start();
    setRunning(false);
    setDone(true);
  }, [btScan, resetScan]);

  const handleStop = useCallback(() => {
    btScan.stop();
    setRunning(false);
    setDone(true);
  }, [btScan]);

  const cameras = bleDevices.filter(d => d.isCamera);
  const others = bleDevices.filter(d => !d.isCamera);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>BLUETOOTH SCANNER</Text>
        <Text style={styles.subtitle}>DETECTING HIDDEN BLE CAMERAS</Text>

        {/* Info */}
        <View style={styles.infoCard}>
          <InfoRow label="RANGE" value="~10 m (BLE class 2)" />
          <InfoRow label="DETECTS" value="BLE cameras · Smart locks · IoT devices" />
          <InfoRow label="SIGNALS" value="Device name · RSSI · Manufacturer ID" />
          <InfoRow label="DURATION" value="12 second active scan" />
        </View>

        {/* Status */}
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: running ? '#22C55E' : done ? '#C9A84C' : '#3D3650' },
            ]}
          />
          <Text style={styles.statusText}>
            {running ? 'SCANNING FOR BLE DEVICES...'
              : done ? `SCAN COMPLETE  ·  ${bleDevices.length} devices`
              : 'READY'}
          </Text>
        </View>

        {/* Camera devices */}
        {cameras.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: '#EF4444' }]}>
              BLE CAMERAS  ({cameras.length})
            </Text>
            {cameras.map(d => <DeviceCard key={d.id} device={d} />)}
          </>
        )}

        {/* Anonymous / suspicious */}
        {others.filter(d => !d.name).length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: '#F59E0B' }]}>
              ANONYMOUS DEVICES  ({others.filter(d => !d.name).length})
            </Text>
            {others.filter(d => !d.name).map(d => <DeviceCard key={d.id} device={d} />)}
          </>
        )}

        {/* Named non-camera devices */}
        {others.filter(d => d.name).length > 0 && (
          <>
            <Text style={styles.sectionLabel}>KNOWN DEVICES</Text>
            {others.filter(d => d.name).map(d => (
              <View key={d.id} style={styles.knownRow}>
                <SignalBars rssi={d.rssi} color="#5C566E" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.knownName}>{d.name}</Text>
                  <Text style={styles.knownRssi}>{d.rssi} dBm</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {!running && !done && (
          <View style={styles.empty}>
            <Text style={styles.emptyPrimary}>BLE SCAN</Text>
            <Text style={styles.emptySecondary}>
              Detects Bluetooth Low Energy devices within range.{'\n'}
              Anonymous or suspiciously named devices are flagged.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.controls}>
        {!running ? (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleStart}>
            <Text style={styles.btnText}>SCAN BLUETOOTH</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={handleStop}>
            <Text style={styles.btnText}>STOP</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={ir.row}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{value}</Text>
    </View>
  );
}

const ir = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#1A1625' },
  label: { width: 80, color: '#3D3650', fontSize: 9, letterSpacing: 2, fontFamily: 'monospace' },
  value: { flex: 1, color: '#7B748C', fontSize: 10, fontFamily: 'monospace' },
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
  infoCard: { backgroundColor: '#0A0814', borderRadius: 12, padding: 14, marginBottom: 16 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#100D1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1A2E',
    padding: 16,
    marginBottom: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#7B748C', fontSize: 10, letterSpacing: 3, fontFamily: 'monospace' },
  sectionLabel: {
    color: '#3D3650',
    fontSize: 9,
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginTop: 20,
    marginBottom: 10,
  },
  knownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1A1625',
  },
  knownName: { color: '#7B748C', fontSize: 13 },
  knownRssi: { color: '#3D3650', fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
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
  btnText: { color: '#0D0A14', fontSize: 12, letterSpacing: 4, fontFamily: 'monospace', fontWeight: '700' },
});
