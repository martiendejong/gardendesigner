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
  const r = 24;
  const circ = 2 * Math.PI * r;
  const offset = circ - (level / 100) * circ;
  const color = level >= 70 ? '#7ab648' : level >= 45 ? '#c8a04e' : '#5a6b5e';
  const glowColor = level >= 70
    ? 'rgba(122,182,72,0.3)'
    : level >= 45 ? 'rgba(200,160,78,0.3)' : 'rgba(90,107,94,0.2)';

  return (
    <svg width={60} height={60} style={{ flexShrink: 0 }} className="harmony-ring">
      {/* Background ring */}
      <circle cx={30} cy={30} r={r} fill="none" stroke="var(--garden-border)" strokeWidth={3} />
      {/* Track */}
      <circle
        cx={30} cy={30} r={r} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 30 30)"
        style={{
          transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)',
          filter: `drop-shadow(0 0 4px ${glowColor})`,
        }}
      />
      {/* Center text */}
      <text x={30} y={34} textAnchor="middle" fill={color} fontSize={12} fontWeight={700}
        fontFamily="var(--font-sans)">{level}%</text>
    </svg>
  );
}

export function InsightsPanel({ result, refreshing, placing: _placing, onFlowMode, onPlaceObject: _onPlaceObject, suggestedPlacements, onInstruction, onProceedToArrange, segmenting }: Props) {
  return (
    <div style={{
      width: 290, flexShrink: 0,
      borderLeft: '1px solid var(--garden-border)',
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, var(--garden-surface) 0%, var(--garden-deep) 100%)',
    }}>

      {/* Header */}
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid var(--garden-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: result ? 'var(--green-400)' : 'var(--text-muted)',
            boxShadow: result ? '0 0 6px var(--green-glow)' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{
            fontSize: 12, fontWeight: 700, color: 'var(--green-400)',
            letterSpacing: '0.08em',
          }}>JENGO Insights</span>
        </div>
        <svg width="16" height="4" viewBox="0 0 16 4">
          <circle cx="2" cy="2" r="1.5" fill="var(--text-muted)"/>
          <circle cx="8" cy="2" r="1.5" fill="var(--text-muted)"/>
          <circle cx="14" cy="2" r="1.5" fill="var(--text-muted)"/>
        </svg>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {result && !refreshing ? (
          <>
            {/* Harmony Card */}
            <div style={{
              background: 'var(--garden-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--garden-border)',
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: 'var(--shadow-sm)',
            }}>
              <HarmonyRing level={result.harmonyLevel} />
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-primary)',
                  marginBottom: 3, letterSpacing: '0.06em',
                }}>
                  HARMONY LEVEL
                </p>
                <p style={{
                  fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4,
                }}>Aligned with your intentions</p>
              </div>
            </div>

            {/* Suggestions */}
            {result.suggestions.map((s, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                animation: `fadeIn 0.3s ease ${i * 0.1}s both`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: i === 0 ? 'var(--green-subtle)' : 'var(--garden-card)',
                  border: `1px solid ${i === 0 ? 'rgba(122,182,72,0.15)' : 'var(--garden-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1,
                }}>
                  {i === 0 ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--green-400)" stroke="none">
                      <path d="M9 21c0 0-1 0-1-1s1-4 6-4 6 3 6 4-1 1-1 1H9zm6-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                    </svg>
                  ) : (
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: 'var(--text-muted)',
                    }} />
                  )}
                </div>
                <div>
                  {i === 0 && (
                    <p style={{
                      fontSize: 9, color: 'var(--green-400)', fontWeight: 700,
                      letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase',
                    }}>
                      Suggestion
                    </p>
                  )}
                  <p style={{
                    fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
                  }}>{s}</p>
                </div>
              </div>
            ))}

            {/* Corner note */}
            {result.cornerNote && (
              <div style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '12px 14px',
                background: 'var(--garden-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--garden-border)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <p style={{
                  fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6,
                  fontStyle: 'italic',
                }}>{result.cornerNote}</p>
              </div>
            )}

            {/* Suggested Objects Grid */}
            {suggestedPlacements.length > 0 && (
              <div style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--garden-border)',
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--garden-card)',
                  borderBottom: '1px solid var(--garden-border)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  <span style={{
                    fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>Suggested Objects</span>
                </div>
                <div style={{
                  padding: 10, background: 'var(--garden-deep)',
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                }}>
                  {suggestedPlacements.map((item, i) => (
                    <div key={i} style={{
                      background: 'var(--garden-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--garden-border)',
                      padding: '10px 10px 8px',
                      display: 'flex', flexDirection: 'column', gap: 5,
                      transition: 'all var(--duration-normal) var(--ease-out)',
                      cursor: 'pointer',
                      animation: `fadeIn 0.3s ease ${i * 0.08}s both`,
                    }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(122,182,72,0.2)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--garden-border)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        fontSize: 24, textAlign: 'center', lineHeight: 1,
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                      }}>{item.emoji}</div>
                      <p style={{
                        fontSize: 10, fontWeight: 600, color: 'var(--text-primary)',
                        textAlign: 'center', lineHeight: 1.3,
                      }}>{item.name}</p>
                      <p style={{
                        fontSize: 9, color: 'var(--text-muted)', textAlign: 'center',
                        lineHeight: 1.3, marginBottom: 3,
                      }}>{item.description}</p>
                      <button
                        onClick={() => onInstruction(item.instruction)}
                        className="btn-ghost"
                        style={{
                          padding: '4px 0', fontSize: 10, fontWeight: 600,
                          width: '100%',
                        }}
                      >
                        Place
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : refreshing ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 14, paddingTop: 50,
          }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
            <p style={{
              fontSize: 12, color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
            }}>Refreshing insights...</p>
          </div>
        ) : (
          <div style={{
            textAlign: 'center', paddingTop: 60,
            animation: 'fadeIn 0.5s ease',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--garden-card)',
              border: '1px solid var(--garden-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <p style={{
              fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.7,
              padding: '0 12px',
            }}>
              Upload your garden photo and click{' '}
              <em style={{ color: 'var(--green-400)', fontWeight: 500 }}>Start Creating</em>
              {' '}to receive personalised insights.
            </p>
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div style={{
        padding: '14px 18px', borderTop: '1px solid var(--garden-border)',
        flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10,
        background: 'linear-gradient(180deg, var(--garden-deep) 0%, var(--garden-black) 100%)',
      }}>
        {result && (
          <button
            onClick={onProceedToArrange}
            disabled={segmenting}
            className="btn-primary"
            style={{
              width: '100%', padding: '12px 16px',
              fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              ...(segmenting ? {
                background: 'var(--garden-card)',
                color: 'var(--green-400)',
                boxShadow: 'none',
              } : {}),
            }}
          >
            {segmenting ? (
              <>
                <span className="dot" style={{ width: 5, height: 5 }} />
                <span className="dot" style={{ width: 5, height: 5 }} />
                <span className="dot" style={{ width: 5, height: 5 }} />
                <span style={{ marginLeft: 4 }}>Scanning...</span>
              </>
            ) : (
              <>
                Arrange Objects
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </>
            )}
          </button>
        )}

        {/* Flow Mode button */}
        <button
          onClick={onFlowMode}
          disabled={!result}
          className="btn-ghost"
          style={{
            width: '100%', padding: '11px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            ...(!result ? { opacity: 0.25, cursor: 'not-allowed' } : {}),
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: result ? 'var(--green-subtle)' : 'var(--garden-card)',
            border: `1px solid ${result ? 'rgba(122,182,72,0.12)' : 'var(--garden-border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, flexShrink: 0,
            transition: 'all 0.3s',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Enter Flow Mode</div>
            <div style={{
              fontSize: 10, color: result ? 'var(--text-muted)' : 'var(--text-ghost)',
              fontStyle: 'italic',
            }}>Immerse yourself</div>
          </div>
        </button>
      </div>
    </div>
  );
}
