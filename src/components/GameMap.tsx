import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { GameState } from '../types';
import { PlayerSprite } from './PlayerSprite';
import { MeteorZoneOverlay } from './MeteorZoneOverlay';
import { BuildPieceView } from './BuildPieceView';
import { LootDropView } from './LootDropView';
import { SupplyDropView } from './SupplyDropView';

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

      {/* Loot */}
      {visibleLoot.map((l) => (
        <LootDropView key={l.id} loot={l} viewportX={viewportX} viewportY={viewportY} />
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
