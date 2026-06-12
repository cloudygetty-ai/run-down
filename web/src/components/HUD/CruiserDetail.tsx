import { useMapStore } from '../../store/map.store';
import { useUserStore } from '../../store/user.store';
import { formatRep, formatMiles } from '../../services/geo';

const CLASS_LABEL: Record<string, string> = {
  lowrider: 'LOWRIDER',
  muscle:   'MUSCLE',
  classic:  'CLASSIC',
  truck:    'TRUCK',
  import:   'IMPORT',
  euro:     'EURO',
  suv:      'SUV',
};

export function CruiserDetail() {
  const cruisers = useMapStore((s) => s.cruisers);
  const groups = useMapStore((s) => s.groups);
  const selectedId = useMapStore((s) => s.selectedCruiserId);
  const selectCruiser = useMapStore((s) => s.selectCruiser);
  const { recordHonk, addRep } = useUserStore();

  const cruiser = selectedId ? cruisers[selectedId] : null;
  const isOpen = cruiser !== null;
  const group = cruiser?.groupId ? groups[cruiser.groupId] : null;

  function handleHonk() {
    if (!cruiser) return;
    recordHonk();
    addRep(5);
    useMapStore.getState().pushFeed({
      id: `honk-${Date.now()}`,
      type: 'honk',
      handle: 'You',
      targetHandle: cruiser.handle,
      detail: `You honked at ${cruiser.handle} 📣`,
      timestamp: Date.now(),
    });
    selectCruiser(null);
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
      width: 'min(400px, calc(100vw - 48px))',
      background: 'rgba(26,21,40,0.97)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid ${cruiser?.color ?? 'rgba(201,168,76,0.2)'}40`,
      borderRadius: '8px 8px 0 0',
      padding: '16px',
      zIndex: 94,
    }}>
      {cruiser && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: `${cruiser.color}25`,
                border: `2px solid ${cruiser.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                boxShadow: `0 0 12px ${cruiser.color}40`,
              }}>
                🚗
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '14px',
                  color: cruiser.color,
                  letterSpacing: '0.08em',
                  marginBottom: '3px',
                }}>
                  {cruiser.handle}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  {cruiser.vehicleName}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  marginTop: '4px',
                  alignItems: 'center',
                }}>
                  <span style={{
                    fontSize: '9px',
                    letterSpacing: '0.15em',
                    background: `${cruiser.color}15`,
                    border: `1px solid ${cruiser.color}30`,
                    color: cruiser.color,
                    padding: '1px 6px',
                    borderRadius: '2px',
                  }}>
                    {CLASS_LABEL[cruiser.vehicleClass]}
                  </span>
                  {group && (
                    <span style={{
                      fontSize: '9px',
                      letterSpacing: '0.1em',
                      color: group.color,
                    }}>
                      ◈ {group.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => selectCruiser(null)}
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
              }}
            >
              ✕
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '1px', marginBottom: '14px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
            {[
              { label: 'REP', value: formatRep(cruiser.repScore), color: 'var(--gold)' },
              { label: 'MILES', value: formatMiles(cruiser.milesLogged), color: 'var(--cream)' },
              { label: 'SPEED', value: `${Math.round(cruiser.speed)} mph`, color: 'var(--violet)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                flex: 1,
                background: 'var(--obsidian-3)',
                padding: '10px 8px',
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color, lineHeight: 1, marginBottom: '4px' }}>
                  {value}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.15em' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleHonk}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.4)',
              borderRadius: '4px',
              color: 'var(--gold)',
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              letterSpacing: '0.25em',
              cursor: 'pointer',
              textTransform: 'uppercase' as const,
            }}
          >
            📣 HONK
          </button>
        </>
      )}
    </div>
  );
}
