import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { PresenceUser, RevealPulseState } from '../types';
import { SilhouettePin } from './SilhouettePin';
import { RevealPulseLayer } from './RevealPulseLayer';
import { VibeMatchGlow } from './VibeMatchGlow';

type Props = {
  users: PresenceUser[];
  revealPulse: RevealPulseState;
  viewportX: number;   // top-left world coordinate (x)
  viewportY: number;   // top-left world coordinate (y)
  viewportW: number;   // rendered width in pixels
  viewportH: number;   // rendered height in pixels
  vibeMatchUserId: string | null;
};

// All world positions are translated by (viewportX, viewportY) identically to GameMap.
// The shadowOffset intentionally obscures the user's exact position by 20–50 units.
export const AmbientPresenceMap: React.FC<Props> = ({
  users,
  revealPulse,
  viewportX,
  viewportY,
  viewportW,
  viewportH,
  vibeMatchUserId,
}) => {
  // Cull users whose *shadow* position is off-screen (with a 60-unit margin for labels)
  const visible = useMemo(() => {
    const pad = 60;
    return users.filter((u) => {
      const sx = u.position.x + u.shadowOffset.x;
      const sy = u.position.y + u.shadowOffset.y;
      return (
        sx >= viewportX - pad &&
        sx <= viewportX + viewportW + pad &&
        sy >= viewportY - pad &&
        sy <= viewportY + viewportH + pad
      );
    });
  }, [users, viewportX, viewportY, viewportW, viewportH]);

  return (
    <View style={[styles.container, { width: viewportW, height: viewportH }]}>
      <View style={styles.ground} />

      <RevealPulseLayer
        isActive={revealPulse.isActive}
        width={viewportW}
        height={viewportH}
      />

      {visible.map((u) => {
        const sx = u.position.x + u.shadowOffset.x - viewportX;
        const sy = u.position.y + u.shadowOffset.y - viewportY;
        return (
          <React.Fragment key={u.id}>
            {/* Glow layer renders beneath the silhouette */}
            {u.id === vibeMatchUserId && (
              <VibeMatchGlow screenX={sx} screenY={sy} />
            )}
            <SilhouettePin
              user={u}
              screenX={sx}
              screenY={sy}
              isVibeMatch={u.id === vibeMatchUserId}
            />
          </React.Fragment>
        );
      })}
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
    // Deep noir map base — near-black with a faint blue-purple cast
    backgroundColor: '#0A0810',
  },
});
