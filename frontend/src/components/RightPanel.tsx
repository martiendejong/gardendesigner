import { useState } from 'react';
import type { DesignResult, SuggestedPlacement } from '../lib/types';
import { PLANT_CATALOG, getPlantInstruction, type PlantCatalogItem } from '../lib/plantCatalog';

interface Props {
  result: DesignResult | null;
  onInstruction: (text: string) => void;
  applying: boolean;
}

type FilterTab = 'AI Picks' | 'Perennials' | 'Grasses' | 'Shrubs' | 'Groundcovers' | 'Bulbs' | 'Climbers' | 'Trees' | 'Objects';

const FILTERS: FilterTab[] = ['AI Picks', 'Perennials', 'Grasses', 'Shrubs', 'Groundcovers', 'Bulbs', 'Climbers', 'Trees', 'Objects'];

interface WalfiliiProduct {
  name: string;
  nameDutch: string;
  description: string;
  emoji: string;
  instruction: string;
}

const WALFILII_PRODUCTS: WalfiliiProduct[] = [
  {
    name: 'Planter Box',
    nameDutch: 'Plantenbak',
    description: 'Cortensteel planter in various shapes, sizes and colors. Original WALFiLii design.',
    emoji: '🪴',
    instruction: 'Add a stylish cortensteel planter box in a fitting location in the garden. Keep everything else exactly as it is.',
  },
  {
    name: 'Fire Bowl',
    nameDutch: 'Vuurschaal',
    description: 'Cortensteel fire bowl for year-round warmth. Available with or without feet.',
    emoji: '🔥',
    instruction: 'Add a cortensteel fire bowl in the garden in a natural focal point. Keep everything else exactly as it is.',
  },
  {
    name: 'Water Feature',
    nameDutch: 'Waterelement',
    description: 'Decorative water element with timeless design. Suits any garden style.',
    emoji: '💧',
    instruction: 'Add a decorative water feature element in the garden in a fitting location. Keep everything else exactly as it is.',
  },
  {
    name: 'Outdoor Trolley',
    nameDutch: 'Outdoor Trolley',
    description: 'Weather-resistant cortensteel trolley for outdoor entertaining and BBQ use.',
    emoji: '🛒',
    instruction: 'Add a cortensteel outdoor trolley in a practical location near a patio or BBQ area. Keep everything else exactly as it is.',
  },
  {
    name: 'Pedestal',
    nameDutch: 'Sokkel',
    description: 'Cortensteel pedestal for displaying artwork or as a focal point. Also usable as a bench.',
    emoji: '🏛️',
    instruction: 'Add a cortensteel pedestal as a garden focal point in a prominent location. Keep everything else exactly as it is.',
  },
  {
    name: 'Herb Garden Box',
    nameDutch: 'Kruidenbak',
    description: 'Cortensteel raised herb bed for vegetables, fruit and herbs. Available with subdivisions.',
    emoji: '🌿',
    instruction: 'Add a cortensteel raised herb garden box in a sunny spot in the garden. Keep everything else exactly as it is.',
  },
  {
    name: 'Hedge Planter',
    nameDutch: 'Heggenplanter',
    description: 'Specialized planter designed for hedges and tall plants. Stylish and functional.',
    emoji: '🌳',
    instruction: 'Add a cortensteel hedge planter along the border of the garden. Keep everything else exactly as it is.',
  },
  {
    name: 'Custom Element',
    nameDutch: 'Special',
    description: 'Bespoke garden design element made to order. Unique installation for individual clients.',
    emoji: '✨',
    instruction: 'Add a custom-designed cortensteel garden element as a unique accent piece. Keep everything else exactly as it is.',
  },
];

function PlantRow({ plant, selected, onSelect, onPlace, applying }: {
  plant: SuggestedPlacement;
  selected: boolean;
  onSelect: () => void;
  onPlace: () => void;
  applying: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        cursor: 'pointer',
        background: selected ? 'rgba(122,182,72,0.08)' : 'transparent',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Emoji thumbnail */}
      <div style={{
        width: 38, height: 38, borderRadius: 7, flexShrink: 0,
        background: 'linear-gradient(135deg, #d4edbc 0%, #b8e090 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        {plant.emoji}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2e1a', lineHeight: 1.2, marginBottom: 2 }}>
          {plant.name}
        </div>
        <div style={{ fontSize: 10, color: '#8aaa8a', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {plant.description}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#a0bea0', display: 'flex', alignItems: 'center', gap: 3 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Jun – Sep
          </span>
          <span style={{ fontSize: 9, color: '#a0bea0', display: 'flex', alignItems: 'center', gap: 3 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            </svg>
            Full Sun
          </span>
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={e => { e.stopPropagation(); onPlace(); }}
        disabled={applying}
        style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: 'transparent', border: '1.5px solid #c8e0b0',
          color: '#5a9a30', cursor: applying ? 'not-allowed' : 'pointer',
          fontSize: 18, fontWeight: 400, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          opacity: applying ? 0.5 : 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(122,182,72,0.1)'; e.currentTarget.style.borderColor = '#7ab648'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#c8e0b0'; }}
      >+</button>
    </div>
  );
}

export function RightPanel({ result, onInstruction, applying }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('AI Picks');
  const [selected, setSelected] = useState<SuggestedPlacement | null>(null);

  const aiPicks = result?.suggestedPlacements ?? [];
  const isObjectsTab = filter === 'Objects';
  const isAiTab = filter === 'AI Picks';

  const catalogFiltered: PlantCatalogItem[] = (!isObjectsTab && !isAiTab)
    ? PLANT_CATALOG.filter(p => {
        const matchCategory = p.category === filter;
        const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.nameDutch.toLowerCase().includes(search.toLowerCase()) || p.latinName.toLowerCase().includes(search.toLowerCase());
        return matchCategory && matchSearch;
      })
    : [];

  const aiFiltered = isAiTab
    ? aiPicks.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()))
    : [];

  const walfiliiFiltered = isObjectsTab
    ? WALFILII_PRODUCTS.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.nameDutch.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div style={{
      width: 210, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--panel-bg)',
      borderLeft: '1px solid var(--panel-border)',
      overflow: 'hidden',
    }}>

      {/* ── Plant Palette ── */}
      <div style={{ padding: '12px 12px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--panel-text)', letterSpacing: '-0.01em' }}>
            {isObjectsTab ? 'WALFiLii Objects' : isAiTab ? 'AI Plant Picks' : `${filter} (${catalogFiltered.length})`}
          </span>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '1px solid rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(0,0,0,0.3)',
          }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isObjectsTab ? 'Search objects...' : 'Search plants...'}
            style={{
              width: '100%', padding: '7px 9px 7px 28px',
              border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8,
              background: 'white', fontSize: 11, color: '#1a2e1a',
              fontFamily: 'var(--font-sans)', outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(122,182,72,0.4)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
          />
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', paddingBottom: 8 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '3px 8px', borderRadius: 10, fontSize: 10,
              border: `1px solid ${filter === f ? 'rgba(122,182,72,0.4)' : 'rgba(0,0,0,0.1)'}`,
              background: filter === f ? 'rgba(122,182,72,0.12)' : 'white',
              color: filter === f ? '#4a8c28' : '#8aaa8a',
              fontWeight: filter === f ? 600 : 400,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              transition: 'all 0.12s',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Plant / Objects list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isObjectsTab ? (
          walfiliiFiltered.length === 0 ? (
            <p style={{ padding: '24px 16px', fontSize: 11, color: '#8aaa8a', textAlign: 'center' }}>
              No objects match your search.
            </p>
          ) : (
            walfiliiFiltered.map((product, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 7, flexShrink: 0,
                  background: 'linear-gradient(135deg, #e8d5bc 0%, #d4b896 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>{product.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2e1a', lineHeight: 1.2, marginBottom: 1 }}>{product.name}</div>
                  <div style={{ fontSize: 9, color: '#8aaa8a', fontStyle: 'italic', marginBottom: 2 }}>{product.nameDutch} — WALFiLii</div>
                  <div style={{ fontSize: 10, color: '#8aaa8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.description}</div>
                </div>
                <button onClick={() => onInstruction(product.instruction)} disabled={applying}
                  style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: 'transparent', border: '1.5px solid #d4b896', color: '#a07848', cursor: applying ? 'not-allowed' : 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: applying ? 0.5 : 1 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,120,72,0.1)'; e.currentTarget.style.borderColor = '#a07848'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#d4b896'; }}
                >+</button>
              </div>
            ))
          )
        ) : isAiTab ? (
          aiFiltered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(122,182,72,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7ab648" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                  <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"/>
                </svg>
              </div>
              <p style={{ fontSize: 11, color: '#8aaa8a', textAlign: 'center', lineHeight: 1.6 }}>
                {result ? 'No AI suggestions match your search' : 'Generate a design to see AI plant picks'}
              </p>
            </div>
          ) : (
            aiFiltered.map((plant, i) => (
              <PlantRow key={i} plant={plant} selected={selected === plant}
                onSelect={() => setSelected(selected === plant ? null : plant)}
                onPlace={() => onInstruction(plant.instruction)}
                applying={applying}
              />
            ))
          )
        ) : (
          catalogFiltered.length === 0 ? (
            <p style={{ padding: '24px 16px', fontSize: 11, color: '#8aaa8a', textAlign: 'center', lineHeight: 1.6 }}>
              {search ? 'No plants match your search.' : `No ${filter} in catalog.`}
            </p>
          ) : (
            catalogFiltered.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 7, flexShrink: 0,
                  background: 'linear-gradient(135deg, #d4edbc 0%, #b8e090 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>{item.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2e1a', lineHeight: 1.2, marginBottom: 1 }}>{item.name}</div>
                  <div style={{ fontSize: 9, color: '#8aaa8a', fontStyle: 'italic', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.latinName}</div>
                  <div style={{ fontSize: 10, color: '#8aaa8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
                </div>
                <button
                  onClick={() => onInstruction(getPlantInstruction(item))}
                  disabled={applying}
                  style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: 'transparent', border: '1.5px solid #c8e0b0',
                    color: '#5a9a30', cursor: applying ? 'not-allowed' : 'pointer',
                    fontSize: 18, fontWeight: 400, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: applying ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(122,182,72,0.1)'; e.currentTarget.style.borderColor = '#7ab648'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#c8e0b0'; }}
                >+</button>
              </div>
            ))
          )
        )}
      </div>

      {/* ── Plant Details (only on AI Picks tab) ── */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid var(--panel-border)',
        background: 'white',
        minHeight: (isAiTab && selected) ? 180 : (isAiTab ? 52 : 0),
        transition: 'min-height 0.2s ease',
        overflow: 'hidden',
        display: isAiTab ? undefined : 'none',
      }}>
        <div style={{ padding: '10px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--panel-text)' }}>Plant Details</span>
          {selected && (
            <button onClick={() => setSelected(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {selected ? (
          <div style={{ padding: '10px 12px 14px', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, #d4edbc, #b8e090)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}>{selected.emoji}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2e1a', marginBottom: 3 }}>{selected.name}</div>
                <div style={{ fontSize: 10, color: '#8aaa8a', fontStyle: 'italic', lineHeight: 1.4 }}>{selected.description}</div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                { icon: '📏', label: '80-100 cm' },
                { icon: '🌸', label: 'Jun – Sep' },
                { icon: '☀️', label: 'Full Sun' },
                { icon: '💧', label: 'Low Water' },
              ].map(stat => (
                <div key={stat.label} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 6,
                  background: 'rgba(122,182,72,0.06)',
                  border: '1px solid rgba(122,182,72,0.1)',
                }}>
                  <span style={{ fontSize: 10 }}>{stat.icon}</span>
                  <span style={{ fontSize: 10, color: '#4a6a4a', fontWeight: 500 }}>{stat.label}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 11, color: '#4a6a4a', lineHeight: 1.6, marginBottom: 12 }}>
              A beautiful garden plant that thrives in full sun. {selected.description}
            </p>

            <button
              onClick={() => { onInstruction(selected.instruction); setSelected(null); }}
              disabled={applying}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                background: applying ? 'rgba(0,0,0,0.06)' : 'linear-gradient(135deg, #7ab648, #5a9a30)',
                color: applying ? '#8aaa8a' : 'white',
                fontSize: 12, fontWeight: 600, cursor: applying ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                boxShadow: applying ? 'none' : '0 2px 8px rgba(122,182,72,0.25)',
              }}
            >
              {applying ? 'Applying...' : 'Place in Garden'}
            </button>
          </div>
        ) : (
          <p style={{ padding: '8px 12px 14px', fontSize: 11, color: '#a0bea0', lineHeight: 1.6 }}>
            Select a plant to see details and placement options.
          </p>
        )}
      </div>
    </div>
  );
}
