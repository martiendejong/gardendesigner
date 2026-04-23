import type { HistoryItem } from '../lib/types';

interface Props {
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
  onClose: () => void;
}

const TYPE_LABEL: Record<HistoryItem['type'], string> = {
  upload: 'Upload',
  generated: 'Generated',
  instruction: 'Instruction',
};

const TYPE_COLOR: Record<HistoryItem['type'], string> = {
  upload: '#5588cc',
  generated: '#7ab648',
  instruction: '#cc8855',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function HistoryPanel({ history, onRestore, onClose }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: 360, height: '100%',
        background: '#151515', borderLeft: '1px solid #222',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid #222',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#e0e0e0', letterSpacing: '0.05em' }}>HISTORY</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{history.length} item{history.length !== 1 ? 's' : ''}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#666',
              fontSize: 18, cursor: 'pointer', padding: '4px 8px',
              lineHeight: 1,
            }}
          >✕</button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#444', fontSize: 12, marginTop: 40 }}>
              No history yet
            </div>
          ) : (
            history.map((item, i) => (
              <div
                key={item.id}
                style={{
                  background: '#1a1a1a', border: '1px solid #242424',
                  borderRadius: 8, overflow: 'hidden',
                  display: 'flex', gap: 0, flexDirection: 'column',
                }}
              >
                {/* Thumbnail */}
                <div style={{ position: 'relative', height: 140, background: '#111' }}>
                  <img
                    src={item.imageUrl}
                    alt={item.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute', top: 8, left: 8,
                    background: TYPE_COLOR[item.type],
                    color: '#000', fontSize: 9, fontWeight: 700,
                    padding: '2px 7px', borderRadius: 3,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>
                    {TYPE_LABEL[item.type]}
                  </div>
                  {i === 0 && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.6)', color: '#7ab648',
                      fontSize: 9, fontWeight: 700, padding: '2px 7px',
                      borderRadius: 3, letterSpacing: '0.06em',
                    }}>LATEST</div>
                  )}
                </div>

                {/* Info row */}
                <div style={{
                  padding: '8px 12px', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, color: '#ccc', fontWeight: 500,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{formatTime(item.timestamp)}</div>
                  </div>
                  <button
                    onClick={() => onRestore(item)}
                    style={{
                      background: 'rgba(122,182,72,0.1)',
                      border: '1px solid #3a6a28',
                      borderRadius: 5, padding: '4px 12px',
                      color: '#7ab648', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >Restore</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
