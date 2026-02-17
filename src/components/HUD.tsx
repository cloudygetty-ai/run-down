import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Player, Bombardment, WeaponType } from "../types";

type Props = {
  player: Player;
  bombardment: Bombardment;
  alivePlayers: number;
  onShoot: () => void;
  onReload: () => void;
  onBuildToggle: () => void;
  onWeaponSwitch: (slot: 0 | 1 | 2) => void;
};

const WEAPON_LABELS: Record<WeaponType, string> = {
  assault_rifle: "AR",
  shotgun: "SG",
  sniper: "SN",
  smg: "SM",
  pickaxe: "AXE",
};

export const HUD: React.FC<Props> = ({
  player,
  bombardment,
  alivePlayers,
  onShoot,
  onReload,
  onBuildToggle,
  onWeaponSwitch,
}) => {
  const activeWeapon = player.weapons[player.activeWeaponSlot];
  const phaseSeconds = Math.ceil(bombardment.timeUntilNextPhase / 1000);
  const impactSeconds = Math.ceil(bombardment.timeUntilNextImpact / 1000);
  const incomingMeteor = bombardment.timeUntilNextImpact < 2000;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top bar: alive count + meteor timer */}
      <View style={styles.topBar}>
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
              ? `IMPACT IN ${impactSeconds}s`
              : bombardment.isShrinking
              ? "ZONE CLOSING"
              : `Zone: ${phaseSeconds}s`}
          </Text>
        </View>
        <View style={styles.killsChip}>
          <Text style={styles.killsText}>{player.kills} kills</Text>
        </View>
      </View>

      {/* Bottom left: health/shield bars */}
      <View style={styles.bottomLeft}>
        {/* Shield bar */}
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>SH</Text>
          <View style={styles.barBg}>
            <View
              style={[
                styles.shieldFill,
                { width: `${(player.shield / player.maxShield) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.barValue}>{player.shield}</Text>
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
              ]}
            />
          </View>
          <Text style={styles.barValue}>{player.health}</Text>
        </View>
        {/* Materials */}
        <View style={styles.materialsRow}>
          <Text style={styles.matText}>W:{player.materials.wood}</Text>
          <Text style={styles.matText}>S:{player.materials.stone}</Text>
          <Text style={styles.matText}>M:{player.materials.metal}</Text>
        </View>
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
              <Text style={styles.weaponLabel}>
                {w ? WEAPON_LABELS[w.type] : "—"}
              </Text>
              {w && (
                <Text style={styles.ammoLabel}>
                  {w.isReloading ? "RLD" : `${w.currentAmmo}/${w.magazineSize}`}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom right: action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.buildBtn, player.isBuilding && styles.buildBtnActive]}
          onPress={onBuildToggle}
        >
          <Text style={styles.btnText}>BUILD</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reloadBtn} onPress={onReload}>
          <Text style={styles.btnText}>RELOAD</Text>
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
    flexDirection: "column",
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    alignItems: "center",
  },
  aliveChip: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aliveText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  meteorChip: {
    backgroundColor: "rgba(120,40,0,0.75)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  meteorChipShrinking: { backgroundColor: "rgba(200,80,0,0.9)" },
  meteorChipIncoming: { backgroundColor: "rgba(220,0,0,0.95)" },
  meteorText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  killsChip: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  killsText: { color: "#ffcc00", fontWeight: "bold", fontSize: 13 },

  bottomLeft: {
    position: "absolute",
    bottom: 20,
    left: 20,
    minWidth: 180,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  barLabel: { color: "#fff", fontSize: 11, width: 24, fontWeight: "bold" },
  barBg: {
    flex: 1,
    height: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 6,
    overflow: "hidden",
  },
  healthFill: {
    height: "100%",
    backgroundColor: "#44ff44",
    borderRadius: 6,
  },
  healthFillLow: { backgroundColor: "#ff4444" },
  shieldFill: {
    height: "100%",
    backgroundColor: "#44aaff",
    borderRadius: 6,
  },
  barValue: { color: "#fff", fontSize: 11, width: 28, textAlign: "right" },
  materialsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  matText: { color: "#ccaa44", fontSize: 11, fontWeight: "bold" },

  weaponBar: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
  },
  weaponSlot: {
    width: 64,
    height: 64,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  weaponSlotActive: {
    borderColor: "#ffcc00",
    backgroundColor: "rgba(80,60,0,0.7)",
  },
  weaponLabel: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  ammoLabel: { color: "#aaa", fontSize: 9 },

  actionButtons: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
  },
  buildBtn: {
    width: 64,
    height: 64,
    backgroundColor: "rgba(100,60,0,0.7)",
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#aa6600",
    alignItems: "center",
    justifyContent: "center",
  },
  buildBtnActive: {
    backgroundColor: "rgba(200,120,0,0.9)",
    borderColor: "#ffaa00",
  },
  reloadBtn: {
    width: 64,
    height: 64,
    backgroundColor: "rgba(0,80,0,0.7)",
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#00aa00",
    alignItems: "center",
    justifyContent: "center",
  },
  shootBtn: {
    width: 88,
    height: 88,
    backgroundColor: "rgba(180,0,0,0.8)",
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#ff4444",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});
