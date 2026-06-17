import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SweepScreen } from './screens/SweepScreen';
import { NetworkScreen } from './screens/NetworkScreen';
import { MagnetometerScreen } from './screens/MagnetometerScreen';
import { BluetoothScreen } from './screens/BluetoothScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { useDetectorStore } from './store/detector.store';
import { THREAT_COLORS } from './services/threat.service';

type Tab = 'sweep' | 'network' | 'magnetic' | 'bluetooth' | 'history';

interface TabDef {
  id: Tab;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: 'sweep',      label: 'SWEEP',   icon: '◎' },
  { id: 'network',    label: 'NET',     icon: '⊞' },
  { id: 'magnetic',   label: 'MAG',     icon: '⊕' },
  { id: 'bluetooth',  label: 'BLE',     icon: '◈' },
  { id: 'history',    label: 'LOG',     icon: '≡' },
];

export function DetectorApp() {
  const [activeTab, setActiveTab] = useState<Tab>('sweep');
  const threatScore = useDetectorStore(s => s.threatScore);
  const scanPhase = useDetectorStore(s => s.scanPhase);
  const cameraCount = useDetectorStore(s =>
    [...s.networkDevices, ...s.bleDevices].filter(d => d.isCamera).length,
  );

  const threatColor = THREAT_COLORS[threatScore.level];
  const isActive = scanPhase === 'scanning';

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.liveIndicator, { backgroundColor: isActive ? '#22C55E' : '#3D3650' }]} />
          <Text style={styles.appName}>HIDDEN CAM DETECTOR</Text>
        </View>
        {isActive && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>SCANNING</Text>
          </View>
        )}
        {cameraCount > 0 && !isActive && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>{cameraCount} CAM</Text>
          </View>
        )}
        {threatScore.total > 0 && (
          <Text style={[styles.headerScore, { color: threatColor }]}>
            {threatScore.total}
          </Text>
        )}
      </View>

      {/* Screen */}
      <View style={styles.screen}>
        {activeTab === 'sweep'     && <SweepScreen />}
        {activeTab === 'network'   && <NetworkScreen />}
        {activeTab === 'magnetic'  && <MagnetometerScreen />}
        {activeTab === 'bluetooth' && <BluetoothScreen />}
        {activeTab === 'history'   && <HistoryScreen />}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const active = tab.id === activeTab;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>
                {tab.icon}
              </Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {active && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0A14' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1625',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveIndicator: { width: 7, height: 7, borderRadius: 3.5 },
  appName: {
    color: '#C9A84C',
    fontSize: 11,
    letterSpacing: 4,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  liveBadge: {
    backgroundColor: '#22C55E18',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveBadgeText: { color: '#22C55E', fontSize: 9, letterSpacing: 3, fontFamily: 'monospace' },
  alertBadge: {
    backgroundColor: '#EF444418',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  alertBadgeText: { color: '#EF4444', fontSize: 9, letterSpacing: 2, fontFamily: 'monospace', fontWeight: '700' },
  headerScore: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },

  screen: { flex: 1 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#08060F',
    borderTopWidth: 1,
    borderTopColor: '#1A1625',
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    position: 'relative',
  },
  tabIcon: { fontSize: 16, color: '#2A2440', marginBottom: 3 },
  tabIconActive: { color: '#C9A84C' },
  tabLabel: { fontSize: 7, letterSpacing: 1, fontFamily: 'monospace', color: '#2A2440' },
  tabLabelActive: { color: '#C9A84C' },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: '#C9A84C',
    borderRadius: 1,
  },
});
