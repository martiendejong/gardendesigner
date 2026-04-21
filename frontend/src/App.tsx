import { useState, useRef, useCallback } from 'react';
import { IntentionsPanel } from './components/IntentionsPanel';
import { GardenCanvas } from './components/GardenCanvas';
import { InsightsPanel } from './components/InsightsPanel';
import { generateDesign, refreshInsights, applyInstruction } from './lib/api';
import type { GardenPreferences, DesignResult } from './lib/types';

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

  const msgTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sliderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    startMessageCycle(LOADING_MESSAGES);
    try {
      const design = await generateDesign(imageDataUrl, preferences);
      setResult(design);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
      stopMessageCycle();
    }
  }, [imageDataUrl, preferences]);

  // Chat instruction — applies to current result image (or original if no result yet)
  const handleInstruction = useCallback(async (text: string) => {
    const base = result?.imageUrl ?? imageDataUrl;
    if (!base) return;
    setApplying(true);
    setError(null);
    startMessageCycle(APPLY_MESSAGES);
    try {
      const newUrl = await applyInstruction(base, text);
      if (newUrl) {
        setResult(prev => prev ? { ...prev, imageUrl: newUrl } : {
          imageUrl: newUrl,
          harmonyLevel: 75,
          generationMessage: 'Applied your instruction.',
          suggestions: [],
          cornerNote: '',
          suggestedObject: { name: '', description: '', reason: '' },
          imageDescription: '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Instruction failed');
    } finally {
      setApplying(false);
      stopMessageCycle();
    }
  }, [result, imageDataUrl]);

  // Place Object — constructs a natural placement instruction from the suggestion
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
      if (newUrl) setResult(prev => prev ? { ...prev, imageUrl: newUrl } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Placement failed');
    } finally {
      setPlacing(false);
    }
  }, [result, imageDataUrl]);

  // Adjust — user edits the placement instruction before executing
  const handleAdjust = useCallback(async (instruction: string) => {
    const base = result?.imageUrl ?? imageDataUrl;
    if (!base) return;
    setPlacing(true);
    setError(null);
    try {
      const newUrl = await applyInstruction(base, instruction);
      if (newUrl) setResult(prev => prev ? { ...prev, imageUrl: newUrl } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adjustment failed');
    } finally {
      setPlacing(false);
    }
  }, [result, imageDataUrl]);

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

  if (flowMode && result) {
    return (
      <div style={{ height: '100%', position: 'relative', background: '#000', cursor: 'pointer' }}
        onClick={() => setFlowMode(false)}>
        <img src={result.imageUrl} alt="Flow mode" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 40 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>CLICK TO EXIT FLOW MODE</p>
        </div>
        <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 300, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>{result.generationMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111', color: '#e0e0e0' }}>
      <header style={{
        padding: '10px 20px', borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <span style={{ fontWeight: 800, color: '#7ab648', fontSize: 15, letterSpacing: '0.12em' }}>JENGO</span>
        <span style={{ color: '#4a4a4a', fontSize: 13 }}>Garden Experience AI</span>
        {error && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#e05050', background: 'rgba(200,50,50,0.1)', padding: '3px 10px', borderRadius: 4 }}>
            {error}
          </span>
        )}
      </header>

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
          onAdjust={handleAdjust}
        />
      </div>
    </div>
  );
}
