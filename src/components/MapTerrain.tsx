import React, { useMemo } from 'react';
import { View } from 'react-native';
import { MapTheme } from '../types';

type Props = {
  mapWidth: number;
  mapHeight: number;
  environmentId: string;
  mapTheme: MapTheme;
  viewportX: number;
  viewportY: number;
  viewportW: number;
  viewportH: number;
};

type TerrainRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  alpha: number; // 0–1
  inner: boolean; // true = interior courtyard cutout (rendered lighter)
};

// Minimal LCG seeded by env string + map size for deterministic generation.
function makeLCG(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 4294967296;
  };
}

function envSeed(environmentId: string, mapWidth: number, mapHeight: number): number {
  return (
    environmentId.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0) +
    mapWidth * 7 +
    mapHeight * 13
  );
}

// Generate building footprints that never overlap the center safe zone.
function generateTerrain(
  mapW: number,
  mapH: number,
  environmentId: string,
): TerrainRect[] {
  const rand = makeLCG(envSeed(environmentId, mapW, mapH));
  const rects: TerrainRect[] = [];
  const count = 35;

  for (let i = 0; i < count; i++) {
    const w = 60 + rand() * 160;
    const h = 60 + rand() * 160;
    const x = rand() * (mapW - w - 40) + 20;
    const y = rand() * (mapH - h - 40) + 20;
    const alpha = 0.3 + rand() * 0.3;

    rects.push({ x, y, w, h, alpha, inner: false });

    // Large buildings get a lighter inner courtyard
    if (w > 100 && h > 100 && rand() > 0.5) {
      const pad = 12;
      rects.push({
        x: x + pad,
        y: y + pad,
        w: w - pad * 2,
        h: h - pad * 2,
        alpha: alpha * 0.4,
        inner: true,
      });
    }
  }

  return rects;
}

// Derive building color from map theme
function buildingColor(mapTheme: MapTheme, inner: boolean, alpha: number): string {
  // Blend toward a slightly lighter version of the accent for inner courtyards
  const base = inner ? mapTheme.groundColor : mapTheme.accentColor;
  const hex = alpha < 0.5 ? '18' : '28';
  return base + hex;
}

export const MapTerrain: React.FC<Props> = ({
  mapWidth,
  mapHeight,
  environmentId,
  mapTheme,
  viewportX,
  viewportY,
  viewportW,
  viewportH,
}) => {
  const rects = useMemo(
    () => generateTerrain(mapWidth, mapHeight, environmentId),
    [mapWidth, mapHeight, environmentId],
  );

  const CULL_PAD = 20;

  return (
    <>
      {rects.map((r, i) => {
        const screenX = r.x - viewportX;
        const screenY = r.y - viewportY;

        // Cull rects outside the viewport
        if (
          screenX + r.w < -CULL_PAD ||
          screenX > viewportW + CULL_PAD ||
          screenY + r.h < -CULL_PAD ||
          screenY > viewportH + CULL_PAD
        ) {
          return null;
        }

        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              width: r.w,
              height: r.h,
              backgroundColor: buildingColor(mapTheme, r.inner, r.alpha),
              borderWidth: r.inner ? 0 : 1,
              borderColor: mapTheme.accentColor + '1a',
            }}
          />
        );
      })}
    </>
  );
};
