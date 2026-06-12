import { useState } from 'react';
import { useMapStore } from '../store/map.store';
import type { SpotCategory } from '../types';

const CATEGORY_ICON: Record<SpotCategory, string> = {
  strip:      '🛣',
  meetup:     '📍',
  lookout:    '🔭',
  parking:    '🅿',
  'drive-in': '🎬',
  historic:   '⭐',
};

const VIBE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  lit:    { label: 'LIT',    color: '#F0C96A', bg: 'rgba(240,201,106,0.12)' },
  active: { label: 'ACTIVE', color: '#4CAF7C', bg: 'rgba(76,175,124,0.12)' },
  quiet:  { label: 'QUIET',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  dead:   { label: 'DEAD',   color: '#6B6070', bg: 'rgba(107,96,112,0.1)'  },
};

export function SpotsScreen() {
  const spots = useMapStore((s) => s.spots);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<SpotCategory | 'all'>('all');

  const filtered = spots
    .filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === 'all' || s.category === filterCat;
      return matchSearch && matchCat;
    })
    .sort((a, b) => b.activeCruisers - a.activeCruisers);

  const categories: Array<{ id: SpotCategory | 'all'; label: string }> = [
    { id: 'all',      label: 'All' },
    { id: 'strip',    label: 'Strips' },
    { id: 'meetup',   label: 'Meetups' },
    { id: 'lookout',  label: 'Lookouts' },
    { id: 'historic', label: 'Historic' },
  ];

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'var(--obsidian)',
      overflowY: 'auto',
      paddingTop: '56px',
      paddingBottom: '64px',
    }}>
      {/* Search + filter */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(13,10,20,0.95)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        zIndex: 10,
      }}>
        <input
          placeholder="Search spots..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--obsidian-3)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '8px 12px',
            color: 'var(--cream)',
            fontFamily: 'var(--font-ui)',
            fontSize: '13px',
            outline: 'none',
            marginBottom: '10px',
          }}
        />
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              style={{
                background: filterCat === c.id
                  ? 'rgba(201,168,76,0.15)'
                  : 'var(--obsidian-3)',
                border: `1px solid ${filterCat === c.id ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: '3px',
                color: filterCat === c.id ? 'var(--gold)' : 'var(--muted)',
                padding: '4px 10px',
                fontSize: '10px',
                letterSpacing: '0.15em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {c.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1px',
        padding: '1px',
        background: 'var(--border)',
      }}>
        {filtered.map((spot) => {
          const vibe = VIBE_STYLE[spot.vibeScore] ?? VIBE_STYLE.quiet;
          return (
            <div
              key={spot.id}
              style={{
                background: 'var(--obsidian-2)',
                padding: '16px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--obsidian-3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--obsidian-2)')}
            >
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '4px',
                    background: 'var(--obsidian-4)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                  }}>
                    {CATEGORY_ICON[spot.category]}
                  </div>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '13px',
                      color: 'var(--gold)',
                      letterSpacing: '0.05em',
                      marginBottom: '3px',
                    }}>
                      {spot.name}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.15em' }}>
                      {spot.category.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div style={{
                  background: vibe.bg,
                  color: vibe.color,
                  border: `1px solid ${vibe.color}30`,
                  fontSize: '9px',
                  padding: '3px 7px',
                  borderRadius: '2px',
                  letterSpacing: '0.15em',
                  flexShrink: 0,
                }}>
                  {vibe.label}
                </div>
              </div>

              {/* Description */}
              <p style={{
                fontSize: '11px',
                color: 'var(--muted)',
                lineHeight: 1.5,
                marginBottom: '12px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {spot.description}
              </p>

              {/* Bottom stats */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} style={{
                      fontSize: '10px',
                      color: i < Math.round(spot.rating) ? '#F0C96A' : 'var(--muted-2)',
                    }}>★</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--cream)' }}>
                    <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: '13px' }}>
                      {spot.activeCruisers}
                    </span>
                    {' '}rolling
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    Peak: {spot.peakTime}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
