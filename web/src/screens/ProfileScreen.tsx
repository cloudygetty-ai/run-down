import { useUserStore } from '../store/user.store';
import { useMapStore } from '../store/map.store';
import { useChatStore } from '../store/chat.store';
import { MediaBlock } from '../components/UI/MediaBlock';

export function ProfileScreen() {
  const { profile, mode, setMode, checkedInSpotId, checkOut } = useUserStore();
  const spots = useMapStore((s) => s.spots);
  const conversations = useChatStore((s) => s.conversations);
  const matchCount = Object.values(useMapStore.getState().nearbyUsers)
    .filter((u) => u.revealStatus === 'matched').length;

  const checkedInSpot = spots.find((s) => s.id === checkedInSpotId);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'var(--obsidian)',
      overflowY: 'auto', paddingTop: '52px', paddingBottom: '64px',
    }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(139,92,246,0.1) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(139,92,246,0.1)',
        padding: '20px 20px 0',
      }}>
        {/* Video-primary display */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <MediaBlock
            profile={profile}
            gradientId={profile.gradientId}
            revealed={true}
            width="100%"
            height={220}
            borderRadius="8px"
            iconSize="56px"
          />
          {/* Name / info overlay at bottom */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(9,8,15,0.92) 0%, transparent 100%)',
            padding: '32px 14px 12px',
            borderRadius: '0 0 8px 8px',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '20px',
              color: 'var(--cream)', letterSpacing: '0.05em', marginBottom: '2px',
            }}>
              {profile.displayName}
              {profile.verified && <span style={{ color: '#4ECDC4', fontSize: '13px', marginLeft: '6px' }}>✓</span>}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {profile.age} · {profile.height} · {profile.tribe.charAt(0).toUpperCase() + profile.tribe.slice(1)}
            </div>
          </div>
          {/* Mode badge top-right */}
          {mode === 'active' && (
            <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 4 }}>
              <span style={{
                fontSize: '9px', letterSpacing: '0.15em',
                background: 'rgba(139,92,246,0.85)',
                border: '1px solid rgba(139,92,246,0.6)',
                color: '#fff', padding: '3px 9px', borderRadius: '2px',
              }}>● CRUISING</span>
            </div>
          )}
        </div>

        {/* Photo strip */}
        <div className="photo-strip" style={{ marginBottom: '8px' }}>
          {/* Gradient thumbnail representing the video as a still */}
          <div className="photo-strip-thumb" style={{
            background: 'linear-gradient(135deg, #8B5CF6 0%, #C9A84C 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px',
          }}>
            ▶
          </div>
          {profile.photoUrl ? (
            <div className="photo-strip-thumb">
              <img src={profile.photoUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : null}
          <div className="photo-strip-add" title="Add Photo">+</div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setMode(mode === 'active' ? 'offline' : 'active')}
            style={{
              flex: 1, fontSize: '9px', letterSpacing: '0.15em',
              background: mode === 'active' ? 'rgba(139,92,246,0.2)' : 'rgba(61,42,110,0.3)',
              border: `1px solid ${mode === 'active' ? 'rgba(139,92,246,0.5)' : 'rgba(61,42,110,0.4)'}`,
              color: mode === 'active' ? '#8B5CF6' : 'var(--muted)',
              padding: '8px', borderRadius: '4px', cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {mode === 'active' ? '● CRUISING' : '○ OFFLINE'}
          </button>
          <button style={{
            flex: 1, fontSize: '9px', letterSpacing: '0.15em',
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.25)',
            color: '#C9A84C', padding: '8px', borderRadius: '4px',
            cursor: 'pointer', fontFamily: 'var(--font-ui)',
          }}>
            ▶ CHANGE VIDEO
          </button>
          <button style={{
            fontSize: '9px', letterSpacing: '0.15em',
            background: 'rgba(78,205,196,0.08)',
            border: '1px solid rgba(78,205,196,0.2)',
            color: '#4ECDC4', padding: '8px 12px', borderRadius: '4px',
            cursor: 'pointer', fontFamily: 'var(--font-ui)',
          }}>
            + PHOTO
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px', background: 'rgba(139,92,246,0.1)',
          borderRadius: '6px', overflow: 'hidden', marginBottom: '16px',
        }}>
          {[
            { label: 'Matches', value: matchCount,                         color: '#C9A84C'  },
            { label: 'Chats',   value: Object.keys(conversations).length,  color: 'var(--cream)' },
            { label: 'Status',  value: mode === 'active' ? 'ACTIVE' : 'OFFLINE', color: mode === 'active' ? '#4ECDC4' : 'var(--muted)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(18,15,30,0.8)', padding: '14px 8px', textAlign: 'center' as const }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: typeof value === 'string' ? '11px' : '20px', color, lineHeight: 1, marginBottom: '4px' }}>
                {value}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.15em' }}>{label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Checked-in spot */}
      {checkedInSpot && (
        <div style={{
          margin: '16px 20px',
          padding: '12px 14px',
          background: 'rgba(78,205,196,0.08)',
          border: '1px solid rgba(78,205,196,0.25)',
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '9px', color: '#4ECDC4', letterSpacing: '0.2em', marginBottom: '3px' }}>CHECKED IN</div>
            <div style={{ fontSize: '13px', color: 'var(--cream)', fontFamily: 'var(--font-display)' }}>
              {checkedInSpot.name}
            </div>
          </div>
          <button onClick={checkOut} style={{
            background: 'none', border: '1px solid rgba(78,205,196,0.3)', borderRadius: '3px',
            color: '#4ECDC4', padding: '5px 10px', fontSize: '9px',
            cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '0.12em',
          }}>
            LEAVE
          </button>
        </div>
      )}

      {/* Bio */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'var(--muted)', marginBottom: '10px' }}>ABOUT</div>
        <p style={{ fontSize: '13px', color: 'var(--cream)', lineHeight: 1.6, marginBottom: '10px' }}>
          {profile.bio}
        </p>
        <div style={{
          display: 'inline-flex', gap: '6px', alignItems: 'center',
          background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: '4px', padding: '6px 10px',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Looking for:</span>
          <span style={{ fontSize: '11px', color: '#8B5CF6' }}>{profile.lookingFor}</span>
        </div>
      </div>

      {/* Settings placeholder */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'var(--muted)', marginBottom: '12px' }}>SETTINGS</div>
        {['Edit Profile', 'Privacy', 'Blocked Users', 'Sign Out'].map((item) => (
          <div key={item} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '13px 0', borderBottom: '1px solid rgba(139,92,246,0.06)',
            cursor: 'pointer',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--cream)' }}>{item}</span>
            <span style={{ fontSize: '14px', color: 'var(--muted)' }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
