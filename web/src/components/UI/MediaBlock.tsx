import { GRADIENTS } from '../../services/geo';
import type { UserProfile } from '../../types';

type Props = {
  profile: UserProfile | null;
  gradientId: number;
  revealed: boolean;
  width?: number | string;
  height?: number | string;
  borderRadius?: string;
  iconSize?: string;
};

const AVATAR_ICONS = ['😎','🔥','👀','✨','💫','⚡','🎯','🌟'];

export function MediaBlock({
  profile,
  gradientId,
  revealed,
  width = 80,
  height = 80,
  borderRadius = '8px',
  iconSize,
}: Props) {
  const gid = (profile?.gradientId ?? gradientId) % GRADIENTS.length;
  const gradient = GRADIENTS[gid];
  const hasVideo = revealed && (profile?.hasVideo ?? false);
  const hasPhoto = revealed && !!profile?.photoUrl;
  const defaultIconSize = typeof width === 'number' ? `${Math.round(width * 0.45)}px` : '36px';

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: gradient,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
      }}
      className={[
        revealed ? 'photo-revealed' : 'photo-hidden',
        hasVideo ? 'media-video-sim media-scanline' : '',
      ].filter(Boolean).join(' ')}
    >
      {hasVideo && <div className="media-rec-badge">REC</div>}
      {hasPhoto && <div className="media-cam-badge">📷</div>}

      {!revealed ? (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: iconSize ?? defaultIconSize,
          filter: 'blur(4px)',
        }}>
          👤
        </div>
      ) : (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: iconSize ?? defaultIconSize,
        }}>
          {AVATAR_ICONS[gid % AVATAR_ICONS.length]}
        </div>
      )}
    </div>
  );
}
