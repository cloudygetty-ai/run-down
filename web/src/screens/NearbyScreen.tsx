import { useMapStore } from '../store/map.store';
import { useChatStore } from '../store/chat.store';
import { scheduleAutoMatch } from '../services/mock.service';
import { formatDistance } from '../services/geo';
import { MediaBlock } from '../components/UI/MediaBlock';
import type { NearbyUser } from '../types';

function gradientIdx(user: NearbyUser): number {
  return parseInt(user.id.replace('user-', ''), 10) % 8;
}

function NearbyCard({ user, onMessage }: { user: NearbyUser; onMessage: () => void }) {
  const expressInterest = useMapStore((s) => s.expressInterest);
  const revealed = user.revealStatus === 'matched';
  const liked = user.revealStatus === 'liked';

  return (
    <div style={{
      background: 'var(--obsidian-2)',
      border: `1px solid ${revealed ? 'rgba(201,168,76,0.3)' : liked ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.08)'}`,
      borderRadius: '8px',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'border-color 0.2s ease',
    }}>
      {/* Media */}
      <div style={{ position: 'relative' }}>
        <MediaBlock
          profile={user.profile}
          gradientId={gradientIdx(user)}
          revealed={revealed}
          width="100%"
          height={130}
          borderRadius="0"
          iconSize="40px"
        />
        {revealed && (
          <div style={{
            position: 'absolute', top: '6px', right: '6px',
            background: 'rgba(201,168,76,0.9)', color: '#09080F',
            fontSize: '8px', padding: '2px 6px', borderRadius: '2px',
            letterSpacing: '0.1em', fontWeight: 700, zIndex: 4,
          }}>MATCH</div>
        )}
        {liked && !revealed && (
          <div style={{
            position: 'absolute', top: '6px', right: '6px',
            background: 'rgba(139,92,246,0.9)', color: '#fff',
            fontSize: '8px', padding: '2px 6px', borderRadius: '2px',
            letterSpacing: '0.1em', zIndex: 4,
          }}>SENT</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: revealed ? '13px' : '11px',
            color: revealed ? 'var(--cream)' : 'var(--muted)',
          }}>
            {revealed && user.profile ? `${user.profile.displayName}, ${user.profile.age}` : 'Anonymous'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
            {formatDistance(user.distanceFt)}
          </div>
        </div>

        {revealed && user.profile && (
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', lineHeight: 1.4 }}>
            {user.profile.lookingFor}
          </div>
        )}

        {/* Pulse bar */}
        <div style={{ height: '2px', background: 'var(--obsidian-4)', borderRadius: '1px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{
            height: '100%',
            width: `${Math.round(user.pulseIntensity * 100)}%`,
            background: 'linear-gradient(90deg, #4C2A9C, #8B5CF6)',
          }} />
        </div>

        {revealed ? (
          <button
            onClick={(e) => { e.stopPropagation(); onMessage(); }}
            style={{
              width: '100%', padding: '7px',
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.4)',
              borderRadius: '4px',
              color: '#8B5CF6', fontSize: '10px',
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              letterSpacing: '0.15em',
            }}
          >
            MESSAGE
          </button>
        ) : liked ? (
          <div style={{ fontSize: '9px', color: '#8B5CF6', letterSpacing: '0.1em', textAlign: 'center' as const }}>
            Waiting...
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              expressInterest(user.id);
              scheduleAutoMatch(user.id);
            }}
            style={{
              width: '100%', padding: '7px',
              background: 'none',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '4px',
              color: 'var(--muted)', fontSize: '10px',
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              letterSpacing: '0.12em',
            }}
          >
            INTERESTED
          </button>
        )}
      </div>
    </div>
  );
}

export function NearbyScreen() {
  const nearbyUsers = useMapStore((s) => s.nearbyUsers);
  const openConversation = useChatStore((s) => s.openConversation);

  const sorted = Object.values(nearbyUsers).sort((a, b) => {
    if (a.revealStatus === 'matched' && b.revealStatus !== 'matched') return -1;
    if (b.revealStatus === 'matched' && a.revealStatus !== 'matched') return 1;
    return a.distanceFt - b.distanceFt;
  });

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'var(--obsidian)',
      overflowY: 'auto',
      paddingTop: '52px', paddingBottom: '64px',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(139,92,246,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'var(--muted)' }}>
          {sorted.length} NEARBY
        </div>
        <div style={{ fontSize: '10px', letterSpacing: '0.15em', color: '#8B5CF6' }}>
          {sorted.filter((u) => u.revealStatus === 'matched').length} MATCHED
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '8px',
        padding: '12px',
      }}>
        {sorted.map((u) => (
          <NearbyCard
            key={u.id}
            user={u}
            onMessage={() => {
              if (u.profile) openConversation(u.id, u.profile);
            }}
          />
        ))}
      </div>
    </div>
  );
}
