import { useMapStore } from '../../store/map.store';
import { useChatStore } from '../../store/chat.store';
import { useUserStore } from '../../store/user.store';

export function TopBar() {
  const nearbyCount = useMapStore((s) => s.nearbyCount);
  const unread = useChatStore((s) => s.totalUnread);
  const mode = useUserStore((s) => s.mode);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: '52px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      background: 'linear-gradient(180deg, rgba(9,8,15,0.98) 0%, rgba(9,8,15,0.8) 100%)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(139,92,246,0.12)',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: '20px',
          letterSpacing: '0.15em',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #C9A84C 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          CRUISE
        </div>
        <div style={{
          fontSize: '9px',
          letterSpacing: '0.3em',
          color: 'var(--muted)',
          marginTop: '-1px',
          textTransform: 'uppercase' as const,
        }}>
          cruising platform
        </div>
      </div>

      {/* Right: stats */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ textAlign: 'right' as const }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16px',
            color: '#8B5CF6',
            lineHeight: 1,
          }}>
            {nearbyCount}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.15em' }}>
            NEARBY
          </div>
        </div>

        {unread > 0 && (
          <div style={{
            background: '#8B5CF6',
            color: '#fff',
            borderRadius: '10px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 600,
          }}>
            {unread}
          </div>
        )}

        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: mode === 'active' ? '#4ECDC4' : '#3D2A6E',
          boxShadow: mode === 'active' ? '0 0 8px #4ECDC4' : 'none',
          transition: 'all 0.3s ease',
        }} />
      </div>
    </div>
  );
}
