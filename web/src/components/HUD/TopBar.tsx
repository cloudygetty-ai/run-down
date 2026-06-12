import { useMapStore } from '../../store/map.store';
import { useUserStore } from '../../store/user.store';

const S = {
  bar: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    background: 'linear-gradient(180deg, rgba(13,10,20,0.97) 0%, rgba(13,10,20,0.85) 100%)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(201,168,76,0.1)',
    zIndex: 100,
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontWeight: 900,
    fontSize: '18px',
    letterSpacing: '0.12em',
    background: 'linear-gradient(135deg, #C9A84C 0%, #F0C96A 50%, #C9A84C 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  tagline: {
    fontFamily: 'var(--font-ui)',
    fontSize: '9px',
    letterSpacing: '0.25em',
    color: 'var(--muted)',
    textTransform: 'uppercase' as const,
    marginTop: '1px',
  },
  stats: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
  },
  statVal: {
    fontFamily: 'var(--font-display)',
    fontSize: '15px',
    color: 'var(--gold)',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '9px',
    letterSpacing: '0.2em',
    color: 'var(--muted)',
    textTransform: 'uppercase' as const,
    marginTop: '2px',
  },
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(76,175,124,0.12)',
    border: '1px solid rgba(76,175,124,0.3)',
    borderRadius: '3px',
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: '11px',
    color: '#4CAF7C',
    letterSpacing: '0.15em',
    fontWeight: 500,
  },
  liveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#4CAF7C',
    boxShadow: '0 0 6px #4CAF7C',
    animation: 'livePulse 1.5s ease-in-out infinite',
  },
  offlineBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(107,96,112,0.12)',
    border: '1px solid rgba(107,96,112,0.3)',
    borderRadius: '3px',
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: '11px',
    color: 'var(--muted)',
    letterSpacing: '0.15em',
    fontWeight: 500,
  },
};

export function TopBar() {
  const activeCruisers = useMapStore((s) => s.activeCruiserCount);
  const activeGroups = useMapStore((s) => s.activeGroupCount);
  const { isLive, goLive, goOffline } = useUserStore();

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }
      `}</style>
      <div style={S.bar}>
        <div>
          <div style={S.logo}>THE STRIP</div>
          <div style={S.tagline}>Cruising Platform</div>
        </div>

        <div style={S.stats}>
          <div style={S.stat}>
            <span style={S.statVal}>{activeCruisers}</span>
            <span style={S.statLabel}>Rolling</span>
          </div>
          <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />
          <div style={S.stat}>
            <span style={S.statVal}>{activeGroups}</span>
            <span style={S.statLabel}>Convoys</span>
          </div>
          <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />
          <button
            style={isLive ? S.liveBadge : S.offlineBadge}
            onClick={isLive ? goOffline : goLive}
          >
            {isLive && <div style={S.liveDot} />}
            {isLive ? 'LIVE' : 'GO LIVE'}
          </button>
        </div>
      </div>
    </>
  );
}
