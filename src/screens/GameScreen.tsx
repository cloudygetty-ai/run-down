import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GameMap } from '../components/GameMap';
import { HUD } from '../components/HUD';
import { Joystick } from '../components/Joystick';
import { useGameStore } from '../services/state';
import { tickGame, fireShot, InputState } from '../core/gameEngine';
import { tickBots } from '../services/ai';
import { startReload, switchWeaponSlot } from '../services/weapons';
import { BuildPiece, Player, Vector2 } from '../types';
import { distance } from '../utils';
import { logger } from '../utils';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TICK_MS = 50;
const LOOT_PICKUP_RANGE = 60;
const VIEWPORT_W = SCREEN_W;
const VIEWPORT_H = SCREEN_H;

type Props = {
  onGameOver: () => void;
};

export const GameScreen: React.FC<Props> = ({ onGameOver }) => {
  const { gameState, updateGameState } = useGameStore();
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
        let next = tickGame(state, inputRef.current, TICK_MS);
        next = tickBots(next, TICK_MS);

        if (next.phase === 'game_over') {
          update(next);
          onGameOverRef.current();
          return;
        }

        // Auto-pickup loot for human — use store action directly (atomic)
        const h = next.players.find((p) => p.isHuman);
        if (h) {
          const nearby = next.lootDrops.find(
            (l) => distance(l.position, h.position) < LOOT_PICKUP_RANGE
          );
          if (nearby) {
            update(next); // commit movement first
            pickUpLoot(h.id, nearby.id); // then pick up
            return;
          }
        }

        update(next);
      } catch (err) {
        logger.error('GameScreen', 'game tick error', err);
      }
    }, TICK_MS);

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: interval reads state via getState() each tick

  const handleMove = useCallback((direction: Vector2) => {
    inputRef.current = { ...inputRef.current, moveVector: direction };
  }, []);

  const handleMoveRelease = useCallback(() => {
    inputRef.current = { ...inputRef.current, moveVector: { x: 0, y: 0 } };
  }, []);

  const handleShoot = useCallback(() => {
    // WHY: read fresh state — this handler may be called many frames after render
    const { gameState: state, updateGameState: update } = useGameStore.getState();
    const h = state.players.find((p) => p.isHuman);
    if (!h || h.status !== 'alive') return;

    const weapon = h.weapons[h.activeWeaponSlot];
    if (!weapon || weapon.isReloading || weapon.currentAmmo <= 0) return;

    const now = Date.now();
    const minInterval = 1000 / weapon.fireRate;
    if (now - lastFireTimeRef.current < minInterval) return;
    lastFireTimeRef.current = now;

    const enemies = state.players.filter((p) => !p.isHuman && p.status === 'alive');
    const target = enemies.reduce<Player | null>((best, e) => {
      if (!best) return e;
      return distance(e.position, h.position) < distance(best.position, h.position) ? e : best;
    }, null);

    const aimPoint = target
      ? target.position
      : {
          x: h.position.x + Math.cos((h.rotation * Math.PI) / 180) * weapon.range,
          y: h.position.y + Math.sin((h.rotation * Math.PI) / 180) * weapon.range,
        };

    update(fireShot(state, h.id, aimPoint));
  }, []);

  const handleReload = useCallback(() => {
    const { gameState: state, updateGameState: update } = useGameStore.getState();
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
      players: state.players.map((p) =>
        p.id === h.id ? { ...p, isBuilding: !p.isBuilding } : p
      ),
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

      <View style={styles.joystickRight}>
        <Joystick
          onMove={(v) => { inputRef.current = { ...inputRef.current, aimVector: v }; }}
          onRelease={() => {}}
          size={100}
        />
      </View>

      <HUD
        player={human}
        bombardment={gameState.bombardment}
        alivePlayers={gameState.alivePlayers}
        onShoot={human.isBuilding ? handlePlaceBuild : handleShoot}
        onReload={handleReload}
        onBuildToggle={handleBuildToggle}
        onWeaponSwitch={handleWeaponSwitch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  joystickLeft: { position: 'absolute', bottom: 30, left: 30 },
  joystickRight: { position: 'absolute', bottom: 50, right: 160 },
});
