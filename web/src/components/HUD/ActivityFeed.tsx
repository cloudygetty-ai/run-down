import { useEffect, useRef, useState } from 'react';
import { useMapStore } from '../../store/map.store';
import type { ActivityEvent, ActivityEventType } from '../../types';
import { timeAgo } from '../../services/geo';

const EVENT_COLOR: Record<ActivityEventType, string> = {
  join:       '#C9A84C',
  checkin:    '#4CAF7C',
  honk:       '#F0C96A',
  group_form: '#8B5CF6',
  milestone:  '#F0C96A',
  spot_hot:   '#E85555',
};

const EVENT_ICON: Record<ActivityEventType, string> = {
  join:       '→',
  checkin:    '✓',
  honk:       '📣',
  group_form: '◈',
  milestone:  '★',
  spot_hot:   '🔥',
};

function FeedItem({ event }: { event: ActivityEvent }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const color = EVENT_COLOR[event.type];
  const icon = EVENT_ICON[event.type];

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '8px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(-8px)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
    }}>
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '3px',
        background: `${color}20`,
        border: `1px solid ${color}50`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '9px',
        flexShrink: 0,
        marginTop: '1px',
        color,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '11px',
          color: 'var(--cream)',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {event.detail}
        </div>
        <div style={{
          fontSize: '9px',
          color: 'var(--muted)',
          marginTop: '2px',
          letterSpacing: '0.1em',
        }}>
          {timeAgo(event.timestamp)}
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed() {
  const feed = useMapStore((s) => s.feed);
  const listRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: '56px',
      bottom: '64px',
      width: collapsed ? '36px' : '220px',
      transition: 'width 0.25s ease',
      background: 'rgba(13,10,20,0.88)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRight: '1px solid rgba(201,168,76,0.1)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 90,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid rgba(201,168,76,0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--gold)',
          fontSize: '10px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase' as const,
          fontFamily: 'var(--font-ui)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '12px' }}>{collapsed ? '»' : '«'}</span>
        {!collapsed && 'Live Feed'}
      </button>

      {!collapsed && (
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 12px',
          }}
        >
          {feed.map((e) => (
            <FeedItem key={e.id} event={e} />
          ))}
          {feed.length === 0 && (
            <div style={{
              color: 'var(--muted)',
              fontSize: '11px',
              padding: '16px 0',
              textAlign: 'center',
            }}>
              Waiting for activity...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
