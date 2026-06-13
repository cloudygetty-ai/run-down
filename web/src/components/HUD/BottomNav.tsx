import type { NavTab } from '../../types';
import { useChatStore } from '../../store/chat.store';

type Props = { tab: NavTab; onChange: (t: NavTab) => void };

export function BottomNav({ tab, onChange }: Props) {
  const unread = useChatStore((s) => s.totalUnread);
  const TABS: { id: NavTab; icon: string; label: string; badge?: number }[] = [
    { id: 'map',     icon: '◈', label: 'MAP'     },
    { id: 'nearby',  icon: '⊙', label: 'NEARBY'  },
    { id: 'chats',   icon: '◎', label: 'CHATS', badge: unread > 0 ? unread : undefined },
    { id: 'profile', icon: '◉', label: 'ME'       },
  ];

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: '64px',
      background: 'rgba(9,8,15,0.97)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(139,92,246,0.12)',
      display: 'flex', zIndex: 100,
    }}>
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column' as const,
              alignItems: 'center', justifyContent: 'center', gap: '3px',
              color: active ? '#8B5CF6' : 'var(--muted)',
              fontFamily: 'var(--font-ui)',
              borderTop: active ? '2px solid #8B5CF6' : '2px solid transparent',
              transition: 'color 0.15s ease',
              position: 'relative',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{t.icon}</span>
            <span style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>
              {t.label}
            </span>
            {t.badge !== undefined && (
              <div style={{
                position: 'absolute', top: '4px', right: 'calc(50% - 18px)',
                background: '#8B5CF6', color: '#fff',
                borderRadius: '8px', padding: '1px 5px', fontSize: '9px', fontWeight: 700,
                minWidth: '14px', textAlign: 'center' as const,
              }}>
                {t.badge}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
