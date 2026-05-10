import { useState } from 'react';
import type { GardenSuggestion } from '../lib/api';

interface Props {
  suggestions: GardenSuggestion[];
  implementing: boolean;
  onImplement: (selected: GardenSuggestion[]) => void;
  onClose: () => void;
}

export function SuggestionsModal({ suggestions, implementing, onImplement, onClose }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(suggestions.map(s => [s.id, true]))
  );

  const selected = suggestions.filter(s => checked[s.id]);
  const toggleAll = () => {
    const allOn = selected.length === suggestions.length;
    setChecked(Object.fromEntries(suggestions.map(s => [s.id, !allOn])));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: 'var(--garden-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--garden-border)',
        width: 480, maxWidth: '95vw', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
        animation: 'fadeIn 0.2s ease',
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid var(--garden-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--green-subtle)',
              border: '1px solid rgba(122,182,72,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>AI Suggestions</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{suggestions.length} improvements found</div>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={implementing}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: 20, cursor: implementing ? 'not-allowed' : 'pointer', lineHeight: 1,
              padding: 4, opacity: implementing ? 0.4 : 1,
            }}
          >×</button>
        </div>

        {/* Suggestions list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {suggestions.map((s, i) => (
            <label
              key={s.id}
              style={{
                display: 'flex', gap: 12, padding: '10px 22px',
                cursor: implementing ? 'not-allowed' : 'pointer',
                background: checked[s.id] ? 'rgba(122,182,72,0.04)' : 'transparent',
                borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                transition: 'background 0.15s',
                userSelect: 'none',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                background: checked[s.id] ? 'var(--green-400)' : 'var(--garden-card)',
                border: `1.5px solid ${checked[s.id] ? 'var(--green-400)' : 'var(--garden-border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
                pointerEvents: 'none',
              }}>
                {checked[s.id] && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                checked={!!checked[s.id]}
                disabled={implementing}
                onChange={() => setChecked(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                style={{ display: 'none' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: checked[s.id] ? 'var(--text-primary)' : 'var(--text-muted)',
                  marginBottom: 3, transition: 'color 0.15s',
                }}>{s.title}</div>
                <div style={{
                  fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5,
                  opacity: checked[s.id] ? 1 : 0.6, transition: 'opacity 0.15s',
                }}>{s.description}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid var(--garden-border)',
          display: 'flex', gap: 10, alignItems: 'center',
          flexShrink: 0,
          background: 'linear-gradient(180deg, var(--garden-deep) 0%, var(--garden-black) 100%)',
        }}>
          <button
            onClick={toggleAll}
            disabled={implementing}
            style={{
              padding: '8px 14px', borderRadius: 8,
              background: 'var(--garden-card)', border: '1px solid var(--garden-border)',
              color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 600,
              cursor: implementing ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', flexShrink: 0,
              opacity: implementing ? 0.5 : 1,
            }}
          >
            {selected.length === suggestions.length ? 'Deselect All' : 'Select All'}
          </button>

          <div style={{ flex: 1 }} />

          <button
            onClick={onClose}
            disabled={implementing}
            style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'transparent', border: '1px solid var(--garden-border)',
              color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
              cursor: implementing ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              opacity: implementing ? 0.5 : 1,
            }}
          >
            Cancel
          </button>

          <button
            onClick={() => selected.length > 0 && onImplement(selected)}
            disabled={implementing || selected.length === 0}
            className="btn-primary"
            style={{
              padding: '9px 18px', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: selected.length === 0 ? 0.4 : 1,
            }}
          >
            {implementing ? (
              <>
                <span className="dot" style={{ width: 5, height: 5 }} />
                <span className="dot" style={{ width: 5, height: 5 }} />
                <span className="dot" style={{ width: 5, height: 5 }} />
                <span style={{ marginLeft: 4 }}>Implementing…</span>
              </>
            ) : (
              `Implement ${selected.length} Suggestion${selected.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
