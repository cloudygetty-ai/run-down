import { useMapStore } from '../../store/map.store';
import { useUserStore } from '../../store/user.store';

const VIBE_LABEL: Record<string, { label: string; color: string }> = {
  lit:    { label: '🔥 LIT',    color: '#F0C96A' },
  active: { label: '⚡ ACTIVE', color: '#4CAF7C' },
  quiet:  { label: '🌙 QUIET',  color: '#8B5CF6' },
  dead:   { label: '💀 DEAD',   color: '#6B6070' },
};

const CATEGORY_LABEL: Record<string, string> = {
  strip:    'STRIP',
  meetup:   'MEETUP',
  lookout:  'LOOKOUT',
  parking:  'PARKING',
  'drive-in': 'DRIVE-IN',
  historic: 'HISTORIC',
};

export function SpotDetail() {
  const spots = useMapStore((s) => s.spots);
  const selectedId = useMapStore((s) => s.selectedSpotId);
  const selectSpot = useMapStore((s) => s.selectSpot);
  const { recordCheckin, addRep } = useUserStore();

  const spot = spots.find((s) => s.id === selectedId) ?? null;
  const isOpen = spot !== null;

  function handleCheckin() {
    if (!spot) return;
    recordCheckin();
    addRep(50);
    useMapStore.getState().pushFeed({
      id: `checkin-${Date.now()}`,
      type: 'checkin',
      handle: 'You',
      spotName: spot.name,
      detail: `You checked in at ${spot.name}`,
      timestamp: Date.now(),
    });
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '64px',
      left: '50%',
      transform: isOpen
        ? 'translateX(-50%) translateY(0)'
        : 'translateX(-50%) translateY(110%)',
      transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
      width: 'min(480px, calc(100vw - 48px))',
      background: 'rgba(26,21,40,0.97)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(201,168,76,0.2)',
      borderRadius: '8px 8px 0 0',
      padding: '16px',
      zIndex: 95,
    }}>
      {spot && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                color: 'var(--gold)',
                letterSpacing: '0.06em',
                marginBottom: '4px',
              }}>
                {spot.name}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '9px',
                  letterSpacing: '0.2em',
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.25)',
                  color: 'var(--gold-bright)',
                  padding: '2px 7px',
                  borderRadius: '2px',
                }}>
                  {CATEGORY_LABEL[spot.category]}
                </span>
                <span style={{
                  fontSize: '10px',
                  color: VIBE_LABEL[spot.vibeScore]?.color ?? 'var(--muted)',
                  letterSpacing: '0.08em',
                }}>
                  {VIBE_LABEL[spot.vibeScore]?.label}
                </span>
              </div>
            </div>
            <button
              onClick={() => selectSpot(null)}
              style={{
                background: 'none',
                border: '1px solid var(--muted-2)',
                borderRadius: '3px',
                color: 'var(--muted)',
                width: '26px',
                height: '26px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex',
            gap: '1px',
            marginBottom: '12px',
            background: 'var(--border)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            {[
              { label: 'Rolling Now', value: spot.activeCruisers, color: 'var(--gold)' },
              { label: 'All-time', value: spot.totalCheckins.toLocaleString(), color: 'var(--cream)' },
              { label: 'Peak', value: spot.peakTime, color: 'var(--violet)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                flex: 1,
                background: 'var(--obsidian-3)',
                padding: '10px 8px',
                textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: label === 'Peak' ? '10px' : '18px',
                  color,
                  lineHeight: 1,
                  marginBottom: '4px',
                }}>
                  {value}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '3px' }}>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} style={{
                  fontSize: '12px',
                  color: i < Math.round(spot.rating) ? '#F0C96A' : 'var(--muted-2)',
                }}>★</span>
              ))}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{spot.rating.toFixed(1)}</span>
            <span style={{ fontSize: '10px', color: 'var(--muted)', marginLeft: 'auto' }}>
              by {spot.createdByHandle}
            </span>
          </div>

          {/* Description */}
          <p style={{
            fontSize: '12px',
            color: 'var(--muted)',
            lineHeight: 1.6,
            marginBottom: '14px',
          }}>
            {spot.description}
          </p>

          {/* CTA */}
          <button
            onClick={handleCheckin}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #C9A84C, #8A6228)',
              border: 'none',
              borderRadius: '4px',
              color: '#0D0A14',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '0.2em',
              cursor: 'pointer',
              textTransform: 'uppercase' as const,
            }}
          >
            CHECK IN — +50 REP
          </button>
        </>
      )}
    </div>
  );
}
