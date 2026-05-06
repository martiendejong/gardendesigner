import { useState, useRef, useCallback } from 'react';
import { IntentionsPanel } from './components/IntentionsPanel';
import { GardenCanvas } from './components/GardenCanvas';
import { InsightsPanel } from './components/InsightsPanel';
import { ArrangeView } from './components/ArrangeView';
import { HistoryPanel } from './components/HistoryPanel';
import { generateDesign, refreshInsights, applyInstruction, segmentImage } from './lib/api';
import type { GardenPreferences, DesignResult, SegmentedObject, HistoryItem } from './lib/types';

const DEFAULT_PREFS: GardenPreferences = {
  mood: 'tranquil',
  timeOfUse: 'daytime',
  visibility: 'visible',
  sliders: { tranquilVibrant: 0.2, openSheltered: 0.5, lightMass: 0.4, socialSolitary: 0.5 },
};

const LOADING_MESSAGES = [
  'Analyzing your garden space...',
  'Understanding your intentions...',
  'Designing your sanctuary...',
  'Shaping light and shadow...',
  'Adding the finishing touches...',
];

const APPLY_MESSAGES = [
  'Applying your instruction...',
  'Blending with your garden...',
  'Finalising the edit...',
];

// Keywords that signal the user wants to work from the original uploaded photo
const ORIGINAL_REFS = /\b(original|origineel|uploaded|begin|base photo|originele foto|terug naar|back to original|start photo|start foto|mijn foto|my photo|van het begin|from the start|eerste foto|first photo)\b/i;

function refersToOriginal(text: string): boolean {
  return ORIGINAL_REFS.test(text);
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<GardenPreferences>(DEFAULT_PREFS);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<DesignResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingMessage, setGeneratingMessage] = useState(LOADING_MESSAGES[0]);
  const [flowMode, setFlowMode] = useState(false);
  const [phase, setPhase] = useState<'design' | 'arrange'>('design');
  const [segmenting, setSegmenting] = useState(false);
  const [segmentedObjects, setSegmentedObjects] = useState<SegmentedObject[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const msgTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sliderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function addToHistory(imageUrl: string, type: HistoryItem['type'], label: string) {
    setHistory(prev => [{ id: makeId(), imageUrl, type, label, timestamp: Date.now() }, ...prev]);
  }

  function startMessageCycle(messages: string[]) {
    let i = 0;
    setGeneratingMessage(messages[0]);
    msgTimer.current = setInterval(() => {
      i = (i + 1) % messages.length;
      setGeneratingMessage(messages[i]);
    }, 2200);
  }

  function stopMessageCycle() {
    if (msgTimer.current) { clearInterval(msgTimer.current); msgTimer.current = null; }
  }

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      if (imageDataUrl) addToHistory(imageDataUrl, 'upload', 'Uploaded photo');
      setImagePreview(url);
      setImageDataUrl(url);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, [imageDataUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartCreating = useCallback(async () => {
    if (!imageDataUrl) return;
    setGenerating(true);
    setError(null);
    startMessageCycle(LOADING_MESSAGES);
    try {
      const imageToUse = result?.imageUrl ?? imageDataUrl;
      const design = await generateDesign(imageToUse, preferences);
      setResult(design);
      if (design.imageUrl) addToHistory(design.imageUrl, 'generated', design.generationMessage || 'Generated design');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
      stopMessageCycle();
    }
  }, [imageDataUrl, result, preferences]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstruction = useCallback(async (text: string) => {
    if (!imageDataUrl) return;
    const base = refersToOriginal(text) ? imageDataUrl : (result?.imageUrl ?? imageDataUrl);
    setApplying(true);
    setError(null);
    startMessageCycle(APPLY_MESSAGES);
    try {
      const newUrl = await applyInstruction(base, text);
      if (newUrl) {
        addToHistory(newUrl, 'instruction', text.length > 40 ? text.slice(0, 40) + '…' : text);
        setResult(prev => prev ? { ...prev, imageUrl: newUrl } : {
          imageUrl: newUrl,
          harmonyLevel: 75,
          generationMessage: 'Applied your instruction.',
          suggestions: [],
          cornerNote: '',
          suggestedObject: { name: '', description: '', reason: '' },
          imageDescription: '',
          suggestedPlacements: [],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Instruction failed');
    } finally {
      setApplying(false);
      stopMessageCycle();
    }
  }, [result, imageDataUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlaceObject = useCallback(async () => {
    if (!result?.suggestedObject?.name) return;
    const base = result.imageUrl ?? imageDataUrl;
    if (!base) return;
    const { name, description } = result.suggestedObject;
    const instruction = `Place a ${name} (${description}) in the most natural and suitable spot in this garden.`;
    setPlacing(true);
    setError(null);
    try {
      const newUrl = await applyInstruction(base, instruction);
      if (newUrl) {
        addToHistory(newUrl, 'instruction', `Placed: ${name}`);
        setResult(prev => prev ? { ...prev, imageUrl: newUrl } : prev);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Placement failed');
    } finally {
      setPlacing(false);
    }
  }, [result, imageDataUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProceedToArrange = useCallback(async () => {
    if (!result) return;
    setSegmenting(true);
    try {
      const objects = await segmentImage(result.imageUrl);
      setSegmentedObjects(objects);
      setPhase('arrange');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Segmentation failed');
    } finally {
      setSegmenting(false);
    }
  }, [result]);

  const handleRestoreHistory = useCallback((item: HistoryItem) => {
    setImageDataUrl(item.imageUrl);
    setImagePreview(item.imageUrl);
    setResult(prev => prev ? { ...prev, imageUrl: item.imageUrl } : null);
    setShowHistory(false);
  }, []);

  const handleSliderChange = useCallback((key: keyof GardenPreferences['sliders'], value: number) => {
    const updated = { ...preferences, sliders: { ...preferences.sliders, [key]: value } };
    setPreferences(updated);
    if (result) {
      if (sliderTimer.current) clearTimeout(sliderTimer.current);
      sliderTimer.current = setTimeout(async () => {
        setRefreshing(true);
        try {
          const ins = await refreshInsights(result.imageDescription, updated);
          setResult(prev => prev ? { ...prev, ...ins } : prev);
        } finally {
          setRefreshing(false);
        }
      }, 900);
    }
  }, [preferences, result]);

  const handleStyleSelect = useCallback((style: 'contemplative' | 'social' | 'evening') => {
    const map: Record<string, Partial<GardenPreferences>> = {
      contemplative: { mood: 'tranquil', timeOfUse: 'morning', sliders: { ...preferences.sliders, tranquilVibrant: 0.1, socialSolitary: 0.8 } },
      social:        { mood: 'social',   timeOfUse: 'daytime', sliders: { ...preferences.sliders, tranquilVibrant: 0.7, socialSolitary: 0.15 } },
      evening:       { mood: 'intimate', timeOfUse: 'evening', sliders: { ...preferences.sliders, openSheltered: 0.7,  lightMass: 0.25 } },
    };
    setPreferences(prev => ({ ...prev, ...map[style] } as GardenPreferences));
  }, [preferences.sliders]);

  const isWorking = generating || applying || placing;

  if (phase === 'arrange' && result) {
    return (
      <ArrangeView
        imageUrl={result.imageUrl}
        objects={segmentedObjects}
        segmenting={segmenting}
        onBack={() => setPhase('design')}
        onInstructionApplied={(newUrl) => {
          addToHistory(newUrl, 'instruction', 'Object moved');
          setResult(prev => prev ? { ...prev, imageUrl: newUrl } : prev);
        }}
      />
    );
  }

  if (flowMode && result) {
    return (
      <div style={{
        height: '100%', position: 'relative', background: '#000', cursor: 'pointer',
        overflow: 'hidden',
      }}
        onClick={() => setFlowMode(false)}>
        <img src={result.imageUrl} alt="Flow mode" style={{
          width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9,
          transition: 'opacity 1s ease',
        }} />
        {/* Vignette overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 50,
        }}>
          <p style={{
            fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em',
            textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
          }}>Click to exit flow mode</p>
        </div>
        <div style={{ position: 'absolute', top: 30, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{
            fontSize: 24, fontWeight: 300, color: 'rgba(255,255,255,0.75)',
            letterSpacing: '0.03em', fontFamily: 'var(--font-display)', fontStyle: 'italic',
            textShadow: '0 2px 40px rgba(0,0,0,0.8)',
          }}>{result.generationMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--garden-black)', color: 'var(--text-primary)',
    }}>
      {/* ── Premium Header ── */}
      <header style={{
        padding: '0 24px', height: 52, flexShrink: 0,
        borderBottom: '1px solid var(--garden-border)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(180deg, rgba(15,26,18,0.95) 0%, rgba(6,10,7,0.98) 100%)',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo glow dot */}
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--green-400)',
            boxShadow: '0 0 8px var(--green-glow), 0 0 20px rgba(122,182,72,0.15)',
            animation: 'breathe 3s ease-in-out infinite',
          }} />
          <span style={{
            fontWeight: 800, color: 'var(--green-400)', fontSize: 14,
            letterSpacing: '0.16em', fontFamily: 'var(--font-sans)',
          }}>JENGO</span>
          <span style={{
            color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 400,
            letterSpacing: '0.04em',
          }}>Garden Experience AI</span>
        </div>

        {/* Subtle separator line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent 0%, rgba(122,182,72,0.1) 30%, rgba(122,182,72,0.1) 70%, transparent 100%)',
        }} />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {error && (
            <span style={{
              fontSize: 11, color: 'var(--coral)',
              background: 'rgba(204,107,85,0.08)',
              padding: '4px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(204,107,85,0.15)',
              fontWeight: 500,
            }}>
              {error}
            </span>
          )}
          <button
            onClick={() => setShowHistory(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: history.length > 0 ? 'var(--green-subtle)' : 'transparent',
              border: `1px solid ${history.length > 0 ? 'rgba(122,182,72,0.15)' : 'var(--garden-border)'}`,
              borderRadius: 'var(--radius-md)', padding: '6px 14px',
              color: history.length > 0 ? 'var(--green-400)' : 'var(--text-muted)',
              fontSize: 12, cursor: 'pointer', fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              transition: 'all var(--duration-normal) var(--ease-out)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>History</span>
            {history.length > 0 && (
              <span style={{
                background: 'linear-gradient(135deg, var(--green-400), var(--green-500))',
                color: '#fff', fontSize: 10, fontWeight: 700,
                borderRadius: 10, padding: '1px 7px', minWidth: 18, textAlign: 'center',
                boxShadow: '0 0 8px rgba(122,182,72,0.3)',
              }}>{history.length}</span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <IntentionsPanel
          preferences={preferences}
          imagePreview={imagePreview}
          hasImage={!!imageDataUrl}
          generating={generating}
          applying={applying}
          onImageUpload={handleImageUpload}
          onMoodChange={v => setPreferences(p => ({ ...p, mood: v }))}
          onTimeChange={v => setPreferences(p => ({ ...p, timeOfUse: v }))}
          onVisibilityChange={v => setPreferences(p => ({ ...p, visibility: v }))}
          onStartCreating={handleStartCreating}
          onInstruction={handleInstruction}
        />

        <GardenCanvas
          imagePreview={imagePreview}
          result={result}
          generating={isWorking}
          generatingMessage={generatingMessage}
          preferences={preferences}
          onSliderChange={handleSliderChange}
          onStyleSelect={handleStyleSelect}
        />

        <InsightsPanel
          result={result}
          refreshing={refreshing}
          placing={placing}
          onFlowMode={() => setFlowMode(true)}
          onPlaceObject={handlePlaceObject}
          suggestedPlacements={result?.suggestedPlacements ?? []}
          onInstruction={handleInstruction}
          onProceedToArrange={handleProceedToArrange}
          segmenting={segmenting}
        />
      </div>

      {showHistory && (
        <HistoryPanel
          history={history}
          onRestore={handleRestoreHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
