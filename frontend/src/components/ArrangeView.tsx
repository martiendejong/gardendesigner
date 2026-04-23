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

  // Sync positions when objects change (e.g. initial load)
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
    if (dx < 3 && dy < 3) return; // no-op: barely moved

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
        // Re-segment to update object positions
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
      background: '#111',
      display: 'flex',
      flexDirection: 'column',
      color: '#e0e0e0',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            color: '#888',
            fontSize: 12,
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >
          ← Back to Design
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#c0c0c0' }}>
          Arrange Objects
        </span>
        <button
          disabled
          style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            color: '#444',
            fontSize: 12,
            padding: '6px 12px',
            cursor: 'not-allowed',
          }}
        >
          Generate Views →
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Canvas area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a0a0a' }}>
          {/* Image + overlays container */}
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
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
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                opacity: isWorking ? 0.5 : 1,
                transition: 'opacity 0.3s',
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
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'grab',
                    zIndex: isDragging ? 100 : 10,
                    transition: isDragging ? 'none' : 'left 0.1s, top 0.1s',
                  }}
                >
                  <div style={{
                    background: isDragging
                      ? 'rgba(122, 182, 72, 0.9)'
                      : isHighlighted
                        ? 'rgba(122, 182, 72, 0.8)'
                        : 'rgba(20, 20, 20, 0.82)',
                    border: isDragging || isHighlighted
                      ? '2px solid #7ab648'
                      : '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 20,
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(4px)',
                    boxShadow: isHighlighted ? '0 0 12px rgba(122,182,72,0.6)' : '0 2px 8px rgba(0,0,0,0.5)',
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 13 }}>{obj.emoji}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: isDragging || isHighlighted ? '#fff' : '#d0d0d0',
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
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: 'rgba(0,0,0,0.4)',
              }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
                <p style={{ fontSize: 14, color: '#e0e0e0', fontWeight: 300 }}>
                  Moving {applyingLabel}...
                </p>
              </div>
            )}

            {/* Segmenting overlay */}
            {rescanning && !applying && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: 'rgba(0,0,0,0.4)',
              }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
                <p style={{ fontSize: 14, color: '#e0e0e0', fontWeight: 300 }}>
                  Re-scanning objects...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{
          width: 220,
          flexShrink: 0,
          borderLeft: '1px solid #1e1e1e',
          display: 'flex',
          flexDirection: 'column',
          background: '#111',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid #1a1a1a',
            fontSize: 11,
            fontWeight: 700,
            color: '#7ab648',
            letterSpacing: '0.06em',
          }}>
            OBJECTS ({currentObjects.length})
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {currentObjects.map(obj => (
              <div
                key={obj.id}
                onMouseEnter={() => setHighlightedId(obj.id)}
                onMouseLeave={() => setHighlightedId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: highlightedId === obj.id ? 'rgba(122,182,72,0.08)' : '#161616',
                  border: `1px solid ${highlightedId === obj.id ? '#3a6a28' : '#222'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{obj.emoji}</span>
                <span style={{ flex: 1, fontSize: 11, color: '#c0c0c0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {obj.label}
                </span>
                <button
                  onClick={() => handleRemoveObject(obj)}
                  disabled={isWorking}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#555',
                    fontSize: 14,
                    cursor: isWorking ? 'not-allowed' : 'pointer',
                    padding: '0 2px',
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                  title={`Remove ${obj.label}`}
                >
                  ×
                </button>
              </div>
            ))}

            {currentObjects.length === 0 && (
              <p style={{ fontSize: 11, color: '#444', textAlign: 'center', paddingTop: 20 }}>
                No objects identified
              </p>
            )}
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid #1a1a1a', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 10, color: '#555' }}>
              Drag objects on the canvas to move them.
            </p>
            <button
              onClick={handleRescan}
              disabled={isWorking}
              style={{
                padding: '7px 0',
                background: isWorking ? '#161616' : 'rgba(122,182,72,0.08)',
                border: `1px solid ${isWorking ? '#222' : '#3a6a28'}`,
                borderRadius: 6,
                color: isWorking ? '#444' : '#7ab648',
                fontSize: 11,
                fontWeight: 600,
                cursor: isWorking ? 'not-allowed' : 'pointer',
              }}
            >
              {rescanning ? 'Scanning...' : 'Re-scan Objects'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div style={{
        padding: '8px 20px',
        borderTop: '1px solid #1a1a1a',
        background: '#0e0e0e',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        fontSize: 11,
        color: '#555',
      }}>
        {applying ? (
          <>
            <span className="dot" style={{ width: 5, height: 5 }} />
            <span style={{ color: '#888' }}>Moving {applyingLabel}...</span>
          </>
        ) : rescanning ? (
          <>
            <span className="dot" style={{ width: 5, height: 5 }} />
            <span style={{ color: '#888' }}>Re-scanning objects...</span>
          </>
        ) : initialSegmenting ? (
          <>
            <span className="dot" style={{ width: 5, height: 5 }} />
            <span style={{ color: '#888' }}>Identifying objects...</span>
          </>
        ) : (
          <span>{currentObjects.length} objects identified</span>
        )}
      </div>
    </div>
  );
}
