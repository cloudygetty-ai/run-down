import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  /** RSSI value (negative dBm, e.g. -55). Pass 0 for no signal. */
  rssi: number;
  color?: string;
}

function rssiBars(rssi: number): number {
  if (rssi === 0) return 0;
  if (rssi >= -50) return 5;
  if (rssi >= -60) return 4;
  if (rssi >= -70) return 3;
  if (rssi >= -80) return 2;
  return 1;
}

export function SignalBars({ rssi, color = '#C9A84C' }: Props) {
  const filled = rssiBars(rssi);

  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: 4 + i * 4,
              backgroundColor: i < filled ? color : '#2A2440',
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 6, borderRadius: 2 },
});
