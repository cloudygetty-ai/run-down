import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Player, Bombardment, SupplyDrop, IncomingMeteor, MapTheme, HelixRelay, FractureCore } from '../types';

const CORE_MINI_COLORS: Record<string, string> = {
  cooldown_reduction: '#4488ff',
  damage_amp:         '#ff4433',
  ability_mutation:   '#cc44ff',
};

type Props = {
  players: Player[];
  bombardment: Bombardment;
  supplyDrops: SupplyDrop[];
  incomingMeteors: IncomingMeteor[];
  helixRelays: HelixRelay[];
  fractureCores: FractureCore[];
  mapWidth: number;
  mapHeight: number;
  mapTheme: MapTheme;
};

const SIZE = 130; // minimap square side length in pts

export const Minimap: React.FC<Props> = ({
  players,
  bombardment,
  supplyDrops,
  incomingMeteors,
  helixRelays,
  fractureCores,
  mapWidth,
  mapHeight,
  mapTheme,
}) => {
  const scaleX = SIZE / mapWidth;
  const scaleY = SIZE / mapHeight;

  const toMini = (wx: number, wy: number) => ({
    x: wx * scaleX,
    y: wy * scaleY,
  });

  const shelterCx = bombardment.shelterCenter.x * scaleX;
  const shelterCy = bombardment.shelterCenter.y * scaleY;
  const shelterR = Math.max(2, bombardment.shelterRadius * scaleX);

  const nextCx = bombardment.nextShelterCenter.x * scaleX;
  const nextCy = bombardment.nextShelterCenter.y * scaleY;
  const nextR = Math.max(2, bombardment.nextShelterRadius * scaleX);

  return (
    <View
      style={[styles.container, { borderColor: mapTheme.accentColor + '44', backgroundColor: mapTheme.bgColor + 'aa' }]}
      pointerEvents="none"
    >
      {/* Next shelter zone (dashed look — just a dim ring) */}
      <View
        style={{
          position: 'absolute',
          left: nextCx - nextR,
          top: nextCy - nextR,
          width: nextR * 2,
          height: nextR * 2,
          borderRadius: nextR,
          borderWidth: 1,
          borderColor: 'rgba(255, 200, 100, 0.35)',
        }}
      />

      {/* Current shelter zone ring */}
      <View
        style={{
          position: 'absolute',
          left: shelterCx - shelterR,
          top: shelterCy - shelterR,
          width: shelterR * 2,
          height: shelterR * 2,
          borderRadius: shelterR,
          borderWidth: 1.5,
          borderColor: 'rgba(255, 120, 0, 0.9)',
        }}
      />

      {/* Fracture Cores — tiny colored circles */}
      {fractureCores.map((core) => {
        const { x, y } = toMini(core.position.x, core.position.y);
        const color = CORE_MINI_COLORS[core.effect] ?? '#ffffff';
        return (
          <View
            key={core.id}
            style={{
              position: 'absolute',
              left: x - 3,
              top: y - 3,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: color,
              opacity: 0.85,
            }}
          />
        );
      })}

      {/* Incoming meteors — red dots */}
      {incomingMeteors.map((m) => {
        const { x, y } = toMini(m.position.x, m.position.y);
        return (
          <View
            key={m.id}
            style={{
              position: 'absolute',
              left: x - 2,
              top: y - 2,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 60, 0, 0.9)',
            }}
          />
        );
      })}

      {/* Helix Relays — diamond shapes, filled when captured */}
      {helixRelays.map((relay) => {
        const { x, y } = toMini(relay.position.x, relay.position.y);
        const captured = relay.captureProgress >= 1;
        const partial  = relay.captureProgress > 0 && relay.captureProgress < 1;
        return (
          <View
            key={relay.id}
            style={{
              position: 'absolute',
              left: x - 4,
              top: y - 4,
              width: 8,
              height: 8,
              borderRadius: 1,
              transform: [{ rotate: '45deg' }],
              backgroundColor: captured
                ? 'rgba(200,255,100,0.9)'
                : partial
                ? 'rgba(100,200,80,0.7)'
                : 'rgba(0,0,0,0)',
              borderWidth: 1,
              borderColor: captured ? 'rgba(200,255,100,0.9)' : 'rgba(100,200,80,0.5)',
            }}
          />
        );
      })}

      {/* Supply drops */}
      {supplyDrops.map((drop) => {
        const { x, y } = toMini(drop.position.x, drop.position.y);
        return (
          <View
            key={drop.id}
            style={{
              position: 'absolute',
              left: x - 3,
              top: y - 3,
              width: 6,
              height: 6,
              borderRadius: 1,
              backgroundColor: drop.isLanded ? '#ffaa00' : 'rgba(255,220,0,0.6)',
              borderWidth: 0.5,
              borderColor: '#fff',
            }}
          />
        );
      })}

      {/* Bot dots */}
      {players
        .filter((p) => !p.isHuman && p.status === 'alive')
        .map((p) => {
          const { x, y } = toMini(p.position.x, p.position.y);
          return (
            <View
              key={p.id}
              style={{
                position: 'absolute',
                left: x - 2,
                top: y - 2,
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#ff4444',
              }}
            />
          );
        })}

      {/* Human player dot */}
      {players
        .filter((p) => p.isHuman)
        .map((p) => {
          const { x, y } = toMini(p.position.x, p.position.y);
          return (
            <View
              key={p.id}
              style={{
                position: 'absolute',
                left: x - 4,
                top: y - 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#00ccff',
                borderWidth: 1,
                borderColor: '#fff',
              }}
            />
          );
        })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
