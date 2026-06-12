import { useMapStore } from '../../store/map.store';
import { useUserStore } from '../../store/user.store';

const SPOT_TYPE_LABEL: Record<string, string> = {
  bar: 'BAR', park: 'PARK', sauna: 'SAUNA',
  beach: 'BEACH', venue: 'VENUE', social: 'SOCIAL',
};
const SPOT_ICON: Record<string, string> = {
  bar: '🍸', park: '🌲', sauna: '♨', beach: '🏖', venue: '⚡', social: '◈',
};
const VIBE_LABEL: Record<string, string> = {
  cruising: '🔥 CRUISING', social: '◈ SOCIAL', party: '⚡ PARTY', chill: '🌙 CHILL',
};

export function SpotDetail() {
  const spots = useMapStore((s) => s.spots);
  const groups = useMapStore((s) => s.groups);
  const selectedId = useMapStore((s) => s.selectedSpotId);
  const selectSpot = useMapStore((s) => s.selectSpot);
  const { checkIn, checkedInSpotId, joinGroup, joinedGroupId } = useUserStore();

  const spot = spots.find((s) => s.id === selectedId) ?? null;
  const group = spot?.groupId ? groups[spot.groupId] : null;
  const isOpen = spot !== null;
  const checkedIn = checkedInSpotId === spot?.id;
  const inGroup = joinedGroupId === group?.id;

  return (
    <div style={{
      position: 'fixed',
      bottom: '64px',
      left: '50%',
      transform: isOpen ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(110%)',
      transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
      width: 'min(460px, calc(100vw - 32px))',
      background: 'rgba(18,15,30,0.97)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: '12px 12px 0 0',
      padding: '16px',
      zIndex: 95,
    }}>
      {spot && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                width: '40px', height: '40px',
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', flexShrink: 0,
              }}>
                {SPOT_ICON[spot.type]}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--cream)', letterSpacing: '0.05em', marginBottom: '3px' }}>
                  {spot.name}
                </div>
                <span style={{
                  fontSize: '9px', letterSpacing: '0.2em',
                  background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                  color: '#8B5CF6', padding: '2px 7px', borderRadius: '2px',
                }}>
                  {SPOT_TYPE_LABEL[spot.type]}
                </span>
              </div>
            </div>
            <button onClick={() => selectSpot(null)} style={{
              background: 'none', border: '1px solid var(--muted-2)', borderRadius: '4px',
              color: 'var(--muted)', width: '26px', height: '26px', cursor: 'pointer',
              fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '1px', marginBottom: '12px', background: 'rgba(139,92,246,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
            {[
              { label: 'Here Now', value: spot.activeCount, color: '#8B5CF6' },
              { label: 'Group', value: group ? group.memberCount : '—', color: 'var(--cream)' },
              { label: 'Vibe', value: group ? VIBE_LABEL[group.vibe] : 'quiet', color: group ? '#4ECDC4' : 'var(--muted)', small: true },
            ].map(({ label, value, color, small }) => (
              <div key={label} style={{ flex: 1, background: 'rgba(18,15,30,0.8)', padding: '10px 8px', textAlign: 'center' as const }}>
                <div style={{ fontFamily: small ? 'var(--font-ui)' : 'var(--font-display)', fontSize: small ? '9px' : '18px', color, lineHeight: 1, marginBottom: '4px' }}>
                  {value}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.15em' }}>{label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '14px' }}>
            {spot.description}
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { checkIn(spot.id); selectSpot(null); }} style={{
              flex: 1, padding: '11px',
              background: checkedIn ? 'rgba(78,205,196,0.12)' : 'rgba(201,168,76,0.12)',
              border: `1px solid ${checkedIn ? 'rgba(78,205,196,0.4)' : 'rgba(201,168,76,0.4)'}`,
              borderRadius: '6px',
              color: checkedIn ? '#4ECDC4' : '#C9A84C',
              fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '0.15em',
              cursor: 'pointer', textTransform: 'uppercase' as const,
            }}>
              {checkedIn ? '✓ HERE' : 'CHECK IN'}
            </button>
            {group && (
              <button onClick={() => { joinGroup(group.id); selectSpot(null); }} style={{
                flex: 1, padding: '11px',
                background: inGroup ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.08)',
                border: `1px solid ${inGroup ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.3)'}`,
                borderRadius: '6px',
                color: '#8B5CF6',
                fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '0.15em',
                cursor: 'pointer', textTransform: 'uppercase' as const,
              }}>
                {inGroup ? '◈ JOINED' : `JOIN (${group.memberCount})`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
