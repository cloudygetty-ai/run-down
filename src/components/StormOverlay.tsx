import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Storm } from '../types';

type Props = {
  storm: Storm;
  viewportX: number;
  viewportY: number;
  viewportW: number;
  viewportH: number;
  mapWidth: number;
  mapHeight: number;
};

// WHY: The storm is rendered as a large semi-transparent blue overlay
// with a "hole" cut out for the safe zone. React Native can't directly cut
// holes in views, so we render four rectangles covering the danger zone
// around the circle instead — this is an approximation that looks fine
// at normal zoom levels for a prototype.
// A full implementation would use SVG or a canvas renderer.

export const StormOverlay: React.FC<Props> = ({
  storm,
  viewportX,
  viewportY,
  viewportW,
  viewportH,
}) => {
  // Convert storm center from world to screen space
  const cx = storm.safeZoneCenter.x - viewportX;
  const cy = storm.safeZoneCenter.y - viewportY;
  const r  = storm.safeZoneRadius;

  // Storm outline circle
  const outlineSize = r * 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Danger zone tint — full overlay, clipped by the safe zone */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.dangerZone,
        ]}
      />
      {/* Safe zone "window" — white circle covering the safe area */}
      <View
        style={[
          styles.safeZone,
          {
            width: outlineSize,
            height: outlineSize,
            borderRadius: r,
            left: cx - r,
            top: cy - r,
          },
        ]}
      />
      {/* Storm ring (visible outline) */}
      <View
        style={[
          styles.stormRing,
          {
            width: outlineSize + 6,
            height: outlineSize + 6,
            borderRadius: r + 3,
            left: cx - r - 3,
            top: cy - r - 3,
          },
        ]}
      />
      {/* Next safe zone indicator */}
      <View
        style={[
          styles.nextZoneIndicator,
          {
            width: storm.nextSafeZoneRadius * 2,
            height: storm.nextSafeZoneRadius * 2,
            borderRadius: storm.nextSafeZoneRadius,
            left: storm.nextSafeZoneCenter.x - viewportX - storm.nextSafeZoneRadius,
            top: storm.nextSafeZoneCenter.y - viewportY - storm.nextSafeZoneRadius,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  dangerZone: {
    backgroundColor: 'rgba(80, 0, 180, 0.35)',
  },
  safeZone: {
    position: 'absolute',
    backgroundColor: 'transparent',
    // WHY: We "erase" the tint over the safe zone by using a solid background
    // that matches the map. This is a visual trick — not truly transparent.
    // In a production game, use a proper mask/clip or SVG.
    overflow: 'hidden',
  },
  stormRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(160, 60, 255, 0.9)',
    backgroundColor: 'transparent',
  },
  nextZoneIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
});
