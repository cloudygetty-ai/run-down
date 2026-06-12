import { useMapStore } from '../../store/map.store';
import { useChatStore } from '../../store/chat.store';
import { scheduleAutoMatch } from '../../services/mock.service';
import { formatDistance, GRADIENTS } from '../../services/geo';
import type { NearbyUser } from '../../types';

const TRIBE_LABEL: Record<string, string> = {
  jock: 'JOCK', bear: 'BEAR', otter: 'OTTER', twink: 'TWINK',
  daddy: 'DADDY', masc: 'MASC', femme: 'FEMME', other: 'OTHER',
};

function AvatarBlock({ user, revealed }: { user: NearbyUser; revealed: boolean }) {
  const gradient = GRADIENTS[user.profile?.gradientId ?? (parseInt(user.id.replace('user-', ''), 10) % 8)];
  return (
    <div style={{
      width: '80px',
      height: '80px',
      borderRadius: '8px',
      background: gradient,
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative',
    }}
    className={revealed ? 'photo-revealed' : 'photo-hidden'}
    >
      {/* Abstract silhouette when hidden */}
      {!revealed && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          filter: 'blur(4px)',
        }}>
          👤
        </div>
      )}
      {revealed && user.profile && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
        }}>
          {['😎','🔥','👀','✨','💫','⚡','🎯','🌟'][user.profile.gradientId]}
        </div>
      )}
    </div>
  );
}

export function UserCard() {
  const nearbyUsers = useMapStore((s) => s.nearbyUsers);
  const selectedId = useMapStore((s) => s.selectedUserId);
  const selectUser = useMapStore((s) => s.selectUser);
  const expressInterest = useMapStore((s) => s.expressInterest);
  const openConversation = useChatStore((s) => s.openConversation);

  const user = selectedId ? nearbyUsers[selectedId] : null;
  const isOpen = user !== null;
  const revealed = user?.revealStatus === 'matched';
  const liked = user?.revealStatus === 'liked';

  function handleInterest() {
    if (!user) return;
    expressInterest(user.id);
    scheduleAutoMatch(user.id);
  }

  function handleMessage() {
    if (!user?.profile) return;
    openConversation(user.id, user.profile);
    selectUser(null);
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '64px',
      left: '50%',
      transform: isOpen ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(110%)',
      transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
      width: 'min(400px, calc(100vw - 32px))',
      background: 'rgba(18,15,30,0.97)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid ${revealed ? 'rgba(201,168,76,0.3)' : liked ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.15)'}`,
      borderRadius: '12px 12px 0 0',
      padding: '16px',
      zIndex: 95,
    }}>
      {user && (
        <>
          {/* Match banner */}
          {revealed && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(139,92,246,0.15))',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '4px',
              padding: '6px 10px',
              fontSize: '11px',
              color: '#C9A84C',
              letterSpacing: '0.15em',
              textAlign: 'center' as const,
              marginBottom: '12px',
            }}>
              ✦ MATCHED — Profile Revealed
            </div>
          )}

          {/* Main card */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <AvatarBlock user={user} revealed={revealed} />

            <div style={{ flex: 1, minWidth: 0 }}>
              {revealed && user.profile ? (
                <>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '18px',
                    color: 'var(--cream)',
                    letterSpacing: '0.05em',
                    marginBottom: '3px',
                  }}>
                    {user.profile.displayName}, {user.profile.age}
                    {user.profile.verified && (
                      <span style={{ color: '#4ECDC4', fontSize: '12px', marginLeft: '4px' }}>✓</span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    marginBottom: '6px',
                    flexWrap: 'wrap' as const,
                  }}>
                    <span style={{
                      fontSize: '9px',
                      letterSpacing: '0.15em',
                      background: 'rgba(139,92,246,0.15)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      color: '#8B5CF6',
                      padding: '2px 7px',
                      borderRadius: '2px',
                    }}>
                      {TRIBE_LABEL[user.profile.tribe]}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {user.profile.height}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                    {user.profile.bio}
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '15px',
                    color: liked ? '#8B5CF6' : 'var(--cream)',
                    marginBottom: '4px',
                  }}>
                    {liked ? 'Interest Sent...' : 'Someone Nearby'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>
                    {formatDistance(user.distanceFt)} away
                  </div>
                  <div style={{
                    width: '100%',
                    height: '3px',
                    background: 'var(--obsidian-4)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.round(user.pulseIntensity * 100)}%`,
                      background: 'linear-gradient(90deg, #4C2A9C, #8B5CF6)',
                      borderRadius: '2px',
                    }} />
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '3px', letterSpacing: '0.1em' }}>
                    PULSE INTENSITY
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => selectUser(null)}
              style={{
                background: 'none',
                border: '1px solid var(--muted-2)',
                borderRadius: '4px',
                color: 'var(--muted)',
                width: '26px',
                height: '26px',
                cursor: 'pointer',
                fontSize: '11px',
                flexShrink: 0,
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {/* CTA */}
          {revealed ? (
            <button
              onClick={handleMessage}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #8B5CF6, #C9A84C)',
                border: 'none',
                borderRadius: '6px',
                color: '#09080F',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '12px',
                letterSpacing: '0.2em',
                cursor: 'pointer',
                textTransform: 'uppercase' as const,
              }}
            >
              MESSAGE {user.profile?.displayName?.toUpperCase()}
            </button>
          ) : liked ? (
            <div style={{
              textAlign: 'center' as const,
              padding: '12px',
              fontSize: '11px',
              color: '#8B5CF6',
              letterSpacing: '0.15em',
              background: 'rgba(139,92,246,0.08)',
              borderRadius: '6px',
              border: '1px solid rgba(139,92,246,0.2)',
            }}>
              ◉ Waiting for them to match back...
            </div>
          ) : (
            <button
              onClick={handleInterest}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: '6px',
                color: '#8B5CF6',
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                letterSpacing: '0.2em',
                cursor: 'pointer',
                textTransform: 'uppercase' as const,
              }}
            >
              Express Interest
            </button>
          )}
        </>
      )}
    </div>
  );
}
