import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { GameMap } from '../components/GameMap';
import { HUD } from '../components/HUD';
import { Joystick } from '../components/Joystick';
import { Minimap } from '../components/Minimap';
import { useGameStore } from '../services/state';
import { tickGame, fireShot, InputState } from '../core/gameEngine';
import { getCharacter } from '../core/characters';
import { tickBots } from '../services/ai';
import { startReload, switchWeaponSlot } from '../services/weapons';
import { BuildPiece, Vector2 } from '../types';
import { distance, isInsideCircle } from '../utils';
import { logger } from '../utils';
import { TICK_RATE_MS, LOOT_PICKUP_RANGE } from '../core/balance';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const VIEWPORT_W = SCREEN_W;
const VIEWPORT_H = SCREEN_H;

type Props = {
  onGameOver: () => void;
};

export const GameScreen: React.FC<Props> = ({ onGameOver }) => {
  const { gameState, triggerAbility } = useGameStore();
  const inputRef = useRef<InputState>({
    moveVector: { x: 0, y: 0 },
    aimVector: { x: 1, y: 0 },
    isShooting: false,
    isBuilding: false,
    buildPieceType: 'wall',
    buildPosition: null,
    wantsReload: false,
  });
  const lastFireTimeRef = useRef(0);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;
  const [hitMarkerVisible, setHitMarkerVisible] = useState(false);
  const hitMarkerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Floating damage numbers — created on hit, auto-expire after 900ms
  const [damageNumbers, setDamageNumbers] = useState<
    Array<{ id: string; x: number; y: number; value: number; bornAt: number }>
  >([]);
  // Pickup feedback flashes
  const [pickupFlashes, setPickupFlashes] = useState<
    Array<{ id: string; text: string; bornAt: number }>
  >([]);
  // Kill streak feedback
  const prevKillsRef = useRef(0);
  const killTimestampsRef = useRef<number[]>([]);
  const [streakLabel, setStreakLabel] = useState<string | null>(null);
  const streakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Personal elimination notification
  const [eliminationBanner, setEliminationBanner] = useState<string | null>(null);
  const eliminationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Show environment name for 3s on match start
  const [showEnvBanner, setShowEnvBanner] = useState(true);
  const envBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    envBannerTimeoutRef.current = setTimeout(() => setShowEnvBanner(false), 3000);
    return () => {
      if (envBannerTimeoutRef.current) clearTimeout(envBannerTimeoutRef.current);
    };
  }, []);

  // Camera follows the human player
  const human = gameState.players.find((p) => p.isHuman);
  const viewportX = human
    ? Math.max(0, Math.min(gameState.mapWidth - VIEWPORT_W, human.position.x - VIEWPORT_W / 2))
    : 0;
  const viewportY = human
    ? Math.max(0, Math.min(gameState.mapHeight - VIEWPORT_H, human.position.y - VIEWPORT_H / 2))
    : 0;

  useEffect(() => {
    tickIntervalRef.current = setInterval(() => {
      // WHY: always read from getState() — never close over stale state
      const { gameState: state, updateGameState: update, pickUpLoot } = useGameStore.getState();

      if (state.phase !== 'playing') {
        clearInterval(tickIntervalRef.current!);
        return;
      }

      try {
        let next = tickGame(state, inputRef.current, TICK_RATE_MS);
        next = tickBots(next, TICK_RATE_MS);

        if (next.phase === 'game_over') {
          update(next);
          onGameOverRef.current();
          return;
        }

        // Auto-fire when right joystick is held out (isShooting flag set by joystick)
        if (inputRef.current.isShooting) {
          const h = next.players.find((p) => p.isHuman && p.status === 'alive');
          if (h) {
            const weapon = h.weapons[h.activeWeaponSlot];
            if (weapon && !weapon.isReloading && weapon.currentAmmo > 0) {
              const now = Date.now();
              const effectiveFireRate = h.activeAbilityEffect === 'rapid_fire'
                ? weapon.fireRate * 2
                : weapon.fireRate;
              if (now - lastFireTimeRef.current >= 1000 / effectiveFireRate) {
                lastFireTimeRef.current = now;
                const aim = inputRef.current.aimVector;
                const mag = Math.sqrt(aim.x * aim.x + aim.y * aim.y);
                const dir = mag > 0.01
                  ? aim
                  : { x: Math.cos(h.rotation * Math.PI / 180), y: Math.sin(h.rotation * Math.PI / 180) };
                const prevPlayers = next.players;
                next = fireShot(next, h.id, {
                  x: h.position.x + dir.x * weapon.range,
                  y: h.position.y + dir.y * weapon.range,
                });
                // Detect hits: collect damage per enemy for marker + floating numbers
                const hits = next.players
                  .map((p, i) => ({
                    p,
                    delta: !p.isHuman
                      ? ((prevPlayers[i]?.health ?? p.health) - p.health) +
                        ((prevPlayers[i]?.shield ?? p.shield) - p.shield)
                      : 0,
                  }))
                  .filter(({ delta }) => delta > 0);
                if (hits.length > 0) {
                  setHitMarkerVisible(true);
                  if (hitMarkerTimeoutRef.current) clearTimeout(hitMarkerTimeoutRef.current);
                  hitMarkerTimeoutRef.current = setTimeout(() => setHitMarkerVisible(false), 120);
                  const now = Date.now();
                  setDamageNumbers((prev) => [
                    ...prev.filter((d) => now - d.bornAt < 900),
                    ...hits.map(({ p, delta }) => ({
                      id: `dmg_${now}_${p.id}`,
                      x: p.position.x,
                      y: p.position.y - 20,
                      value: Math.round(delta),
                      bornAt: now,
                    })),
                  ]);
                }
              }
            }
          }
        }

        // Auto-pickup loot for human — use store action directly (atomic)
        const h = next.players.find((p) => p.isHuman);
        if (h) {
          const nearby = next.lootDrops.find(
            (l) => distance(l.position, h.position) < LOOT_PICKUP_RANGE,
          );
          if (nearby) {
            update(next); // commit movement first
            pickUpLoot(h.id, nearby.id); // then pick up
            // Pickup feedback
            const flashes: string[] = [];
            if (nearby.weapon) flashes.push(`GOT ${nearby.weapon.type.replace(/_/g, ' ').toUpperCase()}`);
            if (nearby.gear) flashes.push(`GOT ${nearby.gear.name.toUpperCase()}`);
            if (nearby.shield > 0) flashes.push(`+${nearby.shield} SHIELD`);
            if (nearby.health > 0) flashes.push(`+${nearby.health} HP`);
            if (nearby.ammo > 0) flashes.push(`+${nearby.ammo} AMMO`);
            if (flashes.length > 0) {
              const now = Date.now();
              setPickupFlashes((prev) => [
                ...prev.filter((f) => now - f.bornAt < 1200),
                ...flashes.map((text, i) => ({ id: `pf_${now}_${i}`, text, bornAt: now + i * 120 })),
              ]);
            }
            return;
          }
        }

        // Kill streak + elimination banner detection
        const humanNext = next.players.find((p) => p.isHuman);
        if (humanNext && humanNext.kills > prevKillsRef.current) {
          prevKillsRef.current = humanNext.kills;
          const now = Date.now();
          killTimestampsRef.current = [
            ...killTimestampsRef.current.filter((t) => now - t < 8000),
            now,
          ];
          const streak = killTimestampsRef.current.length;
          let label: string | null = null;
          if (streak === 2) label = 'DOUBLE KILL';
          else if (streak === 3) label = 'TRIPLE KILL';
          else if (streak >= 4) label = `${streak}× KILL STREAK`;
          if (label) {
            setStreakLabel(label);
            if (streakTimeoutRef.current) clearTimeout(streakTimeoutRef.current);
            streakTimeoutRef.current = setTimeout(() => setStreakLabel(null), 2200);
          }
          // Personal elimination notification — find who we just eliminated from kill feed
          const latestEntry = next.killFeed[0];
          if (latestEntry && latestEntry.killerName === humanNext.name) {
            setEliminationBanner(`YOU ELIMINATED ${latestEntry.victimName}`);
            if (eliminationTimeoutRef.current) clearTimeout(eliminationTimeoutRef.current);
            eliminationTimeoutRef.current = setTimeout(() => setEliminationBanner(null), 2500);
          }
        }

        update(next);
      } catch (err) {
        logger.error('GameScreen', 'game tick error', err);
      }
    }, TICK_RATE_MS);

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, []); // intentional: interval reads state via getState() each tick

  const handleMove = useCallback((direction: Vector2) => {
    inputRef.current = { ...inputRef.current, moveVector: direction };
  }, []);

  const handleMoveRelease = useCallback(() => {
    inputRef.current = { ...inputRef.current, moveVector: { x: 0, y: 0 } };
  }, []);

  // Manual FIRE button — shoots in current aim direction (or player facing if joystick at rest)
  const handleShoot = useCallback(() => {
    const { gameState: state, updateGameState: update } = useGameStore.getState();
    const h = state.players.find((p) => p.isHuman && p.status === 'alive');
    if (!h) return;
    const weapon = h.weapons[h.activeWeaponSlot];
    if (!weapon || weapon.isReloading || weapon.currentAmmo <= 0) return;
    const now = Date.now();
    const effectiveFireRate = h.activeAbilityEffect === 'rapid_fire' ? weapon.fireRate * 2 : weapon.fireRate;
    if (now - lastFireTimeRef.current < 1000 / effectiveFireRate) return;
    lastFireTimeRef.current = now;
    const aim = inputRef.current.aimVector;
    const mag = Math.sqrt(aim.x * aim.x + aim.y * aim.y);
    const dir = mag > 0.01
      ? aim
      : { x: Math.cos(h.rotation * Math.PI / 180), y: Math.sin(h.rotation * Math.PI / 180) };
    const nextState = fireShot(state, h.id, {
      x: h.position.x + dir.x * weapon.range,
      y: h.position.y + dir.y * weapon.range,
    });
    const hits = nextState.players
      .map((p, i) => ({
        p,
        delta: !p.isHuman
          ? ((state.players[i]?.health ?? p.health) - p.health) +
            ((state.players[i]?.shield ?? p.shield) - p.shield)
          : 0,
      }))
      .filter(({ delta }) => delta > 0);
    if (hits.length > 0) {
      setHitMarkerVisible(true);
      if (hitMarkerTimeoutRef.current) clearTimeout(hitMarkerTimeoutRef.current);
      hitMarkerTimeoutRef.current = setTimeout(() => setHitMarkerVisible(false), 120);
      const now = Date.now();
      setDamageNumbers((prev) => [
        ...prev.filter((d) => now - d.bornAt < 900),
        ...hits.map(({ p, delta }) => ({
          id: `dmg_${now}_${p.id}`,
          x: p.position.x,
          y: p.position.y - 20,
          value: Math.round(delta),
          bornAt: now,
        })),
      ]);
    }
    update(nextState);
  }, []);

  const handleReload = useCallback(() => {
    const { gameState: state } = useGameStore.getState();
    const h = state.players.find((p) => p.isHuman);
    if (!h) return;
    startReload(h, (updated) => {
      const { gameState: s, updateGameState: u } = useGameStore.getState();
      u({ ...s, players: s.players.map((p) => (p.id === h.id ? updated : p)) });
    });
  }, []);

  const handleBuildToggle = useCallback(() => {
    const { gameState: state, updateGameState: update } = useGameStore.getState();
    const h = state.players.find((p) => p.isHuman);
    if (!h) return;
    update({
      ...state,
      players: state.players.map((p) => (p.id === h.id ? { ...p, isBuilding: !p.isBuilding } : p)),
    });
  }, []);

  const handleWeaponSwitch = useCallback((slot: 0 | 1 | 2) => {
    const { gameState: state, updateGameState: update } = useGameStore.getState();
    const h = state.players.find((p) => p.isHuman);
    if (!h) return;
    update({
      ...state,
      players: state.players.map((p) => (p.id === h.id ? switchWeaponSlot(h, slot) : p)),
    });
  }, []);

  const handleBuildMaterialSwitch = useCallback(() => {
    useGameStore.getState().switchBuildMaterial();
  }, []);

  const handlePlaceBuild = useCallback(() => {
    const { gameState: state, placeBuildPiece } = useGameStore.getState();
    const h = state.players.find((p) => p.isHuman);
    if (!h || !h.isBuilding) return;
    const piece: BuildPiece = {
      id: `bp_${Date.now()}`,
      type: h.selectedBuildPiece,
      material: h.selectedBuildMaterial,
      position: {
        x: h.position.x + Math.cos((h.rotation * Math.PI) / 180) * 60,
        y: h.position.y + Math.sin((h.rotation * Math.PI) / 180) * 60,
      },
      rotation: Math.round(h.rotation / 90) * 90,
      health: 150,
      maxHealth: 150,
      ownerId: h.id,
    };
    placeBuildPiece(piece);
  }, []);

  if (!human) return null;

  return (
    <View style={styles.container}>
      <GameMap
        state={gameState}
        viewportX={viewportX}
        viewportY={viewportY}
        viewportW={VIEWPORT_W}
        viewportH={VIEWPORT_H}
      />

      <View style={styles.joystickLeft}>
        <Joystick onMove={handleMove} onRelease={handleMoveRelease} />
      </View>

      {/* Right joystick: aim + auto-fire when deflected */}
      <View style={styles.joystickRight}>
        <Joystick
          onMove={(v) => {
            const mag = Math.sqrt(v.x * v.x + v.y * v.y);
            inputRef.current = {
              ...inputRef.current,
              aimVector: v,
              isShooting: mag > 0.25,
            };
          }}
          onRelease={() => {
            inputRef.current = { ...inputRef.current, isShooting: false };
          }}
          size={100}
        />
      </View>

      {/* Minimap — top-right corner overlay */}
      <View style={styles.minimapOverlay}>
        <Minimap
          players={gameState.players}
          bombardment={gameState.bombardment}
          supplyDrops={gameState.supplyDrops}
          incomingMeteors={gameState.incomingMeteors}
          helixRelays={gameState.helixRelays}
          fractureCores={gameState.fractureCores}
          mapWidth={gameState.mapWidth}
          mapHeight={gameState.mapHeight}
          mapTheme={gameState.mapTheme}
        />
      </View>

      {/* Danger vignette — appears at screen edges when HP is low or outside the zone */}
      {(() => {
        const lowHealth = human.health < 30;
        const outsideZone = !isInsideCircle(
          human.position,
          gameState.bombardment.shelterCenter,
          gameState.bombardment.shelterRadius,
        );
        const knocked = human.status === 'knocked';
        const intensity = knocked ? 0.6 : outsideZone ? 0.4 : lowHealth ? 0.3 : 0;
        if (intensity === 0) return null;
        return (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderWidth: 44,
                borderColor: `rgba(200,0,0,${intensity})`,
                borderRadius: 0,
              },
            ]}
          />
        );
      })()}

      {/* Persistent crosshair */}
      <View style={styles.crosshairOverlay} pointerEvents="none">
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
        <View style={styles.crosshairDot} />
      </View>

      {hitMarkerVisible && (
        <View style={styles.hitMarkerOverlay} pointerEvents="none">
          <View style={styles.hitMarkerLineH} />
          <View style={styles.hitMarkerLineV} />
        </View>
      )}

      {/* Pickup feedback */}
      <View style={styles.pickupFeedbackContainer} pointerEvents="none">
        {pickupFlashes.map((f) => {
          const age = Date.now() - f.bornAt;
          if (age >= 1200) return null;
          const opacity = Math.max(0, 1 - age / 1200);
          return (
            <Text key={f.id} style={[styles.pickupFlash, { opacity }]}>
              {f.text}
            </Text>
          );
        })}
      </View>

      {/* Personal elimination notification */}
      {eliminationBanner && (
        <View style={styles.eliminationBanner} pointerEvents="none">
          <Text style={styles.eliminationText}>{eliminationBanner}</Text>
        </View>
      )}

      {/* Kill streak banner */}
      {streakLabel && (
        <View style={styles.streakBanner} pointerEvents="none">
          <Text style={styles.streakText}>{streakLabel}</Text>
        </View>
      )}

      {/* Floating damage numbers */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {damageNumbers.map((d) => {
          const age = Date.now() - d.bornAt;
          if (age >= 900) return null;
          const screenX = d.x - viewportX;
          const screenY = d.y - viewportY - age * 0.065;
          const opacity = Math.max(0, 1 - age / 900);
          return (
            <Text
              key={d.id}
              style={[styles.damageNumber, { left: screenX - 20, top: screenY, opacity }]}
            >
              {d.value}
            </Text>
          );
        })}
      </View>

      <HUD
        player={human}
        characterAbilityName={getCharacter(human.characterId).ability.name}
        bombardment={gameState.bombardment}
        incomingMeteors={gameState.incomingMeteors}
        nextSupplyDropMs={gameState.nextSupplyDropMs}
        alivePlayers={gameState.alivePlayers}
        bountyPlayerId={gameState.bountyPlayerId}
        activeQuip={gameState.activeQuip}
        killFeed={gameState.killFeed}
        gravityZones={gameState.gravityZones}
        timeEchoZones={gameState.timeEchoZones}
        helixRelays={gameState.helixRelays}
        startTime={gameState.startTime}
        onShoot={human.isBuilding ? handlePlaceBuild : handleShoot}
        onReload={handleReload}
        onBuildToggle={handleBuildToggle}
        onBuildMaterialSwitch={handleBuildMaterialSwitch}
        onWeaponSwitch={handleWeaponSwitch}
        onAbility={triggerAbility}
      />

      {/* Environment name banner — shown for 3s on match start */}
      {showEnvBanner && (
        <View
          style={[styles.envBanner, { borderColor: gameState.mapTheme.accentColor + '88' }]}
          pointerEvents="none"
        >
          <Text style={[styles.envBannerName, { color: gameState.mapTheme.accentColor }]}>
            {gameState.environmentId.replace(/_/g, ' ').toUpperCase()}
          </Text>
          <Text style={styles.envBannerSub}>Proving Ground Active</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  joystickLeft: { position: 'absolute', bottom: 30, left: 30 },
  joystickRight: { position: 'absolute', bottom: 50, right: 160 },
  minimapOverlay: { position: 'absolute', top: 50, right: 10 },
  crosshairOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairH: {
    position: 'absolute',
    width: 20,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  crosshairV: {
    position: 'absolute',
    width: 1.5,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  crosshairDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  hitMarkerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hitMarkerLineH: {
    position: 'absolute',
    width: 24,
    height: 2,
    backgroundColor: '#ff3333',
  },
  hitMarkerLineV: {
    position: 'absolute',
    width: 2,
    height: 24,
    backgroundColor: '#ff3333',
  },
  pickupFeedbackContainer: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    alignItems: 'flex-start',
    gap: 3,
  },
  pickupFlash: {
    color: '#aaffcc',
    fontSize: 13,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 1,
  },
  eliminationBanner: {
    position: 'absolute',
    top: '18%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.7)',
  },
  eliminationText: {
    color: '#ff8888',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  streakBanner: {
    position: 'absolute',
    top: '22%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,150,0,0.88)',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffdd00',
  },
  streakText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 3,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  damageNumber: {
    position: 'absolute',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 40,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  envBanner: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.78)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  envBannerName: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 4,
  },
  envBannerSub: {
    fontSize: 11,
    color: '#666',
    letterSpacing: 2,
  },
});
