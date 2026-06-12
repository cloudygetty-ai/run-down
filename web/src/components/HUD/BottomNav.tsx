import type { NavTab } from '../../types';

type Props = {
  tab: NavTab;
  onChange: (tab: NavTab) => void;
};

const TABS: { id: NavTab; label: string; icon: string }[] = [
  { id: 'map',     label: 'MAP',     icon: '◈' },
  { id: 'spots',   label: 'SPOTS',   icon: '📍' },
  { id: 'profile', label: 'PROFILE', icon: '◉' },
];

export function BottomNav({ tab, onChange }: Props) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '64px',
      background: 'rgba(13,10,20,0.97)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(201,168,76,0.1)',
      display: 'flex',
      zIndex: 100,
    }}>
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              color: active ? 'var(--gold)' : 'var(--muted)',
              fontFamily: 'var(--font-ui)',
              transition: 'color 0.15s ease',
              borderTop: active ? '2px solid var(--gold)' : '2px solid transparent',
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>{t.icon}</span>
            <span style={{
              fontSize: '9px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
            }}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
