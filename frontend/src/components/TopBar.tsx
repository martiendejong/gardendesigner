import { useState } from 'react';

interface Props {
  historyCount: number;
  hasResult: boolean;
  onHistory: () => void;
}

export function TopBar({ historyCount, hasResult, onHistory }: Props) {
  const [tab, setTab] = useState<'design' | 'plan' | 'visualize'>('design');

  return (
    <header style={{
      height: 48, flexShrink: 0,
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 12,
      background: '#070c08',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      zIndex: 20, position: 'relative',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, marginRight: 6 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'linear-gradient(135deg, #7ab648 0%, #4a8c28 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 14px rgba(122,182,72,0.25)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22V12" /><path d="M12 12C12 7 7 4 3 6" /><path d="M12 12C12 7 17 4 21 6" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#e8f5e0', letterSpacing: '0.01em', lineHeight: 1.1 }}>jengo</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', lineHeight: 1 }}>Plant Design Studio</div>
        </div>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 700,
          marginLeft: 2,
        }}>i</div>
      </div>

      {/* Nav tabs */}
      <div style={{
        display: 'flex', background: 'rgba(255,255,255,0.05)',
        borderRadius: 9, padding: '3px', gap: 2,
      }}>
        {(['Design', 'Plan', 'Visualize'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t.toLowerCase() as typeof tab)}
            style={{
              padding: '5px 16px', borderRadius: 7, border: 'none',
              background: tab === t.toLowerCase() ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: tab === t.toLowerCase() ? '#e8ece9' : 'rgba(255,255,255,0.38)',
              fontSize: 12, fontWeight: tab === t.toLowerCase() ? 600 : 400,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* History */}
      <button onClick={onHistory} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: historyCount > 0 ? 'rgba(122,182,72,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${historyCount > 0 ? 'rgba(122,182,72,0.15)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 7, padding: '5px 12px',
        color: historyCount > 0 ? '#7ab648' : 'rgba(255,255,255,0.3)',
        fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        History
        {historyCount > 0 && (
          <span style={{
            background: 'linear-gradient(135deg, #7ab648, #5a9a30)',
            color: '#fff', fontSize: 9, fontWeight: 700,
            borderRadius: 8, padding: '1px 6px',
          }}>{historyCount}</span>
        )}
      </button>

      <button style={{
        padding: '6px 16px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.09)',
        background: 'transparent', color: 'rgba(255,255,255,0.55)',
        fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)',
      }}>Save</button>

      <button disabled={!hasResult} style={{
        padding: '6px 16px', borderRadius: 7, border: 'none',
        background: hasResult ? 'linear-gradient(135deg, #7ab648, #5a9a30)' : 'rgba(255,255,255,0.06)',
        color: hasResult ? '#fff' : 'rgba(255,255,255,0.25)',
        fontSize: 12, fontWeight: 600, cursor: hasResult ? 'pointer' : 'not-allowed',
        fontFamily: 'var(--font-sans)',
        boxShadow: hasResult ? '0 2px 8px rgba(122,182,72,0.25)' : 'none',
      }}>Export Plan</button>
    </header>
  );
}
