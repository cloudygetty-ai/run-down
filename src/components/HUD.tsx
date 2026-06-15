import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Player,
  Bombardment,
  IncomingMeteor,
  WeaponType,
  GearSlot,
  Gear,
  KillFeedEntry,
  GravityZone,
  TimeEchoZone,
  HelixRelay,
} from '../types';
import { distance } from '../utils';

type Props = {
  player: Player;
  bombardment: Bombardment;
  incomingMeteors: IncomingMeteor[];
  nextSupplyDropMs: number;
  alivePlayers: number;
  bountyPlayerId: string | null;
  activeQuip: string | null;
  killFeed: KillFeedEntry[];
  gravityZones: GravityZone[];
  timeEchoZones: TimeEchoZone[];
  helixRelays: HelixRelay[];
  startTime: number;
  onShoot: () => void;
  onReload: () => void;
  onBuildToggle: () => void;
  onBuildMaterialSwitch: () => void;
  onWeaponSwitch: (slot: 0 | 1 | 2) => void;
  onAbility: () => void;
};

const WEAPON_LABELS: Record<WeaponType, string> = {
  // Melee
  pickaxe: 'AXE',
  // Pistols
  pistol: 'PISTOL',
  revolver: 'REVLVR',
  hand_cannon: 'HCNON',
  burst_pistol: 'B-PST',
  // SMGs
  smg: 'SMG',
  compact_smg: 'CSMG',
  suppressed_smg: 'SSMG',
  // Assault Rifles
  assault_rifle: 'AR',
  burst_ar: 'B-AR',
  heavy_ar: 'H-AR',
  thermal_ar: 'T-AR',
  // Shotguns
  shotgun: 'SG',
  tactical_shotgun: 'TSG',
  heavy_shotgun: 'HSG',
  drum_shotgun: 'DSG',
  // Sniper Rifles
  sniper: 'SNP',
  semi_sniper: 'SSNP',
  heavy_sniper: 'HSNP',
  hunting_rifle: 'HUNT',
  // Marksman / DMR
  marksman_rifle: 'DMR',
  // LMGs
  lmg: 'LMG',
  // Explosives
  rocket_launcher: 'RPG',
  // Special / Exotic
  crossbow: 'XBOW',
  minigun: 'MINI',
  rail_gun: 'RAIL',
};

const CORE_EFFECT_LABELS: Record<string, string> = {
  cooldown_reduction: 'CDR',
  damage_amp: '+DMG',
  ability_mutation: 'MUTATE',
};

const GEAR_SLOT_ICONS: Record<GearSlot, string> = {
  helmet: '⛑',
  chest:  '🦺',
  legs:   '👖',
  gloves: '🥊',
};

const RARITY_COLORS: Record<string, string> = {
  common:    '#aaaaaa',
  uncommon:  '#44cc44',
  rare:      '#4488ff',
  epic:      '#aa44ff',
  legendary: '#ffaa00',
};

export const HUD: React.FC<Props> = ({
  player,
  bombardment,
  incomingMeteors,
  nextSupplyDropMs,
  alivePlayers,
  bountyPlayerId,
  activeQuip,
  killFeed,
  gravityZones,
  timeEchoZones,
  helixRelays,
  startTime,
  onShoot,
  onReload,
  onBuildToggle,
  onBuildMaterialSwitch,
  onWeaponSwitch,
  onAbility,
}) => {
  const activeWeapon = player.weapons[player.activeWeaponSlot];
  const phaseSeconds = Math.ceil(bombardment.timeUntilNextPhase / 1000);
  // Nearest incoming meteor gives the most urgent warning
  const nearestMeteor = incomingMeteors.length > 0
    ? incomingMeteors.reduce((a, b) => a.timeUntilImpactMs < b.timeUntilImpactMs ? a : b)
    : null;
  const impactSeconds = nearestMeteor ? Math.ceil(nearestMeteor.timeUntilImpactMs / 1000) : 0;
  const incomingMeteor = nearestMeteor !== null;
  const supplyDropSoon = nextSupplyDropMs < 30_000;
  const supplyDropSec = Math.ceil(nextSupplyDropMs / 1000);
  const abilityReady = player.abilityChargeMs === 0;
  const isCorrupted = player.corruptionDps > 0;
  const isBounty = bountyPlayerId === player.id;

  // Match timer (computed — not stored in state)
  const elapsedMs = startTime > 0 ? Date.now() - startTime : 0;
  const elapsedMin = Math.floor(elapsedMs / 60_000);
  const elapsedSec = Math.floor((elapsedMs % 60_000) / 1000);
  const matchTime = `${elapsedMin}:${elapsedSec.toString().padStart(2, '0')}`;

  // Zone type alert — show when player is inside a special meteor-created zone
  const inGravityZone = gravityZones.some((z) => distance(player.position, z.position) <= z.radius);
  const inEchoZone = timeEchoZones.some((z) => distance(player.position, z.position) <= z.radius);
  const zoneAlert = inGravityZone ? 'GRAVITY ZONE' : inEchoZone ? 'ECHO ZONE' : null;

  // Helix Relay: detect nearest relay within capture range
  const nearbyRelay = helixRelays.find(
    (r) => distance(player.position, r.position) <= r.captureRadius,
  ) ?? null;

  // Build material label
  const MAT_COLORS: Record<string, string> = { wood: '#cc8800', stone: '#8899aa', metal: '#aabbcc' };
  const matColor = MAT_COLORS[player.selectedBuildMaterial] ?? '#aaa';

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top bar: match timer | alive count | zone | kills */}
      <View style={styles.topBar}>
        <View style={styles.timerChip}>
          <Text style={styles.timerText}>{matchTime}</Text>
        </View>
        <View style={styles.aliveChip}>
          <Text style={styles.aliveText}>{alivePlayers} alive</Text>
        </View>
        <View
          style={[
            styles.meteorChip,
            bombardment.isShrinking && styles.meteorChipShrinking,
            incomingMeteor && styles.meteorChipIncoming,
          ]}
        >
          <Text style={styles.meteorText}>
            {incomingMeteor
              ? `IMPACT ${impactSeconds}s`
              : bombardment.isShrinking
              ? 'ZONE CLOSING'
              : `Zone: ${phaseSeconds}s`}
          </Text>
        </View>
        {supplyDropSoon && (
          <View style={styles.supplyChip}>
            <Text style={styles.supplyText}>📦 {supplyDropSec}s</Text>
          </View>
        )}
        <View style={[styles.killsChip, isBounty && styles.killsChipBounty]}>
          <Text style={[styles.killsText, isBounty && styles.killsTextBounty]}>
            {isBounty ? `🎯 ${player.kills}` : `${player.kills}K`}
          </Text>
        </View>
      </View>

      {/* Zone type alert — shown when inside gravity or echo zone */}
      {zoneAlert && (
        <View style={[styles.zoneAlert, inGravityZone ? styles.zoneAlertGravity : styles.zoneAlertEcho]}>
          <Text style={styles.zoneAlertText}>{zoneAlert}</Text>
        </View>
      )}

      {/* Helix Relay capture indicator */}
      {nearbyRelay && (
        <View style={styles.relayCapture} pointerEvents="none">
          <Text style={[styles.relayCaptureLabel, nearbyRelay.captureProgress >= 1 && styles.relaySecuredLabel]}>
            {nearbyRelay.captureProgress >= 1 ? '⊕ RELAY SECURED' : '⊕ CAPTURING RELAY'}
          </Text>
          {nearbyRelay.captureProgress < 1 && (
            <View style={styles.relayCaptureBar}>
              <View
                style={[
                  styles.relayCaptureBarFill,
                  { width: `${Math.round(nearbyRelay.captureProgress * 100)}%` },
                ]}
              />
            </View>
          )}
        </View>
      )}

      {/* Kill feed — top right, below top bar */}
      {killFeed.length > 0 && (
        <View style={styles.killFeedContainer}>
          {killFeed.slice(0, 5).map((entry) => (
            <View key={entry.id} style={styles.killFeedRow}>
              <Text style={styles.killFeedKiller} numberOfLines={1}>{entry.killerName}</Text>
              <Text style={styles.killFeedSep}> ⚡ </Text>
              <Text style={styles.killFeedVictim} numberOfLines={1}>{entry.victimName}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Knocked / downed indicator */}
      {player.status === 'knocked' && (
        <View style={styles.knockedBanner}>
          <Text style={styles.knockedText}>
            KNOCKED — {Math.ceil((player.knockedTimerMs ?? 0) / 1000)}s
          </Text>
        </View>
      )}

      {/* Character quip banner */}
      {activeQuip && (
        <View style={styles.quipBanner}>
          <Text style={styles.quipText}>"{activeQuip}"</Text>
        </View>
      )}

      {/* Bottom left: health/shield + corruption + core indicator */}
      <View style={styles.bottomLeft}>
        {/* Corruption indicator */}
        {isCorrupted && (
          <View style={styles.coreRow}>
            <View style={[styles.coreChip, styles.coreChipActive]}>
              <Text style={styles.coreChipText}>
                CORE: {player.heldCoreEffect ? CORE_EFFECT_LABELS[player.heldCoreEffect] ?? player.heldCoreEffect : '?'}
                {'  '}
                <Text style={styles.corruptText}>-{player.corruptionDps.toFixed(0)} HP/s</Text>
              </Text>
            </View>
          </View>
        )}
        {/* Shield bar */}
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>SH</Text>
          <View style={styles.barBg}>
            <View
              style={[styles.shieldFill, { width: `${(player.shield / player.maxShield) * 100}%` }]}
            />
          </View>
          <Text style={styles.barValue}>{Math.ceil(player.shield)}</Text>
        </View>
        {/* Health bar */}
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>HP</Text>
          <View style={styles.barBg}>
            <View
              style={[
                styles.healthFill,
                { width: `${(player.health / player.maxHealth) * 100}%` },
                player.health < 30 && styles.healthFillLow,
                isCorrupted && styles.healthFillCorrupted,
              ]}
            />
          </View>
          <Text style={[styles.barValue, isCorrupted && styles.corruptText]}>
            {Math.ceil(player.health)}
          </Text>
        </View>
        {/* Materials */}
        <View style={styles.materialsRow}>
          <Text style={styles.matText}>W:{player.materials.wood}</Text>
          <Text style={styles.matText}>S:{player.materials.stone}</Text>
          <Text style={styles.matText}>M:{player.materials.metal}</Text>
        </View>
      </View>

      {/* Gear strip — 4 slots above weapon bar */}
      <View style={styles.gearStrip}>
        {(['helmet', 'chest', 'legs', 'gloves'] as GearSlot[]).map((slot) => {
          const piece: Gear | null = player.gear[slot];
          return (
            <View
              key={slot}
              style={[
                styles.gearSlot,
                piece && { borderColor: RARITY_COLORS[piece.rarity] },
              ]}
            >
              <Text style={styles.gearIcon}>{GEAR_SLOT_ICONS[slot]}</Text>
              {piece ? (
                <Text
                  style={[styles.gearName, { color: RARITY_COLORS[piece.rarity] }]}
                  numberOfLines={1}
                >
                  {piece.name}
                </Text>
              ) : (
                <Text style={styles.gearEmpty}>—</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Bottom center: weapon slots */}
      <View style={styles.weaponBar}>
        {([0, 1, 2] as const).map((slot) => {
          const w = player.weapons[slot];
          return (
            <TouchableOpacity
              key={slot}
              style={[
                styles.weaponSlot,
                slot === player.activeWeaponSlot && styles.weaponSlotActive,
              ]}
              onPress={() => onWeaponSwitch(slot)}
            >
              <Text style={styles.weaponLabel}>{w ? WEAPON_LABELS[w.type] : '—'}</Text>
              {w && (
                <Text style={styles.ammoLabel}>
                  {w.isReloading ? 'RLD' : `${w.currentAmmo}/${w.magazineSize}`}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom right: action buttons + ability */}
      <View style={styles.actionButtons}>
        {/* Build button + material cycle (stacked) */}
        <View style={styles.buildGroup}>
          <TouchableOpacity
            style={[styles.buildBtn, player.isBuilding && styles.buildBtnActive]}
            onPress={onBuildToggle}
          >
            <Text style={styles.btnText}>BUILD</Text>
          </TouchableOpacity>
          {player.isBuilding && (
            <TouchableOpacity style={[styles.matBtn, { borderColor: matColor }]} onPress={onBuildMaterialSwitch}>
              <Text style={[styles.matBtnText, { color: matColor }]}>
                {player.selectedBuildMaterial.toUpperCase().slice(0, 4)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.reloadBtn} onPress={onReload}>
          <Text style={styles.btnText}>RELOAD</Text>
        </TouchableOpacity>
        {/* Ability button */}
        <TouchableOpacity
          style={[
            styles.abilityBtn,
            abilityReady && styles.abilityBtnReady,
            !abilityReady && styles.abilityBtnCooldown,
            player.abilityActiveMs > 0 && styles.abilityBtnActive,
          ]}
          onPress={onAbility}
          disabled={!abilityReady}
        >
          <Text style={styles.abilityBtnText}>
            {player.abilityActiveMs > 0
              ? `ACTIVE\n${(player.abilityActiveMs / 1000).toFixed(1)}s`
              : abilityReady
              ? 'ABILITY'
              : `${(player.abilityChargeMs / 1000).toFixed(0)}s`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shootBtn, !activeWeapon && styles.btnDisabled]}
          onPress={onShoot}
          disabled={!activeWeapon}
        >
          <Text style={styles.btnText}>FIRE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    alignItems: 'center',
  },
  timerChip: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: { color: '#cccccc', fontSize: 11, fontWeight: 'bold', fontVariant: ['tabular-nums'] },

  zoneAlert: {
    position: 'absolute',
    top: 52,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  zoneAlertGravity: { backgroundColor: 'rgba(80,0,180,0.75)', borderColor: 'rgba(150,50,255,0.8)' },
  zoneAlertEcho:    { backgroundColor: 'rgba(0,100,180,0.75)', borderColor: 'rgba(50,180,255,0.8)' },
  zoneAlertText: { color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },

  relayCapture: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(180,100,255,0.6)',
    minWidth: 180,
  },
  relayCaptureLabel: {
    color: '#cc88ff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 5,
  },
  relaySecuredLabel: { color: '#aaffaa' },
  relayCaptureBar: {
    width: 150,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  relayCaptureBarFill: {
    height: '100%',
    backgroundColor: '#bb44ff',
    borderRadius: 3,
  },

  buildGroup: {
    alignItems: 'center',
    gap: 4,
  },
  matBtn: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  matBtnText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  aliveChip: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aliveText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  meteorChip: {
    backgroundColor: 'rgba(120,40,0,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  meteorChipShrinking: { backgroundColor: 'rgba(200,80,0,0.9)' },
  meteorChipIncoming: { backgroundColor: 'rgba(220,0,0,0.95)' },
  meteorText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  supplyChip: {
    backgroundColor: 'rgba(0,120,60,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,220,100,0.6)',
  },
  supplyText: { color: '#aaffcc', fontWeight: 'bold', fontSize: 13 },
  killsChip: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  killsChipBounty: { backgroundColor: 'rgba(180,30,0,0.85)', borderWidth: 1, borderColor: '#ff4400' },
  killsText: { color: '#ffcc00', fontWeight: 'bold', fontSize: 13 },
  killsTextBounty: { color: '#ff6633' },

  killFeedContainer: {
    position: 'absolute',
    top: 55,
    right: 10,
    alignItems: 'flex-end',
  },
  killFeedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 3,
    maxWidth: 200,
  },
  killFeedKiller: { color: '#ffcc44', fontSize: 11, fontWeight: 'bold', flexShrink: 1 },
  killFeedSep:    { color: '#ff4444', fontSize: 11 },
  killFeedVictim: { color: '#aaaaaa', fontSize: 11, flexShrink: 1 },

  knockedBanner: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(180,0,0,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ff4444',
  },
  knockedText: { color: '#fff', fontWeight: 'bold', fontSize: 18, textAlign: 'center' },

  quipBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,150,0,0.3)',
    maxWidth: '80%',
  },
  quipText: { color: '#ffcc88', fontSize: 13, fontStyle: 'italic', textAlign: 'center' },

  bottomLeft: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    minWidth: 190,
  },
  coreRow: { marginBottom: 5 },
  coreChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  coreChipActive: { backgroundColor: 'rgba(180,0,200,0.55)', borderWidth: 1, borderColor: '#cc44ff' },
  coreChipText: { color: '#ee88ff', fontSize: 10, fontWeight: 'bold' },
  corruptText: { color: '#ff4488' },

  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  barLabel: { color: '#fff', fontSize: 11, width: 24, fontWeight: 'bold' },
  barBg: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    backgroundColor: '#44ff44',
    borderRadius: 6,
  },
  healthFillLow: { backgroundColor: '#ff4444' },
  healthFillCorrupted: { backgroundColor: '#cc44ff' },
  shieldFill: {
    height: '100%',
    backgroundColor: '#44aaff',
    borderRadius: 6,
  },
  barValue: { color: '#fff', fontSize: 11, width: 30, textAlign: 'right' },
  materialsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  matText: { color: '#ccaa44', fontSize: 11, fontWeight: 'bold' },

  gearStrip: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  gearSlot: {
    width: 58,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  gearIcon: { fontSize: 14 },
  gearName: { fontSize: 8, fontWeight: 'bold', textAlign: 'center', marginTop: 1 },
  gearEmpty: { color: 'rgba(255,255,255,0.25)', fontSize: 12 },

  weaponBar: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  weaponSlot: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponSlotActive: {
    borderColor: '#ffcc00',
    backgroundColor: 'rgba(80,60,0,0.7)',
  },
  weaponLabel: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  ammoLabel: { color: '#aaa', fontSize: 9 },

  actionButtons: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  buildBtn: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(100,60,0,0.7)',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#aa6600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildBtnActive: {
    backgroundColor: 'rgba(200,120,0,0.9)',
    borderColor: '#ffaa00',
  },
  reloadBtn: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(0,80,0,0.7)',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#00aa00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  abilityBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abilityBtnReady: {
    backgroundColor: 'rgba(0,100,200,0.85)',
    borderColor: '#44aaff',
  },
  abilityBtnCooldown: {
    backgroundColor: 'rgba(30,30,30,0.7)',
    borderColor: 'rgba(80,80,80,0.5)',
  },
  abilityBtnActive: {
    backgroundColor: 'rgba(100,0,200,0.9)',
    borderColor: '#cc44ff',
  },
  abilityBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  shootBtn: {
    width: 88,
    height: 88,
    backgroundColor: 'rgba(180,0,0,0.8)',
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#ff4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});
