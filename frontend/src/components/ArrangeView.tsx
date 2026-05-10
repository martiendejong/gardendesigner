import { useState, useRef, useCallback, useEffect } from 'react';
import type { SegmentedObject, SuggestedPlacement } from '../lib/types';
import { applyInstruction, segmentImage, getSuggestions, type GardenSuggestion } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { LeftSidebar, type SidePanel } from './LeftSidebar';
import { BottomToolbar, type DesignTool } from './BottomToolbar';
import { SuggestionsModal } from './SuggestionsModal';

interface Props {
  imageUrl: string;
  objects: SegmentedObject[];
  segmenting: boolean;
  suggestedPlacements: SuggestedPlacement[];
  onBack: () => void;
  onInstructionApplied: (newUrl: string) => void;
}

function posDesc(x: number, y: number): string {
  const h = x < 33 ? 'left side' : x > 66 ? 'right side' : 'center';
  const v = y < 33 ? 'top' : y > 66 ? 'foreground' : 'middle';
  return `${v} ${h}`.trim();
}

function categorize(label: string): 'plants' | 'hardscape' | 'structures' {
  const lower = label.toLowerCase();
  if (/plant|tree|shrub|flower|grass|hedge|rose|fern|moss|ivy|lavender|bush|palm|bamboo|perennial|garden bed/.test(lower)) return 'plants';
  if (/path|patio|wall|fence|stone|gravel|brick|tile|driveway|walkway|deck|pond|water|fountain|pool|pavement|curb/.test(lower)) return 'hardscape';
  return 'structures';
}

function ObjectThumbnail({ imageUrl, x, y, size = 48 }: { imageUrl: string; x: number; y: number; size?: number }) {
  const scale = 6;
  return (
    <div style={{ width: size, height: size, overflow: 'hidden', position: 'relative', borderRadius: 6, flexShrink: 0, background: '#1a2e1a' }}>
      <img
        src={imageUrl}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          width: `${scale * 100}%`,
          height: `${scale * 100}%`,
          left: `${50 - x * scale}%`,
          top: `${50 - y * scale}%`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export function ArrangeView({
  imageUrl, objects, segmenting: initialSegmenting,
  suggestedPlacements, onBack, onInstructionApplied,
}: Props) {
  const { t } = useI18n();
  const [currentImage, setCurrentImage] = useState(imageUrl);
  const [currentObjects, setCurrentObjects] = useState<SegmentedObject[]>(objects);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const init: Record<string, { x: number; y: number }> = {};
    for (const obj of objects) init[obj.id] = { x: obj.x, y: obj.y };
    return init;
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [applying, setApplying] = useState(false);
  const [applyingLabel, setApplyingLabel] = useState('');
  const [rescanning, setRescanning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<DesignTool>('select');
  const [activePanel, setActivePanel] = useState<SidePanel>('overview');
  const [zoom, setZoom] = useState(100);
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [scales, setScales] = useState<Record<string, number>>({});
  const [suggestions, setSuggestions] = useState<GardenSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [implementingSuggestions, setImplementingSuggestions] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const rotateStartAngle = useRef<number | null>(null);
  const scaleStartY = useRef<number | null>(null);

  useEffect(() => {
    setCurrentObjects(objects);
    const init: Record<string, { x: number; y: number }> = {};
    for (const obj of objects) init[obj.id] = { x: obj.x, y: obj.y };
    setPositions(init);
  }, [objects]);

  // Auto-scan on mount when no objects provided
  useEffect(() => {
    if (objects.length === 0 && !initialSegmenting) {
      const doScan = async () => {
        setRescanning(true);
        try {
          const found = await segmentImage(imageUrl);
          if (found.length > 0) {
            setCurrentObjects(found);
            const np: Record<string, { x: number; y: number }> = {};
            for (const o of found) np[o.id] = { x: o.x, y: o.y };
            setPositions(np);
          }
        } finally { setRescanning(false); }
      };
      doScan();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getContainerPercent = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, objId: string) => {
    e.preventDefault(); e.stopPropagation();
    const pos = positions[objId] ?? { x: 50, y: 50 };
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (activeTool === 'select') {
      setSelectedId(prev => prev === objId ? null : objId);
      return;
    }
    if (activeTool === 'delete') {
      setDeleteConfirmId(objId);
      return;
    }
    if (activeTool === 'move') {
      setDragOffset({
        x: ((e.clientX - rect.left) / rect.width) * 100 - pos.x,
        y: ((e.clientY - rect.top) / rect.height) * 100 - pos.y,
      });
      setDraggingId(objId);
      dragStartPos.current = { x: pos.x, y: pos.y };
    } else if (activeTool === 'rotate') {
      const centerX = rect.left + (pos.x / 100) * rect.width;
      const centerY = rect.top + (pos.y / 100) * rect.height;
      rotateStartAngle.current = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      setDraggingId(objId);
      dragStartPos.current = pos;
    } else if (activeTool === 'scale') {
      scaleStartY.current = e.clientY;
      setDraggingId(objId);
    }
  }, [activeTool, positions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId) return;
    const pos = positions[draggingId] ?? { x: 50, y: 50 };
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (activeTool === 'move') {
      const pct = getContainerPercent(e.clientX, e.clientY);
      setPositions(prev => ({
        ...prev,
        [draggingId]: { x: Math.max(2, Math.min(98, pct.x - dragOffset.x)), y: Math.max(2, Math.min(98, pct.y - dragOffset.y)) },
      }));
    } else if (activeTool === 'rotate' && rotateStartAngle.current !== null) {
      const centerX = rect.left + (pos.x / 100) * rect.width;
      const centerY = rect.top + (pos.y / 100) * rect.height;
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const delta = (currentAngle - rotateStartAngle.current) * (180 / Math.PI);
      setRotations(prev => ({ ...prev, [draggingId]: (prev[draggingId] ?? 0) + delta }));
      rotateStartAngle.current = currentAngle;
    } else if (activeTool === 'scale' && scaleStartY.current !== null) {
      const deltaY = scaleStartY.current - e.clientY;
      setScales(prev => ({ ...prev, [draggingId]: Math.max(0.3, Math.min(3, (prev[draggingId] ?? 1) + deltaY / 100)) }));
      scaleStartY.current = e.clientY;
    }
  }, [draggingId, activeTool, dragOffset, getContainerPercent, positions]);

  const handleMouseUp = useCallback(async () => {
    if (!draggingId) return;
    const finalPos = positions[draggingId];
    const startPos = dragStartPos.current;
    const id = draggingId;
    const finalRotation = rotations[id] ?? 0;
    const finalScale = scales[id] ?? 1;

    setDraggingId(null);
    dragStartPos.current = null;
    rotateStartAngle.current = null;
    scaleStartY.current = null;

    const obj = currentObjects.find(o => o.id === id);
    if (!obj) return;

    let instruction = '';
    if (activeTool === 'move' && finalPos && startPos) {
      if (Math.abs(finalPos.x - startPos.x) < 3 && Math.abs(finalPos.y - startPos.y) < 3) return;
      instruction = `Move the ${obj.label} from the ${posDesc(startPos.x, startPos.y)} to the ${posDesc(finalPos.x, finalPos.y)}. Keep everything else exactly as it is.`;
    } else if (activeTool === 'rotate' && Math.abs(finalRotation) > 5) {
      const dir = finalRotation > 0 ? 'clockwise' : 'counterclockwise';
      instruction = `Rotate the ${obj.label} approximately ${Math.abs(Math.round(finalRotation))} degrees ${dir}. Keep everything else exactly as it is.`;
      setRotations(prev => { const n = { ...prev }; delete n[id]; return n; });
    } else if (activeTool === 'scale' && Math.abs(finalScale - 1) > 0.1) {
      instruction = finalScale > 1
        ? `Make the ${obj.label} noticeably larger. Keep everything else exactly as it is.`
        : `Make the ${obj.label} noticeably smaller. Keep everything else exactly as it is.`;
      setScales(prev => { const n = { ...prev }; delete n[id]; return n; });
    } else {
      return;
    }

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
            const np: Record<string, { x: number; y: number }> = {};
            for (const o of newObjects) np[o.id] = { x: o.x, y: o.y };
            setPositions(np);
          }
        } finally { setRescanning(false); }
      }
    } finally { setApplying(false); setApplyingLabel(''); }
  }, [draggingId, activeTool, positions, rotations, scales, currentObjects, currentImage, onInstructionApplied]);

  const handleDeleteConfirm = useCallback(async (obj: SegmentedObject) => {
    setDeleteConfirmId(null);
    if (selectedId === obj.id) setSelectedId(null);
    const instruction = `Remove the ${obj.label} from the ${posDesc(obj.x, obj.y)}. Keep everything else exactly as it is.`;
    setApplying(true);
    setApplyingLabel(obj.label);
    try {
      const newUrl = await applyInstruction(currentImage, instruction);
      if (newUrl) {
        setCurrentImage(newUrl);
        onInstructionApplied(newUrl);
        setCurrentObjects(prev => prev.filter(o => o.id !== obj.id));
        setPositions(prev => { const next = { ...prev }; delete next[obj.id]; return next; });
      }
    } finally { setApplying(false); setApplyingLabel(''); }
  }, [currentImage, onInstructionApplied, selectedId]);

  const handlePlaceSuggested = useCallback(async (item: SuggestedPlacement) => {
    setApplying(true);
    setApplyingLabel(item.name);
    try {
      const newUrl = await applyInstruction(currentImage, item.instruction);
      if (newUrl) {
        setCurrentImage(newUrl);
        onInstructionApplied(newUrl);
      }
    } finally { setApplying(false); setApplyingLabel(''); }
  }, [currentImage, onInstructionApplied]);

  const handleAIRecommend = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const found = await getSuggestions(currentImage);
      setSuggestions(found);
      setShowSuggestions(true);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [currentImage]);

  const handleImplementSuggestions = useCallback(async (selected: GardenSuggestion[]) => {
    if (selected.length === 0) return;
    const combinedInstruction = selected.map(s => s.instruction).join(' ');
    setImplementingSuggestions(true);
    try {
      const newUrl = await applyInstruction(currentImage, combinedInstruction);
      if (newUrl) {
        setCurrentImage(newUrl);
        onInstructionApplied(newUrl);
        setShowSuggestions(false);
        setSuggestions([]);
        setRescanning(true);
        try {
          const newObjects = await segmentImage(newUrl);
          if (newObjects.length > 0) {
            setCurrentObjects(newObjects);
            const np: Record<string, { x: number; y: number }> = {};
            for (const o of newObjects) np[o.id] = { x: o.x, y: o.y };
            setPositions(np);
          }
        } finally { setRescanning(false); }
      }
    } finally { setImplementingSuggestions(false); }
  }, [currentImage, onInstructionApplied]);

  const filteredObjects = (activePanel === 'overview' || activePanel === 'layers' || activePanel === 'ai-assist')
    ? currentObjects
    : currentObjects.filter(o => categorize(o.label) === (activePanel as 'plants' | 'hardscape' | 'structures'));

  const isWorking = applying || rescanning;
  const selectedObj = selectedId ? currentObjects.find(o => o.id === selectedId) : null;
  const deleteObj = deleteConfirmId ? currentObjects.find(o => o.id === deleteConfirmId) : null;

  const toolCursor = activeTool === 'delete' ? 'crosshair'
    : activeTool === 'select' ? 'default'
    : activeTool === 'move' ? (draggingId ? 'grabbing' : 'grab')
    : 'grab';

  const panelTitle = activeTool === 'add-plant' ? 'Add Plant'
    : activeTool === 'select' && selectedObj ? 'Selected Object'
    : activePanel === 'overview' ? `All Objects (${currentObjects.length})`
    : activePanel === 'plants' ? `Plants (${filteredObjects.length})`
    : activePanel === 'hardscape' ? `Hardscape (${filteredObjects.length})`
    : activePanel === 'structures' ? `Structures (${filteredObjects.length})`
    : 'Objects';

  const statusHint = activeTool === 'move' ? 'Drag an object to move it to a new location.'
    : activeTool === 'rotate' ? 'Drag an object to rotate it.'
    : activeTool === 'scale' ? 'Drag up/down on an object to resize it.'
    : activeTool === 'delete' ? 'Click an object to delete it.'
    : activeTool === 'add-plant' ? 'Select a plant from the panel to add it.'
    : 'Click an object to select and inspect it.';

  return (
    <div style={{
      height: '100%', background: 'var(--garden-black)',
      display: 'flex', flexDirection: 'column', color: 'var(--text-primary)',
    }}>

      {/* Header */}
      <div style={{
        padding: '0 20px', height: 52, flexShrink: 0,
        borderBottom: '1px solid var(--garden-border)',
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'linear-gradient(180deg, var(--garden-surface) 0%, var(--garden-deep) 100%)',
      }}>
        <button onClick={onBack} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {t('arrange.backToDesign')}
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
          {t('arrange.title')}
        </span>
        <button disabled style={{
          background: 'var(--garden-card)', border: '1px solid var(--garden-border)',
          borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
          fontSize: 12, padding: '6px 14px', cursor: 'not-allowed',
          fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {t('arrange.generateViews')}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left sidebar */}
        <LeftSidebar active={activePanel} onSelect={setActivePanel} />

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--garden-black)' }}>
          <div
            ref={containerRef}
            style={{ position: 'relative', width: '100%', height: '100%', userSelect: 'none', cursor: toolCursor }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={currentImage}
              alt="Garden arrange"
              draggable={false}
              style={{
                width: '100%', height: '100%', objectFit: 'contain', display: 'block',
                opacity: isWorking ? 0.4 : 1, transition: 'opacity 0.4s var(--ease-out)', pointerEvents: 'none',
                transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                transformOrigin: 'center center',
              }}
            />

            {!isWorking && currentObjects.map(obj => {
              const pos = positions[obj.id] ?? { x: obj.x, y: obj.y };
              const isDragging = draggingId === obj.id;
              const isSelected = selectedId === obj.id;
              const rotation = rotations[obj.id] ?? 0;
              const scale = scales[obj.id] ?? 1;
              return (
                <div
                  key={obj.id}
                  onMouseDown={e => handleMouseDown(e, obj.id)}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale}${isDragging ? ' scale(1.08)' : ''})`,
                    cursor: toolCursor,
                    zIndex: isDragging || isSelected ? 100 : 10,
                    transition: isDragging ? 'none' : 'left 0.1s, top 0.1s, transform 0.15s var(--ease-spring)',
                  }}
                >
                  <div style={{
                    background: isSelected
                      ? 'rgba(122,182,72,0.2)'
                      : isDragging ? 'rgba(122,182,72,0.9)' : 'rgba(15,26,18,0.85)',
                    border: (isSelected || isDragging) ? '1.5px solid var(--green-400)' : '1px solid rgba(122,182,72,0.15)',
                    borderRadius: 'var(--radius-xl)', padding: '5px 10px',
                    display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                    backdropFilter: 'blur(8px)',
                    boxShadow: (isSelected || isDragging) ? '0 4px 20px rgba(122,182,72,0.4)' : 'var(--shadow-md)',
                    transition: 'all 0.15s var(--ease-out)',
                  }}>
                    <span style={{ fontSize: 14 }}>{obj.emoji}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: isDragging ? '#fff' : isSelected ? 'var(--green-300)' : 'var(--text-primary)',
                    }}>{obj.label}</span>
                  </div>
                </div>
              );
            })}

            {isWorking && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14,
                background: 'rgba(6,10,7,0.5)', backdropFilter: 'blur(2px)', animation: 'fadeIn 0.3s ease',
              }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
                <p style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 300, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                  {rescanning ? t('arrange.rescanning2') : `${t('arrange.moving')} ${applyingLabel}...`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{
          width: 220, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(180deg, var(--garden-surface) 0%, var(--garden-deep) 100%)',
          borderLeft: '1px solid var(--garden-border)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 14px 10px', flexShrink: 0,
            borderBottom: '1px solid var(--garden-border)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-400)', letterSpacing: '0.06em' }}>
              {panelTitle}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* Select tool + object selected → show details */}
            {activeTool === 'select' && selectedObj ? (
              <div style={{ padding: 14 }}>
                <ObjectThumbnail imageUrl={currentImage} x={selectedObj.x} y={selectedObj.y} size={80} />
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{selectedObj.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{selectedObj.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
                    Position: {Math.round(selectedObj.x)}%, {Math.round(selectedObj.y)}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'capitalize' }}>
                    Category: {categorize(selectedObj.label)}
                  </div>
                  <button
                    onClick={() => setDeleteConfirmId(selectedObj.id)}
                    disabled={isWorking}
                    style={{
                      width: '100%', padding: '8px 0', borderRadius: 6, border: '1px solid rgba(204,107,85,0.25)',
                      background: 'rgba(204,107,85,0.08)', color: '#cc6b55',
                      fontSize: 11, fontWeight: 600, cursor: isWorking ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Delete Object
                  </button>
                </div>
              </div>

            /* Add Plant tool → show suggested placements */
            ) : activeTool === 'add-plant' ? (
              <div>
                {suggestedPlacements.length === 0 ? (
                  <p style={{ padding: '24px 14px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
                    No suggestions available. Go back and generate a design first.
                  </p>
                ) : suggestedPlacements.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                    borderBottom: '1px solid var(--garden-border)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                      background: 'var(--green-subtle)',
                      border: '1px solid rgba(122,182,72,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>{item.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{item.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
                    </div>
                    <button
                      onClick={() => handlePlaceSuggested(item)}
                      disabled={isWorking}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        background: 'transparent', border: '1.5px solid rgba(122,182,72,0.4)',
                        color: 'var(--green-400)', cursor: isWorking ? 'not-allowed' : 'pointer',
                        fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: isWorking ? 0.5 : 1,
                      }}
                    >+</button>
                  </div>
                ))}
              </div>

            /* Default → filtered object list with thumbnails */
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8 }}>
                {filteredObjects.length === 0 ? (
                  <p style={{ padding: '20px 6px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
                    {currentObjects.length === 0
                      ? 'No objects scanned yet.'
                      : `No ${activePanel} objects found.`}
                  </p>
                ) : filteredObjects.map(obj => (
                  <div
                    key={obj.id}
                    onClick={() => { setSelectedId(obj.id); setActiveTool('select'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                      borderRadius: 8, cursor: 'pointer',
                      background: selectedId === obj.id ? 'rgba(122,182,72,0.1)' : 'var(--garden-card)',
                      border: `1px solid ${selectedId === obj.id ? 'rgba(122,182,72,0.25)' : 'var(--garden-border)'}`,
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { if (selectedId !== obj.id) { e.currentTarget.style.background = 'var(--garden-surface)'; e.currentTarget.style.borderColor = 'rgba(122,182,72,0.12)'; } }}
                    onMouseLeave={e => { if (selectedId !== obj.id) { e.currentTarget.style.background = 'var(--garden-card)'; e.currentTarget.style.borderColor = 'var(--garden-border)'; } }}
                  >
                    <ObjectThumbnail imageUrl={currentImage} x={obj.x} y={obj.y} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>{obj.label}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{categorize(obj.label)}</div>
                    </div>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{obj.emoji}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <BottomToolbar
        activeTool={activeTool}
        onToolChange={tool => {
          setActiveTool(tool);
          if (tool === 'add-plant') setActivePanel('plants');
          if (tool !== 'select') setSelectedId(null);
        }}
        onAIRecommend={handleAIRecommend}
        generating={loadingSuggestions}
        applying={isWorking}
        hasImage={true}
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(z + 10, 200))}
        onZoomOut={() => setZoom(z => Math.max(z - 10, 50))}
        harmonyLevel={null}
        suggestion={statusHint}
      />

      {/* Scanning status bar */}
      {initialSegmenting && (
        <div style={{
          padding: '6px 20px', flexShrink: 0,
          background: 'var(--garden-black)', borderTop: '1px solid var(--garden-border)',
          fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="dot" style={{ width: 4, height: 4 }} />
          <span>{t('arrange.identifying')}</span>
        </div>
      )}

      {/* AI Suggestions modal */}
      {showSuggestions && suggestions.length > 0 && (
        <SuggestionsModal
          suggestions={suggestions}
          implementing={implementingSuggestions}
          onImplement={handleImplementSuggestions}
          onClose={() => { setShowSuggestions(false); setSuggestions([]); }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteObj && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'var(--garden-surface)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--garden-border)', padding: '24px 28px',
            minWidth: 280, boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.15s ease',
          }}>
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 12 }}>{deleteObj.emoji}</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8 }}>
              Delete {deleteObj.label}?
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
              This will generate a new image with the object removed and add it to history.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  background: 'var(--garden-card)', border: '1px solid var(--garden-border)',
                  color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(deleteObj)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  background: 'rgba(204,107,85,0.15)', border: '1px solid rgba(204,107,85,0.3)',
                  color: '#cc6b55', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
