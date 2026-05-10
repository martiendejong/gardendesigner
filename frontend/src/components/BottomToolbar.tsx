import type React from 'react';

export type DesignTool = 'select' | 'add-plant' | 'move' | 'rotate' | 'scale' | 'delete';

interface Props {
  activeTool: DesignTool;
  onToolChange: (t: DesignTool) => void;
  onAIRecommend: () => void;
  generating: boolean;
  applying: boolean;
  hasImage: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  harmonyLevel: number | null;
  suggestion: string | null;
}

const TOOLS: { id: DesignTool; label: string; icon: React.ReactNode }[] = [
  {
    id: 'select', label: 'Select',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3l14 9-7 1-4 7z" />
      </svg>
    ),
  },
  {
    id: 'add-plant', label: 'Add Plant',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    id: 'move', label: 'Move',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" />
        <polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" />
        <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    id: 'rotate', label: 'Rotate',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    ),
  },
  {
    id: 'scale', label: 'Scale',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
      </svg>
    ),
  },
  {
    id: 'delete', label: 'Delete',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4h6v2" />
      </svg>
    ),
  },
];

export function BottomToolbar({
  activeTool, onToolChange, onAIRecommend,
  generating, applying, hasImage,
  zoom, onZoomIn, onZoomOut,
  harmonyLevel, suggestion,
}: Props) {
  const isWorking = generating || applying;

  return (
    <div style={{ flexShrink: 0 }}>
      {/* ── Main toolbar row ── */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 6,
        background: '#070c08',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Tool buttons */}
        <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: 4 }}>
          {TOOLS.map(tool => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                title={tool.label}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '5px 10px', borderRadius: 7, border: 'none',
                  background: isActive ? 'rgba(122,182,72,0.14)' : 'transparent',
                  color: isActive ? '#7ab648' : 'rgba(255,255,255,0.45)',
                  cursor: 'pointer', fontSize: 9, fontWeight: isActive ? 600 : 400,
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.12s',
                  minWidth: 42,
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
              >
                {tool.icon}
                {tool.label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.06)', margin: '0 6px' }} />

        {/* AI Recommend */}
        <button
          onClick={onAIRecommend}
          disabled={!hasImage || isWorking}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 22px', borderRadius: 9, border: 'none',
            background: hasImage && !isWorking
              ? 'linear-gradient(135deg, #7ab648 0%, #5a9a30 100%)'
              : 'rgba(255,255,255,0.05)',
            color: hasImage && !isWorking ? '#fff' : 'rgba(255,255,255,0.25)',
            fontSize: 13, fontWeight: 600,
            cursor: hasImage && !isWorking ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-sans)',
            boxShadow: hasImage && !isWorking ? '0 2px 14px rgba(122,182,72,0.3)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {isWorking ? (
            <>
              <span className="dot" style={{ width: 5, height: 5 }} />
              <span className="dot" style={{ width: 5, height: 5 }} />
              <span className="dot" style={{ width: 5, height: 5 }} />
            </>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
              <path d="M19 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
            </svg>
          )}
          {isWorking ? 'Working...' : 'AI Recommend'}
        </button>

        <div style={{ flex: 1 }} />

        {/* Nav arrows */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['←', '→'] as const).map(arrow => (
            <button key={arrow} style={{
              width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{arrow}</button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.06)', margin: '0 6px' }} />

        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={onZoomOut} style={{
            width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}>-</button>
          <span style={{
            fontSize: 11, color: 'rgba(255,255,255,0.45)',
            minWidth: 44, textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 500,
          }}>{zoom}%</span>
          <button onClick={onZoomIn} style={{
            width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}>+</button>
        </div>

        {/* Grid */}
        <button style={{
          width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        </button>
      </div>

      {/* ── Design tips bar ── */}
      <div style={{
        height: 34, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12,
        background: '#050a06',
        borderTop: '1px solid rgba(255,255,255,0.03)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#7ab648', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
          Design Tips
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {suggestion ?? 'Upload a garden photo and click AI Recommend to get started.'}
        </span>

        {harmonyLevel !== null && (
          <>
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>Design Score</span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(122,182,72,0.08)', borderRadius: 6,
              padding: '3px 8px', flexShrink: 0,
            }}>
              <div style={{
                width: 60, height: 4, borderRadius: 2,
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${harmonyLevel}%`, height: '100%',
                  background: harmonyLevel >= 70 ? '#7ab648' : harmonyLevel >= 45 ? '#c8a04e' : '#cc6b55',
                  borderRadius: 2, transition: 'width 0.6s ease',
                }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#7ab648' }}>{harmonyLevel}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Compatibility</span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: harmonyLevel >= 70 ? '#7ab648' : '#c8a04e',
                padding: '2px 7px', borderRadius: 5,
                background: harmonyLevel >= 70 ? 'rgba(122,182,72,0.1)' : 'rgba(200,160,78,0.1)',
              }}>{harmonyLevel >= 70 ? 'Good' : harmonyLevel >= 45 ? 'Fair' : 'Low'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
