import { useState } from 'react';
import { useChatStore } from '../store/chat.store';
import { GRADIENTS, timeAgo } from '../services/geo';
import type { Conversation } from '../types';

function ConvRow({ conv, onClick }: { conv: Conversation; onClick: () => void }) {
  const last = conv.messages[conv.messages.length - 1];
  const gradient = GRADIENTS[conv.partnerProfile.gradientId];

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', gap: '12px', padding: '14px 16px',
        borderBottom: '1px solid rgba(139,92,246,0.08)',
        cursor: 'pointer', alignItems: 'center',
        background: conv.unreadCount > 0 ? 'rgba(139,92,246,0.04)' : 'transparent',
        transition: 'background 0.15s ease',
      }}
    >
      <div style={{
        width: '46px', height: '46px', borderRadius: '50%',
        background: gradient, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
        border: `2px solid ${conv.unreadCount > 0 ? '#8B5CF6' : 'transparent'}`,
      }}>
        {['😎','🔥','👀','✨','💫','⚡','🎯','🌟'][conv.partnerProfile.gradientId]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            color: conv.unreadCount > 0 ? 'var(--cream)' : 'var(--muted)',
            letterSpacing: '0.04em',
          }}>
            {conv.partnerProfile.displayName}, {conv.partnerProfile.age}
          </div>
          {last && (
            <div style={{ fontSize: '9px', color: 'var(--muted)' }}>
              {timeAgo(last.timestamp)}
            </div>
          )}
        </div>
        <div style={{
          fontSize: '12px', color: 'var(--muted)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {last ? (last.senderId === 'me' ? 'You: ' : '') + last.text : 'New match'}
        </div>
      </div>
      {conv.unreadCount > 0 && (
        <div style={{
          background: '#8B5CF6', color: '#fff',
          borderRadius: '8px', padding: '2px 6px',
          fontSize: '10px', fontWeight: 700, flexShrink: 0,
        }}>
          {conv.unreadCount}
        </div>
      )}
    </div>
  );
}

function ChatThread({ conv }: { conv: Conversation }) {
  const [text, setText] = useState('');
  const { sendMessage, receiveMessage, setActive } = useChatStore();

  function send() {
    if (!text.trim()) return;
    sendMessage(conv.id, text.trim());
    setText('');
    setTimeout(() => {
      const replies = ['😏', 'Where are you?', 'Come find me 👀', 'Nice', 'How far?', 'Cute'];
      receiveMessage(conv.id, replies[Math.floor(Math.random() * replies.length)]);
    }, 1500 + Math.random() * 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(139,92,246,0.1)',
        display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
      }}>
        <button
          onClick={() => setActive(null)}
          style={{
            background: 'none', border: 'none', color: '#8B5CF6',
            cursor: 'pointer', fontSize: '16px', padding: '0 4px',
          }}
        >
          ←
        </button>
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%',
          background: GRADIENTS[conv.partnerProfile.gradientId],
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
        }}>
          {['😎','🔥','👀','✨','💫','⚡','🎯','🌟'][conv.partnerProfile.gradientId]}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--cream)' }}>
            {conv.partnerProfile.displayName}, {conv.partnerProfile.age}
          </div>
          <div style={{ fontSize: '9px', color: '#4ECDC4', letterSpacing: '0.1em' }}>MATCHED</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {conv.messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '12px', marginTop: '24px' }}>
            You matched. Say something.
          </div>
        )}
        {conv.messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.senderId === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              background: msg.senderId === 'me'
                ? 'linear-gradient(135deg, #8B5CF6, #5B3BA6)'
                : 'rgba(28,23,48,0.9)',
              border: msg.senderId === 'me' ? 'none' : '1px solid rgba(139,92,246,0.15)',
              color: 'var(--cream)',
              borderRadius: msg.senderId === 'me' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
              padding: '8px 12px',
              fontSize: '13px',
              maxWidth: '75%',
              wordBreak: 'break-word',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(139,92,246,0.1)',
        display: 'flex', gap: '8px', flexShrink: 0,
      }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Say something..."
          style={{
            flex: 1, background: 'var(--obsidian-3)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: '20px', padding: '8px 14px',
            color: 'var(--cream)', fontFamily: 'var(--font-ui)', fontSize: '13px',
            outline: 'none',
          }}
        />
        <button
          onClick={send}
          style={{
            background: 'linear-gradient(135deg, #8B5CF6, #5B3BA6)',
            border: 'none', borderRadius: '50%', width: '36px', height: '36px',
            color: '#fff', cursor: 'pointer', fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

export function ChatsScreen() {
  const { conversations, activeConvId, setActive } = useChatStore();
  const convList = Object.values(conversations).sort((a, b) => b.lastActivity - a.lastActivity);
  const activeConv = activeConvId ? conversations[activeConvId] : null;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'var(--obsidian)',
      paddingTop: '52px', paddingBottom: '64px',
      display: 'flex', flexDirection: 'column',
    }}>
      {activeConv ? (
        <ChatThread conv={activeConv} />
      ) : (
        <>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(139,92,246,0.1)',
            fontSize: '10px', letterSpacing: '0.2em', color: 'var(--muted)',
          }}>
            {convList.length} CONVERSATION{convList.length !== 1 ? 'S' : ''}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {convList.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '200px', gap: '8px',
              }}>
                <div style={{ fontSize: '32px' }}>💬</div>
                <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
                  No matches yet. Get out there.
                </div>
              </div>
            ) : (
              convList.map((c) => (
                <ConvRow key={c.id} conv={c} onClick={() => setActive(c.id)} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
