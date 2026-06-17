import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NetworkDevice, BleDevice } from '../types';
import { SignalBars } from './SignalBars';

type Device = NetworkDevice | BleDevice;

function isNet(d: Device): d is NetworkDevice {
  return 'ip' in d;
}

interface Props {
  device: Device;
}

export function DeviceCard({ device }: Props) {
  const isCamera = device.isCamera;
  const accent = isCamera ? '#EF4444' : '#C9A84C';

  const title = isNet(device)
    ? (device.hostname ?? device.ip)
    : (device.name ?? 'Unknown Device');

  const sub = isNet(device)
    ? `${device.ip}  ·  ports: ${device.openPorts.join(', ')}`
    : `RSSI ${device.rssi} dBm`;

  const typeTag = isNet(device)
    ? (device.cameraType?.replace('_', ' ').toUpperCase() ?? 'NETWORK DEVICE')
    : 'BLUETOOTH DEVICE';

  return (
    <View style={[styles.card, isCamera && styles.cardAlert]}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.tag, { color: accent }]}>{typeTag}</Text>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>

        {!isNet(device) && <SignalBars rssi={device.rssi} color={accent} />}

        <View style={[styles.badge, { backgroundColor: accent + '18' }]}>
          <Text style={[styles.confidence, { color: accent }]}>
            {device.confidence}%
          </Text>
        </View>
      </View>

      {isCamera && (
        <View style={styles.alertRow}>
          <View style={styles.alertDot} />
          <Text style={styles.alertText}>
            {isNet(device) ? 'IP CAMERA DETECTED' : 'BLE CAMERA DETECTED'}
          </Text>
        </View>
      )}

      {!isNet(device) && device.cameraIndicators.length > 0 && (
        <View style={styles.indicators}>
          {device.cameraIndicators.map((ind, i) => (
            <Text key={i} style={styles.indicator}>{ind}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#100D1A',
    borderWidth: 1,
    borderColor: '#1E1A2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  cardAlert: { borderColor: '#EF444440', backgroundColor: '#150A0A' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  tag: { fontSize: 9, letterSpacing: 3, fontFamily: 'monospace', marginBottom: 4 },
  title: { color: '#E8E4F0', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  sub: { color: '#4B4560', fontSize: 11, fontFamily: 'monospace' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  confidence: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EF444425',
  },
  alertDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  alertText: { color: '#EF4444', fontSize: 10, letterSpacing: 3, fontFamily: 'monospace', fontWeight: '700' },
  indicators: { marginTop: 8 },
  indicator: { color: '#5C566E', fontSize: 10, fontFamily: 'monospace', marginBottom: 2 },
});
