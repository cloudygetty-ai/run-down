import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { useSocialStore } from '../services/state/socialStore';
import { VelocityMeter } from '../components/VelocityMeter';
import { CollisionAlertOverlay } from '../components/CollisionAlertOverlay';
import { FlashZoneOverlay } from '../components/FlashZoneOverlay';
import { VibeTicker } from '../components/VibeTicker';
import { GlitchEffect } from '../components/GlitchEffect';
import { PowerUpBar } from '../components/PowerUpBar';
import { SocialRadar } from '../components/SocialRadar';
import { NearbyUser, PowerUpType } from '../types/social';
import { heatLevelColor } from '../core/velocity/VelocityEngine';

// 50ms tick drives drift, decay, alert countdowns
const TICK_MS = 50;

// --- User row card ---
type UserRowProps = {
  user: NearbyUser;
  onLockOn: () => void;
  onReveal: () => void;
};

const UserRow: React.FC<UserRowProps> = ({ user, onLockOn, onReveal }) => {
  const color = heatLevelColor(user.heatLevel);
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.timing(pressAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.timing(pressAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.userRow, { transform: [{ scale: pressAnim }] }]}>
      <TouchableOpacity
        style={styles.userRowInner}
        onPress={onLockOn}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Avatar ring */}
        <View style={[styles.avatar, { borderColor: color }]}>
          {user.isIdentityRevealed ? (
            <Text style={[styles.avatarInitial, { color }]}>
              {user.displayName?.charAt(0) ?? '?'}
            </Text>
          ) : (
            <Text style={styles.avatarAnon}>?</Text>
          )}
        </View>

        {/* Info column */}
        <View style={styles.userInfo}>
          {user.isIdentityRevealed && user.displayName ? (
            <Text style={[styles.userName, { color }]}>{user.displayName}</Text>
          ) : (
            <Text style={styles.userAnon}>Anonymous Signal</Text>
          )}
          <VibeTicker ticker={user.vibeTicker} heatLevel={user.heatLevel} compact />
          {user.dare && !user.isIdentityRevealed && (
            <Text style={styles.darePreview} numberOfLines={1}>
              🎯 {user.dare}
            </Text>
          )}
        </View>

        {/* Right column */}
        <View style={styles.userMeta}>
          <Text style={[styles.distLabel, { color }]}>{Math.round(user.distance)}m</Text>
          <View style={[styles.heatPill, { borderColor: color + '55' }]}>
            <Text style={[styles.heatText, { color }]}>{user.heatLevel.toUpperCase()}</Text>
          </View>
          {!user.isIdentityRevealed && (
            <TouchableOpacity style={styles.revealBtn} onPress={onReveal}>
              <Text style={styles.revealBtnText}>REVEAL</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- Gambit modal (voice note + dare) ---
type GambitModalProps = {
  visible: boolean;
  target: NearbyUser | undefined;
  isRecording: boolean;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onClose: () => void;
};

const GambitModal: React.FC<GambitModalProps> = ({
  visible,
  target,
  isRecording,
  onStartRecord,
  onStopRecord,
  onClose,
}) => {
  const waveAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isRecording) {
      waveAnim.setValue(1);
      return;
    }
    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1.3, duration: 200, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
    );
    wave.start();
    return () => wave.stop();
  }, [isRecording, waveAnim]);

  const color = target ? heatLevelColor(target.heatLevel) : '#B388FF';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={[styles.gambitCard, { borderColor: color + '55' }]}>
          <Text style={styles.gambitTitle}>60-SECOND GAMBIT</Text>
          <Text style={styles.gambitSub}>Voice-only · No text allowed</Text>

          {target?.dare && (
            <View style={[styles.dareCard, { borderColor: color + '33' }]}>
              <Text style={styles.dareLabel}>THE DARE</Text>
              <Text style={styles.dareText}>{target.dare}</Text>
            </View>
          )}

          {/* Voice note record button */}
          <TouchableOpacity
            style={[
              styles.micBtn,
              { borderColor: color, backgroundColor: isRecording ? color + '22' : 'transparent' },
            ]}
            onPressIn={onStartRecord}
            onPressOut={onStopRecord}
            activeOpacity={0.8}
          >
            <Animated.Text style={[styles.micIcon, { transform: [{ scale: waveAnim }] }]}>
              {isRecording ? '●' : '🎤'}
            </Animated.Text>
            <Text style={[styles.micLabel, { color }]}>
              {isRecording ? 'RECORDING…' : 'HOLD TO RECORD 10s'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.gambitNote}>Note disappears in 10s after sending</Text>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- Main screen ---
export const SocialHUDScreen: React.FC = () => {
  const {
    social,
    exitSocialMode,
    enterARMode,
    recordInteraction,
    triggerPowerUp,
    deactivatePowerUp,
    triggerFlashZone,
    dismissFlashZone,
    lockOnUser,
    unlockUser,
    startVoiceNote,
    stopVoiceNote,
    revealIdentity,
    tick,
  } = useSocialStore();

  const [gambitVisible, setGambitVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'radar' | 'list' | 'scripts'>('radar');
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Game loop
  useEffect(() => {
    const id = setInterval(() => tick(TICK_MS), TICK_MS);
    return () => clearInterval(id);
  }, [tick]);

  // Slide-in header
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [headerAnim]);

  const lockedUser = social.nearbyUsers.find((u) => u.id === social.gambit.lockedOnUserId);

  const handleUserPress = (userId: string) => {
    lockOnUser(userId);
    recordInteraction(userId);
    setGambitVisible(true);
  };

  const handleCloseGambit = () => {
    setGambitVisible(false);
    unlockUser();
  };

  const translateY = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] });

  return (
    <View style={styles.root}>
      {/* Status bar header */}
      <Animated.View style={[styles.header, { transform: [{ translateY }], opacity: headerAnim }]}>
        <TouchableOpacity onPress={exitSocialMode} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOCIAL HUD</Text>
        <TouchableOpacity onPress={enterARMode} style={styles.arBtn}>
          <Text style={styles.arBtnText}>AR ▶</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Velocity meter + flash zone trigger (demo) */}
      <View style={styles.meterRow}>
        <GlitchEffect intensity={social.glitchIntensity}>
          <VelocityMeter
            heatLevel={social.hotStreak.heatLevel}
            velocityScore={social.hotStreak.velocityScore}
          />
        </GlitchEffect>

        <View style={styles.meterInfo}>
          <Text style={styles.streakLabel}>
            {social.hotStreak.interactionCount} INTERACTION
            {social.hotStreak.interactionCount !== 1 ? 'S' : ''}
          </Text>
          <Text style={styles.streakSub}>{social.nearbyUsers.length} signals in range</Text>
          <Text style={[styles.humLabel, { opacity: social.proximityHum }]}>
            ◉ PROXIMITY HUM ACTIVE
          </Text>
        </View>

        {/* Demo: trigger THE DROP */}
        <TouchableOpacity
          style={styles.dropTrigger}
          onPress={() => triggerFlashZone(Math.floor(Math.random() * 5))}
        >
          <Text style={styles.dropTriggerText}>⚡{'\n'}DROP</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['radar', 'list', 'scripts'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'radar' ? 'RADAR' : tab === 'list' ? 'SIGNALS' : 'SCRIPTS'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'radar' && (
        <View style={styles.radarTab}>
          <SocialRadar
            nearbyUsers={social.nearbyUsers}
            localHeatLevel={social.hotStreak.heatLevel}
            onUserPress={handleUserPress}
          />
        </View>
      )}

      {activeTab === 'list' && (
        <ScrollView style={styles.listTab} showsVerticalScrollIndicator={false}>
          {social.nearbyUsers.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              onLockOn={() => handleUserPress(u.id)}
              onReveal={() => revealIdentity(u.id)}
            />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {activeTab === 'scripts' && (
        <ScrollView style={styles.scriptsTab} showsVerticalScrollIndicator={false}>
          <PowerUpBar
            activePowerUp={social.activePowerUp}
            onActivate={(type: PowerUpType) => triggerPowerUp(type)}
            onDeactivate={deactivatePowerUp}
          />
          {/* Local vibe section */}
          <View style={styles.localVibeSection}>
            <Text style={styles.sectionLabel}>YOUR VIBE TICKER</Text>
            <VibeTicker
              ticker={social.localUser.vibeTicker}
              heatLevel={social.localUser.heatLevel}
            />
          </View>
          <View style={styles.dareSection}>
            <Text style={styles.sectionLabel}>YOUR DARE</Text>
            <View style={styles.dareBox}>
              <Text style={styles.dareBoxText}>{social.localUser.dare}</Text>
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Flash Zone overlay (slides in from top) */}
      {social.activeFlashZone && (
        <FlashZoneOverlay zone={social.activeFlashZone} onDismiss={dismissFlashZone} />
      )}

      {/* Collision alert (full-screen overlay) */}
      {social.collisionAlert?.isActive && (
        <CollisionAlertOverlay
          alert={social.collisionAlert}
          target={social.nearbyUsers.find((u) => u.id === social.collisionAlert?.targetUserId)}
        />
      )}

      {/* Gambit modal */}
      <GambitModal
        visible={gambitVisible}
        target={lockedUser}
        isRecording={social.gambit.voiceNoteRecordingMs > 0}
        onStartRecord={startVoiceNote}
        onStopRecord={stopVoiceNote}
        onClose={handleCloseGambit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(179,136,255,0.12)',
  },
  backBtn: { paddingRight: 12 },
  backText: { fontSize: 11, color: '#555', letterSpacing: 1 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#B388FF',
    letterSpacing: 4,
  },
  arBtn: {
    backgroundColor: 'rgba(57,255,20,0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(57,255,20,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  arBtnText: { fontSize: 10, color: '#39FF14', fontWeight: 'bold', letterSpacing: 1 },

  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  meterInfo: { flex: 1 },
  streakLabel: { fontSize: 13, fontWeight: 'bold', color: '#E8E8F0', marginBottom: 2 },
  streakSub: { fontSize: 10, color: '#555', marginBottom: 6 },
  humLabel: { fontSize: 8, color: '#B388FF', letterSpacing: 2 },
  dropTrigger: {
    backgroundColor: 'rgba(255,0,110,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,0,110,0.35)',
    padding: 10,
    alignItems: 'center',
  },
  dropTriggerText: {
    fontSize: 9,
    color: '#FF006E',
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#B388FF',
  },
  tabText: { fontSize: 9, letterSpacing: 2, color: '#444', fontWeight: 'bold' },
  tabTextActive: { color: '#B388FF' },

  radarTab: { flex: 1, alignItems: 'center', paddingTop: 8 },
  listTab: { flex: 1 },
  scriptsTab: { flex: 1 },

  userRow: {
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  userRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  avatarInitial: { fontSize: 18, fontWeight: 'bold' },
  avatarAnon: { fontSize: 20, color: '#333' },
  userInfo: { flex: 1, gap: 3 },
  userName: { fontSize: 14, fontWeight: 'bold' },
  userAnon: { fontSize: 12, color: '#555', fontStyle: 'italic' },
  darePreview: { fontSize: 9, color: '#444', marginTop: 2 },
  userMeta: { alignItems: 'flex-end', gap: 5 },
  distLabel: { fontSize: 13, fontWeight: 'bold' },
  heatPill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  heatText: { fontSize: 7, letterSpacing: 1, fontWeight: 'bold' },
  revealBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  revealBtnText: { fontSize: 8, color: '#777', letterSpacing: 1 },

  localVibeSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  dareSection: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: '#444',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dareBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(179,136,255,0.2)',
    padding: 14,
  },
  dareBoxText: { fontSize: 14, color: '#aaa', lineHeight: 20, fontStyle: 'italic' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'flex-end',
  },
  gambitCard: {
    backgroundColor: '#0D0D18',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 28,
    paddingBottom: 44,
    alignItems: 'center',
  },
  gambitTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E8E8F0',
    letterSpacing: 3,
    marginBottom: 4,
  },
  gambitSub: { fontSize: 11, color: '#555', marginBottom: 20 },
  dareCard: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dareLabel: { fontSize: 8, letterSpacing: 2, color: '#555', marginBottom: 6, fontWeight: 'bold' },
  dareText: { fontSize: 14, color: '#ccc', lineHeight: 20, fontStyle: 'italic' },
  micBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 4,
  },
  micIcon: { fontSize: 36 },
  micLabel: { fontSize: 8, letterSpacing: 1.5, fontWeight: 'bold' },
  gambitNote: { fontSize: 10, color: '#444', marginBottom: 20, textAlign: 'center' },
  closeBtn: { paddingHorizontal: 24, paddingVertical: 10 },
  closeBtnText: { fontSize: 11, color: '#444', letterSpacing: 2 },
});
