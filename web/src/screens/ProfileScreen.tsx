import { useUserStore } from '../store/user.store';
import { useMapStore } from '../store/map.store';
import { useChatStore } from '../store/chat.store';
import { GRADIENTS } from '../services/geo';

export function ProfileScreen() {
  const { profile, mode, setMode, checkedInSpotId, checkOut } = useUserStore();
  const spots = useMapStore((s) => s.spots);
  const conversations = useChatStore((s) => s.conversations);
  const matchCount = Object.values(useMapStore.getState().nearbyUsers)
    .filter((u) => u.revealStatus === 'matched').length;

  const checkedInSpot = spots.find((s) => s.id === checkedInSpotId);
  const gradient = GRADIENTS[profile.gradientId];

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
        padding: '24px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: gradient,
            border: `3px solid ${mode === 'active' ? '#8B5CF6' : '#3D2A6E'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px',
            boxShadow: mode === 'active' ? '0 0 20px rgba(139,92,246,0.4)' : 'none',
            transition: 'all 0.3s ease', flexShrink: 0,
          }}>
            😎
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--cream)', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {profile.displayName}
              {profile.verified && <span style={{ color: '#4ECDC4', fontSize: '13px', marginLeft: '6px' }}>✓</span>}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
              {profile.age} · {profile.height} · {profile.tribe.charAt(0).toUpperCase() + profile.tribe.slice(1)}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{
                fontSize: '9px', letterSpacing: '0.15em',
                background: mode === 'active' ? 'rgba(139,92,246,0.2)' : 'rgba(61,42,110,0.3)',
                border: `1px solid ${mode === 'active' ? 'rgba(139,92,246,0.5)' : 'rgba(61,42,110,0.4)'}`,
                color: mode === 'active' ? '#8B5CF6' : 'var(--muted)',
                padding: '3px 9px', borderRadius: '2px', cursor: 'pointer',
              }}
              onClick={() => setMode(mode === 'active' ? 'offline' : 'active')}
              >
                {mode === 'active' ? '● CRUISING' : '○ OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px', background: 'rgba(139,92,246,0.1)',
          borderRadius: '6px', overflow: 'hidden',
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
