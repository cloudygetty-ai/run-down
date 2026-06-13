import { useUserStore } from '../../store/user.store';

export function PulseButton() {
  const mode = useUserStore((s) => s.mode);
  const setMode = useUserStore((s) => s.setMode);
  const active = mode === 'active';

  return (
    <>
      <style>{`
        @keyframes pulse-out {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0;   }
        }
        .pulse-btn-ring {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px solid #8B5CF6;
          animation: pulse-out 2s ease-out infinite;
          pointer-events: none;
        }
        .pulse-btn-ring:nth-child(2) { animation-delay: 1s; }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 95,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '6px',
      }}>
        <button
          onClick={() => setMode(active ? 'offline' : 'active')}
          style={{
            position: 'relative',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: active
              ? 'linear-gradient(135deg, #8B5CF6, #C9A84C)'
              : 'rgba(139,92,246,0.12)',
            border: `2px solid ${active ? 'transparent' : 'rgba(139,92,246,0.4)'}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: active ? '0 0 24px rgba(139,92,246,0.5)' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          {active && <div className="pulse-btn-ring" />}
          {active && <div className="pulse-btn-ring" style={{ animationDelay: '1s' }} />}
          <span style={{ fontSize: '22px', position: 'relative', zIndex: 1 }}>
            {active ? '📡' : '◉'}
          </span>
        </button>
        <div style={{
          fontSize: '9px',
          letterSpacing: '0.2em',
          color: active ? '#8B5CF6' : 'var(--muted)',
          textTransform: 'uppercase' as const,
          fontFamily: 'var(--font-ui)',
          transition: 'color 0.3s ease',
        }}>
          {active ? 'CRUISING' : 'TAP TO CRUISE'}
        </div>
      </div>
    </>
  );
}
