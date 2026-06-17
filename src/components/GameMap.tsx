import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { GameState } from '../types';
import { PlayerSprite } from './PlayerSprite';
import { MeteorZoneOverlay } from './MeteorZoneOverlay';
import { BuildPieceView } from './BuildPieceView';
import { LootDropView } from './LootDropView';
import { SupplyDropView } from './SupplyDropView';
import { MapTerrain } from './MapTerrain';
import { FractureCoreView } from './FractureCoreView';
import { HelixRelayView } from './HelixRelayView';
import { DecoyView } from './DecoyView';

type Props = {
  state: GameState;
  viewportX: number; // top-left corner of the camera in world space
  viewportY: number;
  viewportW: number;
  viewportH: number;
};

// WHY: all world positions are translated by the camera offset so components
// just render at (worldX - viewportX, worldY - viewportY) without needing to
// know about the camera themselves.

export const GameMap: React.FC<Props> = ({ state, viewportX, viewportY, viewportW, viewportH }) => {
  const playersToRender = useMemo(
    () => state.players.filter((p) => p.status === 'alive' || p.status === 'knocked'),
    [state.players],
  );

  const visibleCores = useMemo(
    () =>
      state.fractureCores.filter(
        (c) =>
          c.position.x >= viewportX - 40 &&
          c.position.x <= viewportX + viewportW + 40 &&
          c.position.y >= viewportY - 40 &&
          c.position.y <= viewportY + viewportH + 40,
      ),
    [state.fractureCores, viewportX, viewportY, viewportW, viewportH],
  );

  const visibleLoot = useMemo(
    () =>
      state.lootDrops.filter(
        (l) =>
          l.position.x >= viewportX - 40 &&
          l.position.x <= viewportX + viewportW + 40 &&
          l.position.y >= viewportY - 40 &&
          l.position.y <= viewportY + viewportH + 40,
      ),
    [state.lootDrops, viewportX, viewportY, viewportW, viewportH],
  );

  const visiblePieces = useMemo(
    () =>
      state.buildPieces.filter(
        (bp) =>
          bp.position.x >= viewportX - 60 &&
          bp.position.x <= viewportX + viewportW + 60 &&
          bp.position.y >= viewportY - 60 &&
          bp.position.y <= viewportY + viewportH + 60,
      ),
    [state.buildPieces, viewportX, viewportY, viewportW, viewportH],
  );

  const { bgColor, groundColor } = state.mapTheme;

  return (
    <View style={[styles.container, { width: viewportW, height: viewportH, backgroundColor: bgColor }]}>
      {/* Ground fill */}
      <View style={[styles.ground, { backgroundColor: groundColor }]} />

      {/* Environment-themed terrain decorations (procedural, deterministic) */}
      <MapTerrain
        mapWidth={state.mapWidth}
        mapHeight={state.mapHeight}
        environmentId={state.environmentId}
        mapTheme={state.mapTheme}
        viewportX={viewportX}
        viewportY={viewportY}
        viewportW={viewportW}
        viewportH={viewportH}
      />

      {/* Gravity zones — purple pull-fields left by gravity meteors */}
      {state.gravityZones.map((z) => {
        const zx = z.position.x - viewportX;
        const zy = z.position.y - viewportY;
        const opacity = Math.max(0, 0.7 * (1 - z.age / z.maxAge));
        return (
          <View
            key={z.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: zx - z.radius,
              top: zy - z.radius,
              width: z.radius * 2,
              height: z.radius * 2,
              borderRadius: z.radius,
              borderWidth: 2,
              borderColor: `rgba(160,60,255,${opacity})`,
              backgroundColor: `rgba(80,0,180,${opacity * 0.18})`,
            }}
          />
        );
      })}

      {/* Time echo zones — cyan reality-distortion fields */}
      {state.timeEchoZones.map((z) => {
        const zx = z.position.x - viewportX;
        const zy = z.position.y - viewportY;
        const opacity = Math.max(0, 0.6 * (1 - z.age / z.maxAge));
        return (
          <View
            key={z.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: zx - z.radius,
              top: zy - z.radius,
              width: z.radius * 2,
              height: z.radius * 2,
              borderRadius: z.radius,
              borderWidth: 2,
              borderColor: `rgba(60,200,255,${opacity})`,
              backgroundColor: `rgba(0,100,200,${opacity * 0.15})`,
            }}
          />
        );
      })}

      {/* Meteor bombardment zone */}
      <MeteorZoneOverlay
        bombardment={state.bombardment}
        incomingMeteors={state.incomingMeteors}
        viewportX={viewportX}
        viewportY={viewportY}
        viewportW={viewportW}
        viewportH={viewportH}
      />

      {/* Build pieces */}
      {visiblePieces.map((bp) => (
        <BuildPieceView key={bp.id} piece={bp} viewportX={viewportX} viewportY={viewportY} />
      ))}

      {/* Supply drops */}
      {state.supplyDrops.map((drop) => (
        <SupplyDropView key={drop.id} drop={drop} viewportX={viewportX} viewportY={viewportY} />
      ))}

      {/* Helix Relays — capture rings on the ground */}
      {state.helixRelays.map((relay) => (
        <HelixRelayView key={relay.id} relay={relay} viewportX={viewportX} viewportY={viewportY} />
      ))}

      {/* Fracture Cores — dropped by explosive meteors */}
      {visibleCores.map((c) => (
        <FractureCoreView key={c.id} core={c} viewportX={viewportX} viewportY={viewportY} />
      ))}

      {/* Loot */}
      {visibleLoot.map((l) => (
        <LootDropView key={l.id} loot={l} viewportX={viewportX} viewportY={viewportY} />
      ))}

      {/* Build piece ghost — shows where the human's next piece will land */}
      {(() => {
        const human = state.players.find((p) => p.isHuman && p.status === 'alive' && p.isBuilding);
        if (!human) return null;
        const rad = (human.rotation * Math.PI) / 180;
        const gx = human.position.x + Math.cos(rad) * 60 - viewportX;
        const gy = human.position.y + Math.sin(rad) * 60 - viewportY;
        const rot = Math.round(human.rotation / 90) * 90;
        const isRamp = human.selectedBuildPiece === 'ramp';
        const MAT_GHOST: Record<string, string> = { wood: '#cc880044', stone: '#8899aa44', metal: '#aabbcc44' };
        return (
          <View
            style={{
              position: 'absolute',
              left: gx - 30,
              top: gy - (isRamp ? 15 : 30),
              width: 60,
              height: isRamp ? 30 : 60,
              borderRadius: 3,
              borderWidth: 2,
              borderColor: MAT_GHOST[human.selectedBuildMaterial] ?? '#ffffff44',
              backgroundColor: MAT_GHOST[human.selectedBuildMaterial] ?? '#ffffff22',
              transform: [{ rotate: `${rot}deg` }],
            }}
          />
        );
      })()}

      {/* Vex decoys — holographic echoes that fool bots */}
      {state.decoys.map((d) => (
        <DecoyView key={d.id} decoy={d} viewportX={viewportX} viewportY={viewportY} />
      ))}

      {/* Players (alive + knocked — knocked shown faded/downed) */}
      {playersToRender.map((p) => (
        <PlayerSprite key={p.id} player={p} viewportX={viewportX} viewportY={viewportY} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  ground: {
    ...StyleSheet.absoluteFillObject,
  },
});
