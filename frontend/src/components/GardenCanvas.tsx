import type { GardenPreferences, DesignResult } from '../lib/types';

interface Props {
  imagePreview: string | null;
  result: DesignResult | null;
  generating: boolean;
  generatingMessage: string;
  preferences: GardenPreferences;
  onSliderChange: (key: keyof GardenPreferences['sliders'], value: number) => void;
  onStyleSelect: (style: 'contemplative' | 'social' | 'evening') => void;
}

const SLIDERS: { key: keyof GardenPreferences['sliders']; left: string; right: string }[] = [
  { key: 'tranquilVibrant', left: 'Tranquil', right: 'Vibrant' },
  { key: 'openSheltered', left: 'Open', right: 'Sheltered' },
  { key: 'lightMass', left: 'Light', right: 'Mass' },
  { key: 'socialSolitary', left: 'Social', right: 'Solitary' },
];

const STYLES = [
  {
    id: 'contemplative' as const,
    name: 'Contemplative Retreat',
    bg: 'linear-gradient(160deg, #1a3a2e 0%, #0c1e16 100%)',
    glow: 'rgba(40,120,70,0.35)',
  },
  {
    id: 'social' as const,
    name: 'Social Gathering',
    bg: 'linear-gradient(160deg, #2e2a1a 0%, #1a160c 100%)',
    glow: 'rgba(140,110,30,0.35)',
  },
  {
    id: 'evening' as const,
    name: 'Evening Serenity',
    bg: 'linear-gradient(160deg, #1a1a2e 0%, #0c0c1a 100%)',
    glow: 'rgba(60,50,130,0.35)',
  },
];

export function GardenCanvas({
  imagePreview, result, generating, generatingMessage,
  preferences, onSliderChange, onStyleSelect,
}: Props) {
  const displayImage = result?.imageUrl || imagePreview;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

      {/* Canvas header */}
      {(generating || result) && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: '#555', fontStyle: 'italic' }}>
            {generating ? 'Generating Your Space...' : result?.generationMessage}
          </span>
        </div>
      )}

      {/* Main image area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a0a0a' }}>
        {displayImage ? (
          <img
            src={displayImage}
            alt="Garden"
            className="garden-image"
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              opacity: generating ? 0.35 : 1,
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 52, opacity: 0.15 }}>🌿</div>
            <p style={{ fontSize: 13, color: '#3a3a3a' }}>Upload your garden photo to begin</p>
          </div>
        )}

        {/* Generating overlay */}
        {generating && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
          }}>
            <p style={{ fontSize: 24, fontWeight: 300, color: '#e0e0e0', textAlign: 'center', textShadow: '0 2px 30px rgba(0,0,0,0.9)', letterSpacing: '0.01em' }}>
              {generatingMessage}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
      </div>

      {/* Sliders */}
      <div style={{
        padding: '10px 16px 8px',
        borderTop: '1px solid #181818',
        background: '#111',
        display: 'flex', flexDirection: 'column', gap: 7,
        flexShrink: 0,
      }}>
        {SLIDERS.map(s => {
          const val = preferences.sliders[s.key];
          const pct = Math.round(val * 100);
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: '#666', width: 64, textAlign: 'right', flexShrink: 0 }}>{s.left}</span>
              <input
                type="range" min={0} max={100} value={pct}
                className="garden-slider"
                style={{ '--val': `${pct}%` } as React.CSSProperties}
                onChange={e => onSliderChange(s.key, parseInt(e.target.value) / 100)}
              />
              <span style={{ fontSize: 11, color: '#666', width: 64, flexShrink: 0 }}>{s.right}</span>
            </div>
          );
        })}
      </div>

      {/* Style cards */}
      <div style={{
        padding: '8px 16px 12px',
        borderTop: '1px solid #181818',
        background: '#111',
        display: 'flex', gap: 10,
        flexShrink: 0,
      }}>
        {STYLES.map(card => (
          <div
            key={card.id}
            onClick={() => onStyleSelect(card.id)}
            style={{
              flex: 1, borderRadius: 8, overflow: 'hidden',
              border: '1px solid #222', cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#7ab648')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#222')}
          >
            <div style={{ height: 58, background: card.bg, position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(ellipse at 50% 100%, ${card.glow} 0%, transparent 65%)`,
              }} />
            </div>
            <div style={{ padding: '6px 8px 8px', background: '#161616' }}>
              <p style={{ fontSize: 11, color: '#c8c8c8', marginBottom: 5, fontWeight: 500, lineHeight: 1.2 }}>{card.name}</p>
              <button style={{
                background: 'transparent', border: '1px solid #2a2a2a',
                borderRadius: 4, color: '#666', fontSize: 10,
                padding: '2px 8px', cursor: 'pointer',
              }}>
                Explore
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
