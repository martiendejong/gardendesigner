import { useState, useRef, useCallback, useEffect } from 'react';
import { IntentionsPanel } from './components/IntentionsPanel';
import { GardenCanvas } from './components/GardenCanvas';
import { InsightsPanel } from './components/InsightsPanel';
import { ArrangeView } from './components/ArrangeView';
import { HistoryPanel } from './components/HistoryPanel';
import { LoginScreen } from './components/LoginScreen';
import { SetPasswordScreen } from './components/SetPasswordScreen';
import { AdminPanel } from './components/AdminPanel';
import { ProjectsScreen } from './components/ProjectsScreen';
import {
  generateDesign, applyInstruction, placeObjectImage, setAuthToken, getMe,
  getProject, createProject, addProjectHistory, updateProject, getUserProductGroups,
} from './lib/api';
import { useI18n, getLoadingMessages, getApplyMessages } from './lib/i18n';
import type { GardenPreferences, DesignResult, SegmentedObject, HistoryItem, AuthUser, Project, ProductGroup } from './lib/types';

const DEFAULT_PREFS: GardenPreferences = {
  mood: 'tranquil',
  timeOfUse: 'daytime',
  visibility: 'visible',
  sliders: { tranquilVibrant: 0.2, openSheltered: 0.5, lightMass: 0.4, socialSolitary: 0.5 },
};

const ORIGINAL_REFS = /\b(original|origineel|uploaded|begin|base photo|originele foto|terug naar|back to original|start photo|start foto|mijn foto|my photo|van het begin|from the start|eerste foto|first photo)\b/i;
function refersToOriginal(text: string) { return ORIGINAL_REFS.test(text); }
function makeId() { return Math.random().toString(36).slice(2, 10); }

function getPasswordToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

function autoProjectName(): string {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function App() {
  const { lang } = useI18n();

  // Auth state
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  // Screen: 'projects' shows the projects list; 'design' shows the designer
  const [screen, setScreen] = useState<'projects' | 'design'>('projects');

  const passwordToken = getPasswordToken();

  // Garden state
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

  const [userProductGroups, setUserProductGroups] = useState<ProductGroup[]>([]);

  // Project tracking
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  // Keep a ref to the original uploaded image for project creation
  const originalImageRef = useRef<string | null>(null);

  const msgTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('garden_token');
    if (stored) {
      setAuthToken(stored);
      setAuthTokenState(stored);
      getMe()
        .then(user => {
          setCurrentUser(user);
          if (user.isAdmin) setShowAdmin(true);
          getUserProductGroups().then(setUserProductGroups).catch(() => {});
        })
        .catch(() => {
          localStorage.removeItem('garden_token');
          setAuthTokenState(null);
          setAuthToken(null);
        })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  const handleLogin = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem('garden_token', token);
    setAuthToken(token);
    setAuthTokenState(token);
    setCurrentUser(user);
    if (user.isAdmin) setShowAdmin(true);
    getUserProductGroups().then(setUserProductGroups).catch(() => {});
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('garden_token');
    setAuthToken(null);
    setAuthTokenState(null);
    setCurrentUser(null);
    setImageDataUrl(null);
    setImagePreview(null);
    setResult(null);
    setPhase('design');
    setHistory([]);
    setScreen('projects');
    setCurrentProjectId(null);
    originalImageRef.current = null;
  }, []);

  const updateCredits = useCallback((remaining: number) => {
    setCurrentUser(u => u ? { ...u, credits: remaining } : u);
  }, []);

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

  // Save generated image to project (create if needed, add history entry)
  const saveToProject = useCallback(async (imageUrl: string, type: string, label: string) => {
    if (!originalImageRef.current) return;
    try {
      if (currentProjectId === null) {
        const project = await createProject({
          name: autoProjectName(),
          originalImage: originalImageRef.current,
          latestImage: imageUrl,
          preferences,
        });
        setCurrentProjectId(project.id);
        await addProjectHistory(project.id, { imageUrl, type, label });
      } else {
        await addProjectHistory(currentProjectId, { imageUrl, type, label });
        await updateProject(currentProjectId, { preferences });
      }
    } catch {
      // Non-fatal: don't surface project-save errors to the user
    }
  }, [currentProjectId, preferences]);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      setImagePreview(url);
      setImageDataUrl(url);
      setResult(null);
      originalImageRef.current = url;
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
      if (design.creditsRemaining !== undefined) updateCredits(design.creditsRemaining);
      if (design.imageUrl) {
        const label = design.generationMessage || 'Generated design';
        addToHistory(design.imageUrl, 'generated', label);
        await saveToProject(design.imageUrl, 'generated', label);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      if (msg === 'insufficient_credits') setError('You have no credits remaining. Contact your administrator.');
      else setError(msg);
    } finally {
      setGenerating(false);
      stopMessageCycle();
    }
  }, [imageDataUrl, preferences, lang, updateCredits, saveToProject]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstruction = useCallback(async (text: string) => {
    if (!imageDataUrl) return;
    const base = refersToOriginal(text) ? imageDataUrl : (result?.imageUrl ?? imageDataUrl);
    setApplying(true);
    setError(null);
    startMessageCycle(getApplyMessages(lang));
    try {
      const newUrl = await applyInstruction(base, text);
      if (newUrl) {
        const label = text.length > 40 ? text.slice(0, 40) + '…' : text;
        addToHistory(newUrl, 'instruction', label);
        setResult(prev => prev ? { ...prev, imageUrl: newUrl } : {
          imageUrl: newUrl, harmonyLevel: 75,
          generationMessage: 'Applied your instruction.',
          suggestions: [], cornerNote: '',
          suggestedObject: { name: '', description: '', reason: '' },
          imageDescription: '', suggestedPlacements: [],
        });
        await saveToProject(newUrl, 'instruction', label);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Instruction failed';
      if (msg === 'insufficient_credits') setError('You have no credits remaining. Contact your administrator.');
      else setError(msg);
    } finally {
      setApplying(false);
      stopMessageCycle();
    }
  }, [result, imageDataUrl, lang, saveToProject]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlaceObjectImage = useCallback(async (objectDataUrl: string, context: string) => {
    if (!imageDataUrl) return;
    const base = result?.imageUrl ?? imageDataUrl;
    setApplying(true);
    setError(null);
    startMessageCycle(getApplyMessages(lang));
    try {
      const newUrl = await placeObjectImage(base, objectDataUrl, context || undefined);
      if (newUrl) {
        const label = context || 'Object placed from photo';
        addToHistory(newUrl, 'instruction', label);
        setResult(prev => prev ? { ...prev, imageUrl: newUrl } : {
          imageUrl: newUrl, harmonyLevel: 75,
          generationMessage: 'Object placed.',
          suggestions: [], cornerNote: '',
          suggestedObject: { name: '', description: '', reason: '' },
          imageDescription: '', suggestedPlacements: [],
        });
        await saveToProject(newUrl, 'instruction', label);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Placement failed');
    } finally {
      setApplying(false);
      stopMessageCycle();
    }
  }, [result, imageDataUrl, lang, saveToProject]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSliderChange = useCallback((key: keyof GardenPreferences['sliders'], value: number) => {
    setPreferences(p => ({ ...p, sliders: { ...p.sliders, [key]: value } }));
  }, []);

  const handleStyleSelect = useCallback(() => { handleStartCreating(); }, [handleStartCreating]);

  const handleStartOver = useCallback(() => {
    setImageDataUrl(null); setImagePreview(null); setResult(null);
    setPreferences(DEFAULT_PREFS); setPhase('design');
    setGeneratingMessage(''); setError(null);
    setCurrentProjectId(null);
    originalImageRef.current = null;
    setHistory([]);
  }, []);

  const handleNewDesign = useCallback(() => {
    handleStartOver();
    setScreen('design');
  }, [handleStartOver]);

  const handleOpenProject = useCallback(async (project: Project) => {
    try {
      const detail = await getProject(project.id);
      // Restore project state
      setImageDataUrl(detail.originalImage);
      setImagePreview(detail.originalImage);
      originalImageRef.current = detail.originalImage;
      setCurrentProjectId(detail.id);
      if (detail.preferences) setPreferences(detail.preferences);
      // Restore history
      const restored: HistoryItem[] = detail.history.map(h => ({
        id: makeId(),
        imageUrl: h.imageUrl,
        type: h.type as HistoryItem['type'],
        label: h.label,
        timestamp: h.createdAt * 1000,
      }));
      setHistory(restored.slice().reverse()); // newest first
      // Restore latest design result
      if (detail.latestImage) {
        setResult({
          imageUrl: detail.latestImage,
          harmonyLevel: 75,
          generationMessage: 'Previous design loaded.',
          suggestions: [], cornerNote: '',
          suggestedObject: { name: '', description: '', reason: '' },
          imageDescription: '', suggestedPlacements: [],
        });
      }
      setPhase('design');
      setScreen('design');
    } catch {
      setError('Failed to load project. Please try again.');
    }
  }, []);

  const handleRestoreHistory = useCallback((item: HistoryItem) => {
    setImageDataUrl(item.imageUrl);
    setImagePreview(item.imageUrl);
    setResult(prev => prev ? { ...prev, imageUrl: item.imageUrl } : null);
    setShowHistory(false);
  }, []);

  const isWorking = generating || applying;

  // ── Render priority ────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--garden-black)' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="dot" /><span className="dot" /><span className="dot" />
        </div>
      </div>
    );
  }

  if (passwordToken && !authToken) {
    return <SetPasswordScreen token={passwordToken} onComplete={handleLogin} />;
  }

  if (!authToken || !currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Projects list (non-admin users land here first; admins also land here but with admin panel overlay)
  if (screen === 'projects') {
    return (
      <>
        <ProjectsScreen
          currentUser={currentUser}
          onNewDesign={handleNewDesign}
          onOpenProject={handleOpenProject}
          onLogout={handleLogout}
          onAdmin={currentUser.isAdmin ? () => setShowAdmin(true) : undefined}
        />
        {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      </>
    );
  }

  // ArrangeView
  if (phase === 'arrange' && (imageDataUrl || result)) {
    const arrangeImage = result?.imageUrl || imageDataUrl!;
    return (
      <>
        <ArrangeView
          imageUrl={arrangeImage}
          objects={segmentedObjects}
          segmenting={segmenting}
          suggestedPlacements={result?.suggestedPlacements ?? []}
          productGroups={userProductGroups}
          onBack={() => setPhase('design')}
          onInstructionApplied={async (newUrl) => {
            const label = 'Object moved';
            addToHistory(newUrl, 'instruction', label);
            setResult(prev => prev ? { ...prev, imageUrl: newUrl } : {
              imageUrl: newUrl, harmonyLevel: 75,
              generationMessage: 'Object moved.',
              suggestions: [], cornerNote: '',
              suggestedObject: { name: '', description: '', reason: '' },
              imageDescription: '', suggestedPlacements: [],
            });
            await saveToProject(newUrl, 'instruction', label);
          }}
        />
        {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      </>
    );
  }

  // ── Main design app ────────────────────────────────────────────────────────
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
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', fontFamily: 'var(--font-sans)' }}>
            Garden Designer
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Back to projects */}
          <button onClick={() => setScreen('projects')} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 8,
            background: 'transparent', border: '1px solid var(--garden-border)',
            color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            My Gardens
          </button>

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
              New Design
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

          {/* User info + credits */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 12px', borderRadius: 8,
            background: 'var(--garden-card)', border: '1px solid var(--garden-border)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {currentUser.firstname}
            </span>
            {!currentUser.isAdmin && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: currentUser.credits > 0 ? 'var(--green-400)' : '#cc6b55',
                background: currentUser.credits > 0 ? 'var(--green-subtle)' : 'rgba(204,107,85,0.08)',
                padding: '2px 8px', borderRadius: 10,
                border: `1px solid ${currentUser.credits > 0 ? 'rgba(122,182,72,0.2)' : 'rgba(204,107,85,0.2)'}`,
              }}>
                {currentUser.credits} credits
              </span>
            )}
            {currentUser.isAdmin && (
              <button onClick={() => setShowAdmin(true)} style={{
                padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                background: 'var(--green-subtle)', border: '1px solid rgba(122,182,72,0.2)',
                color: 'var(--green-400)', fontSize: 11, fontWeight: 700,
                fontFamily: 'var(--font-sans)',
              }}>Admin</button>
            )}
            <button onClick={handleLogout} title="Sign out" style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
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
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#cc6b55', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
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

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
}
