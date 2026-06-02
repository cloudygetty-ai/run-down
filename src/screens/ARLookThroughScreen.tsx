import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { useSocialStore } from '../services/state/socialStore';
import { ARCameraOverlay } from '../components/ARCameraOverlay';
import { VibeTicker } from '../components/VibeTicker';
import { heatLevelColor } from '../core/velocity/VelocityEngine';
import { NearbyUser } from '../types/social';

const { width: W } = Dimensions.get('window');
const TICK_MS = 50;

type SignalPanelProps = {
  user: NearbyUser;
  onReveal: () => void;
  onLockOn: () => void;
};

const SignalPanel: React.FC<SignalPanelProps> = ({ user, onReveal, onLockOn }) => {
  const slideAnim = useRef(new Animated.Value(W)).current;
  const color = heatLevelColor(user.heatLevel);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 70,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  return (
    <Animated.View
      style={[
        styles.signalPanel,
        { borderColor: color + '55', transform: [{ translateX: slideAnim }] },
      ]}
    >
      <View style={[styles.signalAvatar, { borderColor: color, backgroundColor: color + '18' }]}>
        {user.isIdentityRevealed ? (
          <Text style={[styles.signalAvatarText, { color }]}>
            {user.displayName?.charAt(0) ?? '?'}
          </Text>
        ) : (
          <Text style={styles.signalAvatarAnon}>◈</Text>
        )}
      </View>
      <View style={styles.signalBody}>
        {user.isIdentityRevealed ? (
          <Text style={[styles.signalName, { color }]}>{user.displayName}</Text>
        ) : (
          <Text style={styles.signalAnon}>ANONYMOUS</Text>
        )}
        <VibeTicker ticker={user.vibeTicker} heatLevel={user.heatLevel} compact />
        <Text style={[styles.signalDist, { color: color + 'aa' }]}>
          {Math.round(user.distance)}m · {user.bearing.toFixed(0)}°
        </Text>
      </View>
      <View style={styles.signalActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: color + '55' }]}
          onPress={onLockOn}
        >
          <Text style={[styles.actionText, { color }]}>🎤</Text>
        </TouchableOpacity>
        {!user.isIdentityRevealed && (
          <TouchableOpacity style={styles.revealActionBtn} onPress={onReveal}>
            <Text style={styles.revealActionText}>REVEAL</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

export const ARLookThroughScreen: React.FC = () => {
  const { social, exitARMode, tick, revealIdentity, lockOnUser, recordInteraction } =
    useSocialStore();
  const [focusedUser, setFocusedUser] = useState<NearbyUser | null>(null);
  const [scanComplete, setScanComplete] = useState(false);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Game loop
  useEffect(() => {
    const id = setInterval(() => tick(TICK_MS), TICK_MS);
    return () => clearInterval(id);
  }, [tick]);

  // Boot scan animation
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scanAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => setScanComplete(true));
  }, [scanAnim, overlayAnim]);

  const visibleUsers = social.nearbyUsers
    .filter((u) => u.distance < 200)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4);

  const handleLockOn = (user: NearbyUser) => {
    lockOnUser(user.id);
    recordInteraction(user.id);
    setFocusedUser(user);
  };

  // Boot scan overlay
  if (!scanComplete) {
    return (
      <View style={styles.bootRoot}>
        <View style={styles.bootScanLines} />
        <Text style={styles.bootTitle}>INITIALIZING AR LOOK-THROUGH</Text>
        <Animated.View
          style={[
            styles.bootBar,
            { width: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 280] }) },
          ]}
        />
        <Text style={styles.bootSub}>Calibrating signal detection…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* AR overlay — simulated camera + silhouettes */}
      <ARCameraOverlay
        nearbyUsers={social.nearbyUsers}
        proximityHum={social.proximityHum}
        glitchIntensity={social.glitchIntensity}
      />

      {/* HUD chrome — top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.exitBtn} onPress={exitARMode}>
          <Text style={styles.exitText}>✕ EXIT AR</Text>
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>LOOK-THROUGH</Text>
          <View style={styles.signalBadge}>
            <View style={styles.signalDot} />
            <Text style={styles.signalBadgeText}>{visibleUsers.length} IN RANGE</Text>
          </View>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.humReadout}>HUM {(social.proximityHum * 100).toFixed(0)}%</Text>
        </View>
      </View>

      {/* Glitch intensity readout */}
      {social.glitchIntensity > 0.3 && (
        <View style={styles.interferenceTag}>
          <Text style={styles.interferenceText}>⚡ HIGH-COMPAT INTERFERENCE</Text>
        </View>
      )}

      {/* Signal list — bottom panel */}
      <View style={styles.bottomPanel}>
        <Text style={styles.panelLabel}>DETECTED SIGNALS</Text>
        {visibleUsers.length === 0 ? (
          <Text style={styles.noSignals}>No signals within 200m — keep moving</Text>
        ) : (
          visibleUsers.map((u) => (
            <SignalPanel
              key={u.id}
              user={u}
              onReveal={() => revealIdentity(u.id)}
              onLockOn={() => handleLockOn(u)}
            />
          ))
        )}
      </View>

      {/* Focused user overlay */}
      {focusedUser && (
        <View style={styles.focusOverlay} pointerEvents="box-none">
          <View
            style={[
              styles.focusCard,
              { borderColor: heatLevelColor(focusedUser.heatLevel) + '66' },
            ]}
          >
            <Text style={[styles.focusName, { color: heatLevelColor(focusedUser.heatLevel) }]}>
              {focusedUser.isIdentityRevealed ? focusedUser.displayName : 'Anonymous Signal'}
            </Text>
            {focusedUser.dare && <Text style={styles.focusDare}>{focusedUser.dare}</Text>}
            <TouchableOpacity style={styles.focusDismiss} onPress={() => setFocusedUser(null)}>
              <Text style={styles.focusDismissText}>DISMISS</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050508',
  },
  bootRoot: {
    flex: 1,
    backgroundColor: '#050508',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  bootScanLines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
    backgroundColor: '#39FF14',
  },
  bootTitle: {
    fontSize: 11,
    letterSpacing: 3,
    color: '#39FF14',
    fontWeight: 'bold',
  },
  bootBar: {
    height: 2,
    backgroundColor: '#39FF14',
    borderRadius: 1,
  },
  bootSub: {
    fontSize: 9,
    color: '#444',
    letterSpacing: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(5,5,8,0.7)',
    zIndex: 10,
  },
  exitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,0,110,0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,0,110,0.3)',
  },
  exitText: { fontSize: 9, color: '#FF006E', letterSpacing: 1, fontWeight: 'bold' },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: {
    fontSize: 10,
    letterSpacing: 4,
    color: 'rgba(57,255,20,0.8)',
    fontWeight: 'bold',
    marginBottom: 3,
  },
  signalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(57,255,20,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  signalDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#39FF14',
  },
  signalBadgeText: { fontSize: 8, color: '#39FF14', letterSpacing: 1 },
  topRight: { minWidth: 60, alignItems: 'flex-end' },
  humReadout: { fontSize: 8, color: '#444', letterSpacing: 1 },
  interferenceTag: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,0,110,0.12)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,0,110,0.3)',
    zIndex: 10,
  },
  interferenceText: {
    fontSize: 8,
    color: '#FF006E',
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5,5,8,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(57,255,20,0.15)',
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 28,
    gap: 8,
    maxHeight: '45%',
  },
  panelLabel: {
    fontSize: 8,
    letterSpacing: 3,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  noSignals: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  signalPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  signalAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalAvatarText: { fontSize: 16, fontWeight: 'bold' },
  signalAvatarAnon: { fontSize: 16, color: '#333' },
  signalBody: { flex: 1, gap: 2 },
  signalName: { fontSize: 13, fontWeight: 'bold' },
  signalAnon: { fontSize: 10, color: '#555', fontStyle: 'italic', letterSpacing: 1 },
  signalDist: { fontSize: 8, letterSpacing: 1 },
  signalActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 16 },
  revealActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  revealActionText: { fontSize: 7, color: '#666', letterSpacing: 1.5, fontWeight: 'bold' },
  focusOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 50,
  },
  focusCard: {
    backgroundColor: 'rgba(10,10,20,0.95)',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  focusName: { fontSize: 20, fontWeight: 'bold' },
  focusDare: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  focusDismiss: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    marginTop: 6,
  },
  focusDismissText: { fontSize: 10, color: '#555', letterSpacing: 2 },
});
