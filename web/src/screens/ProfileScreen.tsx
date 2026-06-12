import { useUserStore } from '../store/user.store';
import { useMapStore } from '../store/map.store';
import { formatRep, formatMiles } from '../services/geo';

const CLASS_LABEL: Record<string, string> = {
  lowrider: 'LOWRIDER',
  muscle:   'MUSCLE',
  classic:  'CLASSIC',
  truck:    'TRUCK',
  import:   'IMPORT',
  euro:     'EURO',
  suv:      'SUV',
};

const REP_TIER = (rep: number) => {
  if (rep >= 10000) return { label: 'LEGEND',   color: '#F0C96A' };
  if (rep >= 5000)  return { label: 'VETERAN',  color: '#C9A84C' };
  if (rep >= 2000)  return { label: 'REGULAR',  color: '#8B5CF6' };
  if (rep >= 500)   return { label: 'FRESH',    color: '#4CAF7C' };
  return               { label: 'UNKNOWN',  color: '#6B6070' };
};

export function ProfileScreen() {
  const user = useUserStore();
  const feed = useMapStore((s) => s.feed);
  const tier = REP_TIER(user.repScore);
  const myEvents = feed.filter((e) => e.handle === 'You' || e.targetHandle === 'You');

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'var(--obsidian)',
      overflowY: 'auto',
      paddingTop: '56px',
      paddingBottom: '64px',
    }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(201,168,76,0.08) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '24px 20px',
      }}>
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(201,168,76,0.15)',
            border: '2px solid var(--gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            boxShadow: '0 0 20px rgba(201,168,76,0.2)',
            flexShrink: 0,
          }}>
            🚗
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              color: 'var(--gold)',
              letterSpacing: '0.08em',
              marginBottom: '4px',
            }}>
              {user.handle}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
              {user.vehicleName}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{
                fontSize: '9px',
                letterSpacing: '0.2em',
                background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: 'var(--gold)',
                padding: '2px 8px',
                borderRadius: '2px',
              }}>
                {CLASS_LABEL[user.vehicleClass]}
              </span>
              <span style={{
                fontSize: '10px',
                letterSpacing: '0.15em',
                color: tier.color,
                background: `${tier.color}15`,
                border: `1px solid ${tier.color}30`,
                padding: '2px 8px',
                borderRadius: '2px',
              }}>
                {tier.label}
              </span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px',
          background: 'var(--border)',
          borderRadius: '6px',
          overflow: 'hidden',
        }}>
          {[
            { label: 'Rep Score',  value: formatRep(user.repScore),      color: 'var(--gold)'   },
            { label: 'Miles',      value: formatMiles(user.milesLogged),  color: 'var(--cream)'  },
            { label: 'Check-ins',  value: user.totalCheckins,             color: 'var(--violet)' },
            { label: 'Honks Sent', value: user.honksSent,                 color: 'var(--cream)'  },
            { label: 'Honks Rcvd', value: user.honksReceived,             color: 'var(--gold)'   },
            { label: 'Tier',       value: tier.label,                     color: tier.color      },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--obsidian-2)',
              padding: '14px 10px',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: typeof value === 'string' && value.length > 6 ? '13px' : '18px',
                color,
                lineHeight: 1,
                marginBottom: '5px',
              }}>
                {value}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.15em' }}>
                {label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rep progress bar */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'var(--muted)' }}>
            REP PROGRESS TO NEXT TIER
          </span>
          <span style={{ fontSize: '10px', color: 'var(--gold)' }}>
            {formatRep(user.repScore)} / {user.repScore < 500 ? '500' : user.repScore < 2000 ? '2k' : user.repScore < 5000 ? '5k' : '10k'}
          </span>
        </div>
        <div style={{
          height: '4px',
          background: 'var(--obsidian-4)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, (user.repScore % 1000) / 10)}%`,
            background: 'linear-gradient(90deg, var(--gold-dim), var(--gold))',
            borderRadius: '2px',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Vehicle card */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: 'var(--muted)',
          marginBottom: '12px',
        }}>
          MY RIDE
        </div>
        <div style={{
          background: 'var(--obsidian-3)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '4px',
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}>
            🚗
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              color: 'var(--cream)',
              marginBottom: '4px',
            }}>
              {user.vehicleName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {CLASS_LABEL[user.vehicleClass]} · {formatMiles(user.milesLogged)} mi logged
            </div>
          </div>
          <button style={{
            marginLeft: 'auto',
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '3px',
            color: 'var(--muted)',
            padding: '5px 10px',
            fontSize: '10px',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            letterSpacing: '0.12em',
          }}>
            EDIT
          </button>
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: 'var(--muted)',
          marginBottom: '12px',
        }}>
          RECENT ACTIVITY
        </div>
        {myEvents.length === 0 ? (
          <div style={{
            color: 'var(--muted)',
            fontSize: '12px',
            textAlign: 'center',
            padding: '20px',
          }}>
            No activity yet. Hit the map and get rolling.
          </div>
        ) : (
          myEvents.map((e) => (
            <div key={e.id} style={{
              display: 'flex',
              gap: '10px',
              padding: '10px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              alignItems: 'center',
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--gold)',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, fontSize: '12px', color: 'var(--cream)' }}>
                {e.detail}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
