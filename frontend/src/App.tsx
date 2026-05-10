import { useState, useRef, useCallback } from 'react';
import { IntentionsPanel } from './components/IntentionsPanel';
import { GardenCanvas } from './components/GardenCanvas';
import { InsightsPanel } from './components/InsightsPanel';
import { ArrangeView } from './components/ArrangeView';
import { HistoryPanel } from './components/HistoryPanel';
import { generateDesign, applyInstruction, placeObjectImage } from './lib/api';
import { useI18n, getLoadingMessages, getApplyMessages } from './lib/i18n';
import type { GardenPreferences, DesignResult, SegmentedObject, HistoryItem } from './lib/types';

const DEFAULT_PREFS: GardenPreferences = {
  mood: 'tranquil',
  timeOfUse: 'daytime',
  visibility: 'visible',
  sliders: { tranquilVibrant: 0.2, openSheltered: 0.5, lightMass: 0.4, socialSolitary: 0.5 },
};

const ORIGINAL_REFS = /\b(original|origineel|uploaded|begin|base photo|originele foto|terug naar|back to original|start photo|start foto|mijn foto|my photo|van het begin|from the start|eerste foto|first photo)\b/i;
function refersToOriginal(text: string) { return ORIGINAL_REFS.test(text); }
function makeId() { return Math.random().toString(36).slice(2, 10); }

export default function App() {
  const { lang } = useI18n();

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<GardenPreferences>(DEFAULT_PREFS);
  const [result, setResult] = useState<DesignResult | null>(null);

  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingMessage, setGeneratingMessage] = useState('');

  const [phase, setPhase] = useState<'design' | 'arrange'>('design');
  const [segmenting] = useState(false);
  const [segmentedObjects] = useState<SegmentedObject[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const msgTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setImagePreview(url);
      setImageDataUrl(url);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleStartCreating = useCallback(async () => {
    if (!imageDataUrl) return;
    setGenerating(true);
    setError(null);
    startMessageCycle(getLoadingMessages(lang));
    try {
      const design = await generateDesign(imageDataUrl, preferences);
      setResult(design);
      if (design.imageUrl) addToHistory(design.imageUrl, 'generated', design.generationMessage || 'Generated design');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
      stopMessageCycle();
    }
  }, [imageDataUrl, preferences, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstruction = useCallback(async (text: string) => {
    if (!imageDataUrl) return;
    const base = refersToOriginal(text) ? imageDataUrl : (result?.imageUrl ?? imageDataUrl);
    setApplying(true);
    setError(null);
    startMessageCycle(getApplyMessages(lang));
    try {
      const newUrl = await applyInstruction(base, text);
      if (newUrl) {
        addToHistory(newUrl, 'instruction', text.length > 40 ? text.slice(0, 40) + '…' : text);
        setResult(prev => prev ? { ...prev, imageUrl: newUrl } : {
          imageUrl: newUrl, harmonyLevel: 75,
          generationMessage: 'Applied your instruction.',
          suggestions: [], cornerNote: '',
          suggestedObject: { name: '', description: '', reason: '' },
          imageDescription: '', suggestedPlacements: [],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Instruction failed');
    } finally {
      setApplying(false);
      stopMessageCycle();
    }
  }, [result, imageDataUrl, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlaceObjectImage = useCallback(async (objectDataUrl: string, context: string) => {
    if (!imageDataUrl) return;
    const base = result?.imageUrl ?? imageDataUrl;
    setApplying(true);
    setError(null);
    startMessageCycle(getApplyMessages(lang));
    try {
      const newUrl = await placeObjectImage(base, objectDataUrl, context || undefined);
      if (newUrl) {
        addToHistory(newUrl, 'instruction', context || 'Object placed from photo');
        setResult(prev => prev ? { ...prev, imageUrl: newUrl } : {
          imageUrl: newUrl, harmonyLevel: 75,
          generationMessage: 'Object placed.',
          suggestions: [], cornerNote: '',
          suggestedObject: { name: '', description: '', reason: '' },
          imageDescription: '', suggestedPlacements: [],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Placement failed');
    } finally {
      setApplying(false);
      stopMessageCycle();
    }
  }, [result, imageDataUrl, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSliderChange = useCallback((key: keyof GardenPreferences['sliders'], value: number) => {
    setPreferences(p => ({ ...p, sliders: { ...p.sliders, [key]: value } }));
  }, []);

  const handleStyleSelect = useCallback((_style: 'contemplative' | 'social' | 'evening') => {
    handleStartCreating();
  }, [handleStartCreating]);

  const handleStartOver = useCallback(() => {
    setImageDataUrl(null);
    setImagePreview(null);
    setResult(null);
    setPreferences(DEFAULT_PREFS);
    setPhase('design');
    setGeneratingMessage('');
    setError(null);
  }, []);

  const handleRestoreHistory = useCallback((item: HistoryItem) => {
    setImageDataUrl(item.imageUrl);
    setImagePreview(item.imageUrl);
    setResult(prev => prev ? { ...prev, imageUrl: item.imageUrl } : null);
    setShowHistory(false);
  }, []);

  const isWorking = generating || applying;

  if (phase === 'arrange' && (imageDataUrl || result)) {
    const arrangeImage = result?.imageUrl || imageDataUrl!;
    return (
      <ArrangeView
        imageUrl={arrangeImage}
        objects={segmentedObjects}
        segmenting={segmenting}
        suggestedPlacements={result?.suggestedPlacements ?? []}
        onBack={() => setPhase('design')}
        onInstructionApplied={(newUrl) => {
          addToHistory(newUrl, 'instruction', 'Object moved');
          setResult(prev => prev ? { ...prev, imageUrl: newUrl } : {
            imageUrl: newUrl, harmonyLevel: 75,
            generationMessage: 'Object moved.',
            suggestions: [], cornerNote: '',
            suggestedObject: { name: '', description: '', reason: '' },
            imageDescription: '', suggestedPlacements: [],
          });
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--garden-black)' }}>

      {/* Header */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', borderBottom: '1px solid var(--garden-border)',
        background: 'linear-gradient(180deg, var(--garden-surface) 0%, var(--garden-deep) 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #7ab648 0%, #4a8c28 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(122,182,72,0.3)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22V12" /><path d="M12 12C12 6.5 6 4 3 6" /><path d="M12 12C12 6.5 18 4 21 6" />
            </svg>
          </div>
          <span style={{
            fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: '-0.01em', fontFamily: 'var(--font-sans)',
          }}>
            Garden Designer
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {imageDataUrl && (
            <button onClick={handleStartOver} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8,
              background: 'transparent', border: '1px solid rgba(204,107,85,0.3)',
              color: 'rgba(204,107,85,0.7)', fontSize: 12, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
              </svg>
              Start Over
            </button>
          )}
          {history.length > 0 && (
            <button onClick={() => setShowHistory(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: 'transparent', border: '1px solid var(--garden-border)',
              color: 'var(--text-tertiary)', fontSize: 12, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              History ({history.length})
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '7px 20px', background: 'rgba(204,107,85,0.1)',
          borderBottom: '1px solid rgba(204,107,85,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: '#cc6b55' }}>{error}</span>
          <button onClick={() => setError(null)} style={{
            background: 'none', border: 'none', color: '#cc6b55',
            cursor: 'pointer', fontSize: 16, lineHeight: 1,
          }}>×</button>
        </div>
      )}

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
          onPlaceObjectImage={handlePlaceObjectImage}
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
          refreshing={isWorking}
          placing={false}
          hasImage={!!imageDataUrl}
          onFlowMode={() => {}}
          onPlaceObject={() => {}}
          suggestedPlacements={result?.suggestedPlacements ?? []}
          onInstruction={handleInstruction}
          onProceedToArrange={() => setPhase('arrange')}
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
