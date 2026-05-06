import type { HistoryItem } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
  onClose: () => void;
}

const TYPE_LABEL_KEY: Record<HistoryItem['type'], string> = {
  upload: 'history.upload',
  generated: 'history.generated',
  instruction: 'history.instruction',
};

const TYPE_COLOR: Record<HistoryItem['type'], string> = {
  upload: '#5588cc',
  generated: '#7ab648',
  instruction: '#c8a04e',
};

const TYPE_BG: Record<HistoryItem['type'], string> = {
  upload: 'rgba(85,136,204,0.15)',
  generated: 'rgba(122,182,72,0.15)',
  instruction: 'rgba(200,160,78,0.15)',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function HistoryPanel({ history, onRestore, onClose }: Props) {
  const { t } = useI18n();
  const countLabel = history.length === 1 ? t('history.items') : t('history.items_plural');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(6,10,7,0.75)',
        backdropFilter: 'blur(4px)',
      }} />

      <div className="marble" style={{
        position: 'relative', zIndex: 1,
        width: 380, height: '100%',
        background: 'linear-gradient(180deg, var(--garden-surface) 0%, var(--garden-deep) 100%)',
        borderLeft: '1px solid var(--garden-border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-12px 0 48px rgba(0,0,0,0.5)',
        animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--garden-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', zIndex: 1,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', letterSpacing: '0.08em' }}>
              {t('history.title')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>
              {history.length} {countLabel}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--garden-card)', border: '1px solid var(--garden-border)',
            color: 'var(--text-tertiary)', width: 32, height: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 14,
            transition: 'all var(--duration-fast) var(--ease-out)',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--garden-border-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--garden-border)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', padding: 14,
          display: 'flex', flexDirection: 'column', gap: 12,
          position: 'relative', zIndex: 1,
        }}>
          {history.length === 0 ? (
            <div style={{
              textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 50,
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
            }}>
              {t('history.empty')}
            </div>
          ) : (
            history.map((item, i) => (
              <div key={item.id} style={{
                background: 'var(--garden-card)',
                border: '1px solid var(--garden-border)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                transition: 'all var(--duration-normal) var(--ease-out)',
                animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--garden-border-hover)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--garden-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ position: 'relative', height: 150, background: 'var(--garden-black)' }}>
                  <img src={item.imageUrl} alt={item.label} style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  }} />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
                    background: 'linear-gradient(transparent, rgba(19,31,22,0.8))',
                  }} />
                  <div style={{
                    position: 'absolute', top: 10, left: 10,
                    background: TYPE_BG[item.type], backdropFilter: 'blur(8px)',
                    color: TYPE_COLOR[item.type], fontSize: 9, fontWeight: 700,
                    padding: '3px 9px', borderRadius: 'var(--radius-sm)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    border: `1px solid ${TYPE_COLOR[item.type]}22`,
                  }}>
                    {t(TYPE_LABEL_KEY[item.type] as any)}
                  </div>
                  {i === 0 && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      background: 'rgba(122,182,72,0.15)', backdropFilter: 'blur(8px)',
                      color: 'var(--green-400)',
                      fontSize: 9, fontWeight: 700, padding: '3px 9px',
                      borderRadius: 'var(--radius-sm)', letterSpacing: '0.08em',
                      border: '1px solid rgba(122,182,72,0.15)',
                    }}>{t('history.latest')}</div>
                  )}
                </div>

                <div style={{
                  padding: '10px 14px', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, color: 'var(--text-primary)', fontWeight: 500,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                      {formatTime(item.timestamp)}
                    </div>
                  </div>
                  <button onClick={() => onRestore(item)} className="btn-ghost" style={{ padding: '5px 14px', fontSize: 11 }}>
                    {t('history.restore')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
