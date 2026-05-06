import { useState, useRef, useCallback, useEffect } from 'react';
import type { SegmentedObject } from '../lib/types';
import { applyInstruction, segmentImage } from '../lib/api';

interface Props {
  imageUrl: string;
  objects: SegmentedObject[];
  segmenting: boolean;
  onBack: () => void;
  onInstructionApplied: (newUrl: string) => void;
}

function posDesc(x: number, y: number): string {
  const h = x < 33 ? 'left side' : x > 66 ? 'right side' : 'center';
  const v = y < 33 ? 'top' : y > 66 ? 'foreground' : 'middle';
  return `${v} ${h}`.trim();
}

export function ArrangeView({ imageUrl, objects, segmenting: initialSegmenting, onBack, onInstructionApplied }: Props) {
  const [currentImage, setCurrentImage] = useState(imageUrl);
  const [currentObjects, setCurrentObjects] = useState<SegmentedObject[]>(objects);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const init: Record<string, { x: number; y: number }> = {};
    for (const obj of objects) {
      init[obj.id] = { x: obj.x, y: obj.y };
    }
    return init;
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [applying, setApplying] = useState(false);
  const [applyingLabel, setApplyingLabel] = useState('');
  const [rescanning, setRescanning] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setCurrentObjects(objects);
    const init: Record<string, { x: number; y: number }> = {};
    for (const obj of objects) {
      init[obj.id] = { x: obj.x, y: obj.y };
    }
    setPositions(init);
  }, [objects]);

  const getContainerPercent = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, objId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = positions[objId] ?? { x: 50, y: 50 };
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseXPct = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseYPct = ((e.clientY - rect.top) / rect.height) * 100;
    setDragOffset({ x: mouseXPct - pos.x, y: mouseYPct - pos.y });
    setDraggingId(objId);
    dragStartPos.current = { x: pos.x, y: pos.y };
  }, [positions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId) return;
    const pct = getContainerPercent(e.clientX, e.clientY);
    setPositions(prev => ({
      ...prev,
      [draggingId]: {
        x: Math.max(2, Math.min(98, pct.x - dragOffset.x)),
        y: Math.max(2, Math.min(98, pct.y - dragOffset.y)),
      },
    }));
  }, [draggingId, dragOffset, getContainerPercent]);

  const handleMouseUp = useCallback(async (_e: React.MouseEvent) => {
    if (!draggingId) return;
    const finalPos = positions[draggingId];
    const startPos = dragStartPos.current;
    const id = draggingId;
    setDraggingId(null);
    dragStartPos.current = null;

    if (!finalPos || !startPos) return;

    const dx = Math.abs(finalPos.x - startPos.x);
    const dy = Math.abs(finalPos.y - startPos.y);
    if (dx < 3 && dy < 3) return;

    const obj = currentObjects.find(o => o.id === id);
    if (!obj) return;

    const instruction = `Move the ${obj.label} from the ${posDesc(startPos.x, startPos.y)} to the ${posDesc(finalPos.x, finalPos.y)}. Keep everything else exactly as it is.`;

    setApplying(true);
    setApplyingLabel(obj.label);
    try {
      const newUrl = await applyInstruction(currentImage, instruction);
      if (newUrl) {
        setCurrentImage(newUrl);
        onInstructionApplied(newUrl);
        setRescanning(true);
        try {
          const newObjects = await segmentImage(newUrl);
          if (newObjects.length > 0) {
            setCurrentObjects(newObjects);
            const newPositions: Record<string, { x: number; y: number }> = {};
            for (const o of newObjects) {
              newPositions[o.id] = { x: o.x, y: o.y };
            }
            setPositions(newPositions);
          }
        } finally {
          setRescanning(false);
        }
      }
    } finally {
      setApplying(false);
      setApplyingLabel('');
    }
  }, [draggingId, positions, currentObjects, currentImage, onInstructionApplied]);

  const handleRescan = useCallback(async () => {
    setRescanning(true);
    try {
      const newObjects = await segmentImage(currentImage);
      if (newObjects.length > 0) {
        setCurrentObjects(newObjects);
        const newPositions: Record<string, { x: number; y: number }> = {};
        for (const o of newObjects) {
          newPositions[o.id] = { x: o.x, y: o.y };
        }
        setPositions(newPositions);
      }
    } finally {
      setRescanning(false);
    }
  }, [currentImage]);

  const handleRemoveObject = useCallback(async (obj: SegmentedObject) => {
    const instruction = `Remove the ${obj.label} from the ${posDesc(obj.x, obj.y)}. Keep everything else exactly as it is.`;
    setApplying(true);
    setApplyingLabel(obj.label);
    try {
      const newUrl = await applyInstruction(currentImage, instruction);
      if (newUrl) {
        setCurrentImage(newUrl);
        onInstructionApplied(newUrl);
        setCurrentObjects(prev => prev.filter(o => o.id !== obj.id));
        setPositions(prev => {
          const next = { ...prev };
          delete next[obj.id];
          return next;
        });
      }
    } finally {
      setApplying(false);
      setApplyingLabel('');
    }
  }, [currentImage, onInstructionApplied]);

  const isWorking = applying || rescanning;

  return (
    <div style={{
      height: '100%',
      background: 'var(--garden-black)',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--text-primary)',
    }}>
      {/* Header */}
      <div style={{
        padding: '0 24px', height: 52,
        borderBottom: '1px solid var(--garden-border)',
        display: 'flex', alignItems: 'center', gap: 14,
        flexShrink: 0,
        background: 'linear-gradient(180deg, var(--garden-surface) 0%, var(--garden-deep) 100%)',
      }}>
        <button
          onClick={onBack}
          className="btn-ghost"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', fontSize: 12,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Design
        </button>
        <span style={{
          flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600,
          color: 'var(--text-secondary)', letterSpacing: '0.04em',
        }}>
          Arrange Objects
        </span>
        <button
          disabled
          style={{
            background: 'var(--garden-card)',
            border: '1px solid var(--garden-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
            fontSize: 12, padding: '6px 14px',
            cursor: 'not-allowed',
            fontFamily: 'var(--font-sans)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          Generate Views
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Canvas area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--garden-black)' }}>
          <div
            ref={containerRef}
            style={{
              position: 'relative', width: '100%', height: '100%',
              userSelect: 'none',
              cursor: draggingId ? 'grabbing' : 'default',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Background image */}
            <img
              src={currentImage}
              alt="Garden arrange"
              style={{
                width: '100%', height: '100%', objectFit: 'contain', display: 'block',
                opacity: isWorking ? 0.4 : 1,
                transition: 'opacity 0.4s var(--ease-out)',
                pointerEvents: 'none',
              }}
            />

            {/* Object overlays */}
            {!isWorking && currentObjects.map(obj => {
              const pos = positions[obj.id] ?? { x: obj.x, y: obj.y };
              const isDragging = draggingId === obj.id;
              const isHighlighted = highlightedId === obj.id;
              return (
                <div
                  key={obj.id}
                  onMouseDown={e => handleMouseDown(e, obj.id)}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}%`, top: `${pos.y}%`,
                    transform: `translate(-50%, -50%) ${isDragging ? 'scale(1.08)' : 'scale(1)'}`,
                    cursor: 'grab',
                    zIndex: isDragging ? 100 : 10,
                    transition: isDragging ? 'none' : 'left 0.1s, top 0.1s, transform 0.15s var(--ease-spring)',
                  }}
                >
                  <div style={{
                    background: isDragging
                      ? 'rgba(122, 182, 72, 0.9)'
                      : isHighlighted
                        ? 'rgba(122, 182, 72, 0.15)'
                        : 'rgba(15, 26, 18, 0.85)',
                    border: isDragging || isHighlighted
                      ? '1.5px solid var(--green-400)'
                      : '1px solid rgba(122,182,72,0.15)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '5px 10px',
                    display: 'flex', alignItems: 'center', gap: 5,
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(8px)',
                    boxShadow: isDragging
                      ? '0 4px 20px rgba(122,182,72,0.4)'
                      : isHighlighted
                        ? 'var(--shadow-glow)'
                        : 'var(--shadow-md)',
                    transition: 'all 0.15s var(--ease-out)',
                  }}>
                    <span style={{ fontSize: 14, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>{obj.emoji}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: isDragging ? '#fff' : isHighlighted ? 'var(--green-300)' : 'var(--text-primary)',
                    }}>
                      {obj.label}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Applying overlay */}
            {applying && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14,
                background: 'rgba(6,10,7,0.5)',
                backdropFilter: 'blur(2px)',
                animation: 'fadeIn 0.3s ease',
              }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
                <p style={{
                  fontSize: 15, color: 'var(--text-primary)', fontWeight: 300,
                  fontFamily: 'var(--font-display)', fontStyle: 'italic',
                }}>
                  Moving {applyingLabel}...
                </p>
              </div>
            )}

            {/* Rescanning overlay */}
            {rescanning && !applying && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14,
                background: 'rgba(6,10,7,0.5)',
                backdropFilter: 'blur(2px)',
                animation: 'fadeIn 0.3s ease',
              }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
                <p style={{
                  fontSize: 15, color: 'var(--text-primary)', fontWeight: 300,
                  fontFamily: 'var(--font-display)', fontStyle: 'italic',
                }}>
                  Re-scanning objects...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{
          width: 230, flexShrink: 0,
          borderLeft: '1px solid var(--garden-border)',
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(180deg, var(--garden-surface) 0%, var(--garden-deep) 100%)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--garden-border)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--green-400)',
              boxShadow: '0 0 6px var(--green-glow)',
            }} />
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--green-400)',
              letterSpacing: '0.08em',
            }}>
              OBJECTS ({currentObjects.length})
            </span>
          </div>

          <div style={{
            flex: 1, overflowY: 'auto', padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            {currentObjects.map((obj, i) => (
              <div
                key={obj.id}
                onMouseEnter={() => setHighlightedId(obj.id)}
                onMouseLeave={() => setHighlightedId(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: highlightedId === obj.id ? 'var(--green-subtle)' : 'var(--garden-card)',
                  border: `1px solid ${highlightedId === obj.id ? 'rgba(122,182,72,0.15)' : 'var(--garden-border)'}`,
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                  animation: `fadeIn 0.2s ease ${i * 0.05}s both`,
                }}
              >
                <span style={{
                  fontSize: 17, flexShrink: 0,
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                }}>{obj.emoji}</span>
                <span style={{
                  flex: 1, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {obj.label}
                </span>
                <button
                  onClick={() => handleRemoveObject(obj)}
                  disabled={isWorking}
                  style={{
                    background: 'transparent', border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 15, cursor: isWorking ? 'not-allowed' : 'pointer',
                    padding: '0 3px', lineHeight: 1, flexShrink: 0,
                    transition: 'color 0.15s',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => { if (!isWorking) e.currentTarget.style.color = 'var(--coral)'; }}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  title={`Remove ${obj.label}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}

            {currentObjects.length === 0 && (
              <p style={{
                fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 24,
                fontFamily: 'var(--font-display)', fontStyle: 'italic',
              }}>
                No objects identified
              </p>
            )}
          </div>

          <div style={{
            padding: '12px 14px', borderTop: '1px solid var(--garden-border)',
            flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Drag objects on the canvas to reposition them.
            </p>
            <button
              onClick={handleRescan}
              disabled={isWorking}
              className="btn-ghost"
              style={{
                width: '100%', padding: '8px 0',
                fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {rescanning ? (
                <>
                  <span className="dot" style={{ width: 4, height: 4 }} />
                  <span className="dot" style={{ width: 4, height: 4 }} />
                  <span className="dot" style={{ width: 4, height: 4 }} />
                  <span style={{ marginLeft: 4 }}>Scanning...</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  Re-scan Objects
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div style={{
        padding: '8px 24px', height: 36,
        borderTop: '1px solid var(--garden-border)',
        background: 'var(--garden-black)',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
        fontSize: 11, color: 'var(--text-muted)',
      }}>
        {applying ? (
          <>
            <span className="dot" style={{ width: 4, height: 4 }} />
            <span style={{ color: 'var(--text-secondary)' }}>Moving {applyingLabel}...</span>
          </>
        ) : rescanning ? (
          <>
            <span className="dot" style={{ width: 4, height: 4 }} />
            <span style={{ color: 'var(--text-secondary)' }}>Re-scanning objects...</span>
          </>
        ) : initialSegmenting ? (
          <>
            <span className="dot" style={{ width: 4, height: 4 }} />
            <span style={{ color: 'var(--text-secondary)' }}>Identifying objects...</span>
          </>
        ) : (
          <>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--green-400)',
              boxShadow: '0 0 4px var(--green-glow)',
            }} />
            <span>{currentObjects.length} objects identified</span>
          </>
        )}
      </div>
    </div>
  );
}
