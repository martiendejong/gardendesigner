import { useRef, useState, useEffect } from 'react';
import type { GardenPreferences } from '../lib/types';

interface Props {
  preferences: GardenPreferences;
  imagePreview: string | null;
  hasImage: boolean;
  generating: boolean;
  applying: boolean;
  onImageUpload: (file: File) => void;
  onMoodChange: (v: GardenPreferences['mood']) => void;
  onTimeChange: (v: GardenPreferences['timeOfUse']) => void;
  onVisibilityChange: (v: GardenPreferences['visibility']) => void;
  onStartCreating: () => void;
  onInstruction: (text: string) => void;
}

const MOODS: { value: GardenPreferences['mood']; label: string; bg: string }[] = [
  { value: 'tranquil', label: 'Tranquil', bg: 'linear-gradient(160deg, #1e3d2f 0%, #0e2218 100%)' },
  { value: 'social',   label: 'Social',   bg: 'linear-gradient(160deg, #3d2e1e 0%, #221808 100%)' },
  { value: 'intimate', label: 'Intimate', bg: 'linear-gradient(160deg, #2a1e3d 0%, #160d22 100%)' },
];

const TIMES: { value: GardenPreferences['timeOfUse']; label: string; bg: string }[] = [
  { value: 'morning', label: 'Morning', bg: 'linear-gradient(160deg, #3d3c1e 0%, #222108 100%)' },
  { value: 'daytime', label: 'Daytime', bg: 'linear-gradient(160deg, #1e2e3d 0%, #0e1822 100%)' },
  { value: 'evening', label: 'Evening', bg: 'linear-gradient(160deg, #1e1e2d 0%, #0d0d18 100%)' },
];

export function IntentionsPanel({
  preferences, imagePreview, hasImage, generating, applying,
  onImageUpload, onMoodChange, onTimeChange, onVisibilityChange,
  onStartCreating, onInstruction,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState('');
  const [lastSent, setLastSent] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Show ✓ briefly after instruction applied
  useEffect(() => {
    if (!applying && lastSent) {
      setConfirmed(true);
      const t = setTimeout(() => { setConfirmed(false); setLastSent(''); }, 2000);
      return () => clearTimeout(t);
    }
  }, [applying, lastSent]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) onImageUpload(f);
  }

  function submit() {
    const text = draft.trim();
    if (!text || applying || generating) return;
    setLastSent(text);
    setDraft('');
    onInstruction(text);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  const canSend = hasImage && !!draft.trim() && !applying && !generating;

  return (
    <div style={{
      width: 260, flexShrink: 0,
      borderRight: '1px solid #1e1e1e',
      display: 'flex', flexDirection: 'column',
      background: '#111', overflow: 'hidden',
    }}>
      {/* Scrollable controls section */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: '#7ab648', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Set Your Intentions
        </h2>

        {/* Upload zone */}
        <div>
          <p style={{ fontSize: 11, color: '#666', marginBottom: 7 }}>Upload your garden photo</p>
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            style={{
              border: `1px dashed ${imagePreview ? '#333' : '#2a2a2a'}`,
              borderRadius: 8, minHeight: 76, cursor: 'pointer',
              overflow: 'hidden', background: '#141414',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Your garden" style={{ width: '100%', height: 76, objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#444', fontSize: 11 }}>
                <div style={{ fontSize: 22, marginBottom: 3 }}>+</div>
                Click or drop photo
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onImageUpload(f); }} />
        </div>

        {/* Mood */}
        <div>
          <p style={{ fontSize: 11, color: '#666', marginBottom: 7 }}>How do you want to feel?</p>
          <div style={{ display: 'flex', gap: 5 }}>
            {MOODS.map(m => (
              <button key={m.value} onClick={() => onMoodChange(m.value)} style={{
                flex: 1, border: preferences.mood === m.value ? '1px solid #7ab648' : '1px solid #242424',
                borderRadius: 7, background: m.bg, cursor: 'pointer', padding: 0, overflow: 'hidden',
              }}>
                <div style={{ height: 38 }} />
                <div style={{ background: 'rgba(0,0,0,0.45)', padding: '3px 0', textAlign: 'center' }}>
                  <span style={{ fontSize: 9, color: preferences.mood === m.value ? '#7ab648' : '#999' }}>{m.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Time of use */}
        <div>
          <p style={{ fontSize: 11, color: '#666', marginBottom: 7 }}>When will you use this space?</p>
          <div style={{ display: 'flex', gap: 5 }}>
            {TIMES.map(t => (
              <button key={t.value} onClick={() => onTimeChange(t.value)} style={{
                flex: 1, border: preferences.timeOfUse === t.value ? '1px solid #7ab648' : '1px solid #242424',
                borderRadius: 7, background: t.bg, cursor: 'pointer', padding: 0, overflow: 'hidden',
              }}>
                <div style={{ height: 38 }} />
                <div style={{ background: 'rgba(0,0,0,0.45)', padding: '3px 0', textAlign: 'center' }}>
                  <span style={{ fontSize: 9, color: preferences.timeOfUse === t.value ? '#7ab648' : '#999' }}>{t.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div>
          <p style={{ fontSize: 11, color: '#666', marginBottom: 7 }}>Visible or Hidden?</p>
          <div style={{ display: 'flex', gap: 7 }}>
            {(['visible', 'hidden'] as const).map(v => (
              <button key={v} onClick={() => onVisibilityChange(v)} style={{
                flex: 1, padding: '7px 0',
                border: preferences.visibility === v ? '1px solid #7ab648' : '1px solid #242424',
                borderRadius: 7,
                background: preferences.visibility === v ? 'rgba(122,182,72,0.12)' : '#161616',
                color: preferences.visibility === v ? '#7ab648' : '#666',
                cursor: 'pointer', fontSize: 12, fontWeight: 500,
              }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Start Creating */}
        <button
          onClick={onStartCreating}
          disabled={!hasImage || generating}
          style={{
            padding: '11px 0',
            background: hasImage && !generating ? '#7ab648' : '#1c1c1c',
            color: hasImage && !generating ? '#fff' : '#3a3a3a',
            border: 'none', borderRadius: 8,
            cursor: hasImage && !generating ? 'pointer' : 'not-allowed',
            fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {generating ? 'Creating...' : 'Start Creating'}
        </button>
      </div>

      {/* Chat / Direct Instructions — pinned at bottom */}
      <div style={{
        borderTop: '1px solid #1e1e1e',
        padding: '12px 14px',
        background: '#0e0e0e',
        flexShrink: 0,
      }}>
        <p style={{ fontSize: 10, color: '#555', marginBottom: 7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Direct Instructions
        </p>

        {confirmed && (
          <div style={{ fontSize: 11, color: '#7ab648', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>✓</span>
            <span style={{ color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lastSent}
            </span>
          </div>
        )}

        {applying && (
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span style={{ marginLeft: 4 }}>Applying...</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            disabled={!hasImage || applying || generating}
            placeholder={hasImage ? 'e.g. add a bench near the fence...' : 'Upload a photo first'}
            rows={2}
            style={{
              flex: 1, background: '#161616',
              border: '1px solid #2a2a2a', borderRadius: 6,
              color: '#c8c8c8', fontSize: 11, padding: '7px 9px',
              resize: 'none', outline: 'none', lineHeight: 1.4,
              fontFamily: 'inherit',
              opacity: hasImage ? 1 : 0.4,
            }}
          />
          <button
            onClick={submit}
            disabled={!canSend}
            style={{
              alignSelf: 'flex-end',
              padding: '7px 10px',
              background: canSend ? '#7ab648' : '#1a1a1a',
              border: 'none', borderRadius: 6,
              color: canSend ? '#fff' : '#333',
              cursor: canSend ? 'pointer' : 'not-allowed',
              fontSize: 14, fontWeight: 700,
              transition: 'background 0.15s',
            }}
            title="Send (Enter)"
          >↑</button>
        </div>
        <p style={{ fontSize: 9, color: '#3a3a3a', marginTop: 5 }}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
