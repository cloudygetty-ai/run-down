import { useState } from 'react';
import { useMapStore } from '../../store/map.store';
import { useUserStore } from '../../store/user.store';

export function GroupPanel() {
  const groups = useMapStore((s) => s.groups);
  const cruisers = useMapStore((s) => s.cruisers);
  const { currentGroupId, joinGroup, leaveGroup } = useUserStore();
  const [collapsed, setCollapsed] = useState(false);

  const groupList = Object.values(groups);
  const myGroup = currentGroupId ? groups[currentGroupId] : null;

  const handleCruiserName = (id: string) => cruisers[id]?.handle ?? id;

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: '56px',
      bottom: '64px',
      width: collapsed ? '36px' : '220px',
      transition: 'width 0.25s ease',
      background: 'rgba(13,10,20,0.88)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderLeft: '1px solid rgba(201,168,76,0.1)',
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
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: '8px',
          color: 'var(--violet)',
          fontSize: '10px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase' as const,
          fontFamily: 'var(--font-ui)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {!collapsed && 'Convoys'}
        <span style={{ fontSize: '12px' }}>{collapsed ? '«' : '»'}</span>
      </button>

      {!collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>

          {/* My Group */}
          {myGroup ? (
            <div style={{
              margin: '12px 0',
              padding: '10px',
              background: `${myGroup.color}12`,
              border: `1px solid ${myGroup.color}40`,
              borderRadius: '4px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '11px',
                  color: myGroup.color,
                  letterSpacing: '0.08em',
                }}>
                  {myGroup.name}
                </div>
                <div style={{
                  background: 'rgba(76,175,124,0.15)',
                  color: '#4CAF7C',
                  fontSize: '9px',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  letterSpacing: '0.1em',
                }}>
                  ROLLING
                </div>
              </div>
              {myGroup.memberIds.map((id) => (
                <div key={id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 0',
                  fontSize: '11px',
                  color: id === myGroup.leaderId ? myGroup.color : 'var(--cream)',
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: myGroup.color,
                    opacity: id === myGroup.leaderId ? 1 : 0.5,
                    flexShrink: 0,
                  }} />
                  {handleCruiserName(id)}
                  {id === myGroup.leaderId && (
                    <span style={{ fontSize: '9px', color: myGroup.color, marginLeft: 'auto' }}>LEAD</span>
                  )}
                </div>
              ))}
              <button
                onClick={leaveGroup}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '5px',
                  background: 'none',
                  border: '1px solid rgba(232,85,85,0.3)',
                  borderRadius: '3px',
                  color: '#E85555',
                  fontSize: '10px',
                  cursor: 'pointer',
                  letterSpacing: '0.15em',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                LEAVE
              </button>
            </div>
          ) : (
            <div style={{
              margin: '12px 0',
              padding: '10px',
              background: 'rgba(139,92,246,0.06)',
              border: '1px dashed rgba(139,92,246,0.2)',
              borderRadius: '4px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>
                Not in a convoy
              </div>
              <button
                style={{
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.4)',
                  borderRadius: '3px',
                  color: 'var(--violet)',
                  padding: '5px 10px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  letterSpacing: '0.15em',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                + START ONE
              </button>
            </div>
          )}

          {/* Divider */}
          <div style={{
            fontSize: '9px',
            letterSpacing: '0.2em',
            color: 'var(--muted)',
            textTransform: 'uppercase' as const,
            margin: '8px 0 6px',
          }}>
            Active Convoys
          </div>

          {/* Group list */}
          {groupList.map((g) => (
            <div
              key={g.id}
              style={{
                padding: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: currentGroupId === g.id ? 'default' : 'pointer',
              }}
              onClick={() => {
                if (currentGroupId !== g.id) joinGroup(g.id);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-display)',
                  fontSize: '11px',
                  color: g.color,
                  letterSpacing: '0.06em',
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: g.color,
                    boxShadow: `0 0 4px ${g.color}`,
                  }} />
                  {g.name}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--muted)',
                }}>
                  {g.memberIds.length}
                </div>
              </div>
              {g.isConvoy && (
                <div style={{
                  fontSize: '9px',
                  color: 'var(--muted)',
                  marginTop: '3px',
                  letterSpacing: '0.1em',
                }}>
                  CONVOY ACTIVE
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
