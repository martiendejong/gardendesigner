import type { DesignResult, SuggestedPlacement } from '../lib/types';

interface Props {
  result: DesignResult | null;
  refreshing: boolean;
  placing: boolean;
  onFlowMode: () => void;
  onPlaceObject: () => void;
  suggestedPlacements: SuggestedPlacement[];
  onInstruction: (text: string) => void;
  onProceedToArrange: () => void;
  segmenting: boolean;
}

function HarmonyRing({ level }: { level: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (level / 100) * circ;
  const color = level >= 70 ? '#7ab648' : level >= 45 ? '#c8a042' : '#888';

  return (
    <svg width={56} height={56} style={{ flexShrink: 0 }} className="harmony-ring">
      <circle cx={28} cy={28} r={r} fill="none" stroke="#222" strokeWidth={3} />
      <circle
        cx={28} cy={28} r={r} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x={28} y={32} textAnchor="middle" fill={color} fontSize={11} fontWeight={700}>{level}%</text>
    </svg>
  );
}

export function InsightsPanel({ result, refreshing, placing: _placing, onFlowMode, onPlaceObject: _onPlaceObject, suggestedPlacements, onInstruction, onProceedToArrange, segmenting }: Props) {
  return (
    <div style={{
      width: 282, flexShrink: 0,
      borderLeft: '1px solid #1e1e1e',
      display: 'flex', flexDirection: 'column',
      background: '#111',
    }}>

      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #1a1a1a',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#7ab648', letterSpacing: '0.04em' }}>JENGO Insights</span>
        <span style={{ color: '#2e2e2e', fontSize: 16, letterSpacing: 2 }}>•••</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {result && !refreshing ? (
          <>
            {/* Harmony */}
            <div style={{
              background: '#161616', borderRadius: 8, border: '1px solid #222',
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <HarmonyRing level={result.harmonyLevel} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#e0e0e0', marginBottom: 2 }}>
                  HARMONY LEVEL {result.harmonyLevel}%
                </p>
                <p style={{ fontSize: 11, color: '#666' }}>Aligned with your Intentions</p>
              </div>
            </div>

            {/* Suggestions */}
            {result.suggestions.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                  {i === 0 ? '💡' : '◉'}
                </span>
                <div>
                  {i === 0 && (
                    <p style={{ fontSize: 10, color: '#7ab648', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 3, textTransform: 'uppercase' }}>
                      Suggestion:
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: '#b8b8b8', lineHeight: 1.5 }}>{s}</p>
                </div>
              </div>
            ))}

            {/* Corner note */}
            {result.cornerNote && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1, color: '#888' }}>◎</span>
                <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5, fontStyle: 'italic' }}>{result.cornerNote}</p>
              </div>
            )}

            {/* Suggested Objects */}
            {suggestedPlacements.length > 0 && (
              <div style={{ borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
                <div style={{
                  padding: '8px 12px', background: '#161616',
                  borderBottom: '1px solid #1e1e1e',
                }}>
                  <span style={{ fontSize: 11, color: '#888' }}>⊕ Suggested Objects</span>
                </div>
                <div style={{
                  padding: 10, background: '#131313',
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                }}>
                  {suggestedPlacements.map((item, i) => (
                    <div key={i} style={{
                      background: '#1a1a1a', borderRadius: 7,
                      border: '1px solid #242424', padding: '8px 8px 6px',
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                      <div style={{ fontSize: 22, textAlign: 'center', lineHeight: 1 }}>{item.emoji}</div>
                      <p style={{ fontSize: 10, fontWeight: 600, color: '#d0d0d0', textAlign: 'center', lineHeight: 1.3 }}>{item.name}</p>
                      <p style={{ fontSize: 9, color: '#555', textAlign: 'center', lineHeight: 1.3, marginBottom: 2 }}>{item.description}</p>
                      <button
                        onClick={() => onInstruction(item.instruction)}
                        style={{
                          padding: '4px 0', background: 'rgba(122,182,72,0.1)',
                          border: '1px solid #3a6a28', borderRadius: 5,
                          color: '#7ab648', fontSize: 10, fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Place →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : refreshing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 40 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
            <p style={{ fontSize: 11, color: '#555' }}>Refreshing insights...</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', paddingTop: 50 }}>
            <div style={{ fontSize: 36, opacity: 0.1, marginBottom: 14 }}>✦</div>
            <p style={{ fontSize: 12, color: '#444', lineHeight: 1.6, padding: '0 8px' }}>
              Upload your garden photo and click <em style={{ color: '#7ab648' }}>Start Creating</em> to receive personalised insights.
            </p>
          </div>
        )}
      </div>

      {/* Arrange + Flow Mode */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1a1a1a', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {result && (
          <button
            onClick={onProceedToArrange}
            disabled={segmenting}
            style={{
              width: '100%', padding: '10px 14px',
              background: segmenting ? '#1a2e10' : '#7ab648',
              border: 'none', borderRadius: 8,
              color: segmenting ? '#7ab648' : '#fff',
              cursor: segmenting ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.2s',
            }}
          >
            {segmenting ? (
              <>
                <span className="dot" style={{ width: 5, height: 5 }} />
                <span className="dot" style={{ width: 5, height: 5 }} />
                <span className="dot" style={{ width: 5, height: 5 }} />
                <span style={{ marginLeft: 4 }}>Scanning...</span>
              </>
            ) : 'Arrange Objects →'}
          </button>
        )}
        <button
          onClick={onFlowMode}
          disabled={!result}
          style={{
            width: '100%', padding: '10px 14px',
            background: result ? 'rgba(122,182,72,0.08)' : '#141414',
            border: `1px solid ${result ? '#3a6a28' : '#1e1e1e'}`,
            borderRadius: 8,
            color: result ? '#7ab648' : '#333',
            cursor: result ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 12,
            transition: 'all 0.2s',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: result ? 'rgba(122,182,72,0.15)' : '#1a1a1a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, flexShrink: 0,
          }}>▶</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Enter Flow Mode</div>
            <div style={{ fontSize: 10, color: result ? '#666' : '#2a2a2a' }}>Immerse Yourself.</div>
          </div>
        </button>
      </div>

    </div>
  );
}
