import { useState } from 'react';
import type { DesignResult } from '../lib/types';

interface Props {
  result: DesignResult | null;
  refreshing: boolean;
  placing: boolean;
  onFlowMode: () => void;
  onPlaceObject: () => void;
  onAdjust: (instruction: string) => void;
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

export function InsightsPanel({ result, refreshing, placing, onFlowMode, onPlaceObject, onAdjust }: Props) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustText, setAdjustText] = useState('');

  function openAdjust() {
    if (!result?.suggestedObject) return;
    const { name, description } = result.suggestedObject;
    setAdjustText(`Place a ${name} (${description}) in the most natural and suitable spot in this garden.`);
    setAdjustOpen(true);
  }

  function submitAdjust() {
    if (!adjustText.trim()) return;
    onAdjust(adjustText.trim());
    setAdjustOpen(false);
  }

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

            {/* Auto-Placement */}
            <div style={{ borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
              <div style={{
                padding: '8px 12px', background: '#161616',
                borderBottom: '1px solid #1e1e1e',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 11, color: '#888' }}>⊕ Auto-Placement</span>
                <span style={{ color: '#2e2e2e', fontSize: 14, letterSpacing: 2 }}>•••</span>
              </div>

              <div style={{ padding: 12, background: '#131313' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 7, flexShrink: 0,
                    background: 'linear-gradient(135deg, #3d2e1a, #5c461e)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                  }}>🪴</div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#e0e0e0', marginBottom: 2 }}>
                      {result.suggestedObject.name}
                    </p>
                    <p style={{ fontSize: 10, color: '#666', marginBottom: 3 }}>Suggested for this Spot.</p>
                    <p style={{ fontSize: 10, color: '#555', lineHeight: 1.4 }}>{result.suggestedObject.reason}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={onPlaceObject}
                    disabled={placing}
                    style={{
                      flex: 1, padding: '7px 0',
                      background: placing ? '#2a3a1a' : '#7ab648',
                      border: 'none', borderRadius: 6,
                      color: placing ? '#7ab648' : '#fff',
                      fontSize: 12, fontWeight: 600,
                      cursor: placing ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'background 0.2s',
                    }}
                  >
                    {placing ? (
                      <>
                        <span className="dot" style={{ width: 5, height: 5 }} />
                        <span className="dot" style={{ width: 5, height: 5 }} />
                        <span className="dot" style={{ width: 5, height: 5 }} />
                      </>
                    ) : 'Place Object'}
                  </button>
                  <button
                    onClick={openAdjust}
                    disabled={placing}
                    style={{
                      padding: '7px 14px', background: adjustOpen ? '#1a1a1a' : 'transparent',
                      border: `1px solid ${adjustOpen ? '#3a3a3a' : '#2a2a2a'}`, borderRadius: 6,
                      color: adjustOpen ? '#c0c0c0' : '#888', fontSize: 12, cursor: placing ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >Adjust &gt;</button>
                </div>

                {/* Inline adjust panel */}
                {adjustOpen && (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      value={adjustText}
                      onChange={e => setAdjustText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitAdjust(); }}
                      rows={3}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#0e0e0e', border: '1px solid #2a2a2a',
                        borderRadius: 6, color: '#c0c0c0', fontSize: 11,
                        padding: '7px 9px', resize: 'none', lineHeight: 1.5,
                        fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button
                        onClick={submitAdjust}
                        disabled={!adjustText.trim() || placing}
                        style={{
                          flex: 1, padding: '6px 0',
                          background: (!adjustText.trim() || placing) ? '#1e2a14' : '#7ab648',
                          border: 'none', borderRadius: 5,
                          color: (!adjustText.trim() || placing) ? '#4a6a2a' : '#fff',
                          fontSize: 11, fontWeight: 600,
                          cursor: (!adjustText.trim() || placing) ? 'not-allowed' : 'pointer',
                          transition: 'background 0.15s',
                        }}
                      >Apply</button>
                      <button
                        onClick={() => setAdjustOpen(false)}
                        style={{
                          padding: '6px 10px', background: 'transparent',
                          border: '1px solid #2a2a2a', borderRadius: 5,
                          color: '#666', fontSize: 11, cursor: 'pointer',
                        }}
                      >Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
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

      {/* Flow Mode */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1a1a1a', flexShrink: 0 }}>
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
