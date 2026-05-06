import { useRef, useState, useEffect } from 'react';
import type { GardenPreferences } from '../lib/types';
import { useI18n } from '../lib/i18n';

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

const MOODS: { value: GardenPreferences['mood']; labelKey: 'mood.tranquil' | 'mood.social' | 'mood.intimate'; icon: string; gradient: string; glowColor: string }[] = [
  { value: 'tranquil', labelKey: 'mood.tranquil',  icon: '🌿', gradient: 'linear-gradient(160deg, #1a3d2a 0%, #0c2015 100%)', glowColor: 'rgba(40,140,70,0.2)' },
  { value: 'social',   labelKey: 'mood.social',    icon: '🌻', gradient: 'linear-gradient(160deg, #3d2e1a 0%, #201508 100%)', glowColor: 'rgba(200,160,78,0.2)' },
  { value: 'intimate', labelKey: 'mood.intimate',  icon: '🌙', gradient: 'linear-gradient(160deg, #2a1a3d 0%, #140a20 100%)', glowColor: 'rgba(139,126,200,0.2)' },
];

const TIMES: { value: GardenPreferences['timeOfUse']; labelKey: 'time.morning' | 'time.daytime' | 'time.evening'; icon: string; gradient: string; glowColor: string }[] = [
  { value: 'morning', labelKey: 'time.morning', icon: '🌅', gradient: 'linear-gradient(160deg, #3d3a1a 0%, #201e08 100%)', glowColor: 'rgba(210,180,60,0.15)' },
  { value: 'daytime', labelKey: 'time.daytime', icon: '☀️',  gradient: 'linear-gradient(160deg, #1a2e3d 0%, #0a1520 100%)', glowColor: 'rgba(60,140,210,0.15)' },
  { value: 'evening', labelKey: 'time.evening', icon: '🌆', gradient: 'linear-gradient(160deg, #1a1a30 0%, #0a0a18 100%)', glowColor: 'rgba(100,80,180,0.15)' },
];

export function IntentionsPanel({
  preferences, imagePreview, hasImage, generating, applying,
  onImageUpload, onMoodChange, onTimeChange, onVisibilityChange,
  onStartCreating, onInstruction,
}: Props) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState('');
  const [lastSent, setLastSent] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!applying && lastSent) {
      setConfirmed(true);
      const timer = setTimeout(() => { setConfirmed(false); setLastSent(''); }, 2000);
      return () => clearTimeout(timer);
    }
  }, [applying, lastSent]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
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
    <div className="marble-green" style={{
      width: 272, flexShrink: 0,
      borderRight: '1px solid var(--garden-border)',
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, var(--garden-surface) 0%, var(--garden-deep) 100%)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Scrollable controls section */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '18px 16px',
        display: 'flex', flexDirection: 'column', gap: 18,
        position: 'relative', zIndex: 1,
      }}>
        <div>
          <h2 style={{
            fontSize: 10, fontWeight: 700, color: 'var(--green-400)',
            letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 2,
          }}>
            {t('intentions.title')}
          </h2>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            {t('intentions.subtitle')}
          </p>
        </div>

        {/* Upload zone */}
        <div>
          <p className="section-label">{t('intentions.photo')}</p>
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            style={{
              border: `1.5px dashed ${dragOver ? 'var(--green-400)' : imagePreview ? 'var(--garden-border-hover)' : 'var(--garden-border)'}`,
              borderRadius: 'var(--radius-lg)', minHeight: 88, cursor: 'pointer',
              overflow: 'hidden',
              background: dragOver ? 'rgba(122,182,72,0.06)' : 'var(--garden-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all var(--duration-normal) var(--ease-out)',
              position: 'relative',
            }}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Your garden" style={{
                  width: '100%', height: 88, objectFit: 'cover', display: 'block',
                  borderRadius: 'var(--radius-lg)',
                }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.2s',
                  borderRadius: 'var(--radius-lg)',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 600, letterSpacing: '0.05em' }}>
                    {t('intentions.changePhoto')}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 11, padding: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--green-subtle)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 8px',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                {t('intentions.upload')}
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onImageUpload(f); }} />
        </div>

        {/* Mood */}
        <div>
          <p className="section-label">{t('intentions.mood')}</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {MOODS.map(m => {
              const active = preferences.mood === m.value;
              return (
                <button key={m.value} onClick={() => onMoodChange(m.value)} style={{
                  flex: 1,
                  border: active ? '1.5px solid var(--green-400)' : '1px solid var(--garden-border)',
                  borderRadius: 'var(--radius-md)', background: m.gradient,
                  cursor: 'pointer', padding: 0, overflow: 'hidden',
                  transition: 'all var(--duration-normal) var(--ease-out)',
                  boxShadow: active ? `0 0 16px ${m.glowColor}` : 'none',
                  fontFamily: 'var(--font-sans)',
                }}>
                  <div style={{
                    height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>{m.icon}</div>
                  <div style={{
                    background: active ? 'rgba(122,182,72,0.08)' : 'rgba(0,0,0,0.45)',
                    padding: '5px 0', textAlign: 'center', transition: 'background 0.2s',
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: active ? 'var(--green-400)' : 'var(--text-tertiary)',
                      letterSpacing: '0.04em',
                    }}>{t(m.labelKey)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time of use */}
        <div>
          <p className="section-label">{t('intentions.time')}</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {TIMES.map(ti => {
              const active = preferences.timeOfUse === ti.value;
              return (
                <button key={ti.value} onClick={() => onTimeChange(ti.value)} style={{
                  flex: 1,
                  border: active ? '1.5px solid var(--green-400)' : '1px solid var(--garden-border)',
                  borderRadius: 'var(--radius-md)', background: ti.gradient,
                  cursor: 'pointer', padding: 0, overflow: 'hidden',
                  transition: 'all var(--duration-normal) var(--ease-out)',
                  boxShadow: active ? `0 0 16px ${ti.glowColor}` : 'none',
                  fontFamily: 'var(--font-sans)',
                }}>
                  <div style={{
                    height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>{ti.icon}</div>
                  <div style={{
                    background: active ? 'rgba(122,182,72,0.08)' : 'rgba(0,0,0,0.45)',
                    padding: '5px 0', textAlign: 'center', transition: 'background 0.2s',
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: active ? 'var(--green-400)' : 'var(--text-tertiary)',
                      letterSpacing: '0.04em',
                    }}>{t(ti.labelKey)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visibility */}
        <div>
          <p className="section-label">{t('intentions.visibility')}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['visible', 'hidden'] as const).map(v => {
              const active = preferences.visibility === v;
              return (
                <button key={v} onClick={() => onVisibilityChange(v)} style={{
                  flex: 1, padding: '9px 0',
                  border: active ? '1.5px solid var(--green-400)' : '1px solid var(--garden-border)',
                  borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--green-subtle)' : 'var(--garden-card)',
                  color: active ? 'var(--green-400)' : 'var(--text-tertiary)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  transition: 'all var(--duration-normal) var(--ease-out)',
                  boxShadow: active ? 'var(--shadow-glow)' : 'none',
                  letterSpacing: '0.02em',
                }}>
                  {v === 'visible' ? '👁 ' : '🔒 '}{t(v === 'visible' ? 'intentions.visible' : 'intentions.hidden')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Creating */}
        <button
          onClick={onStartCreating}
          disabled={!hasImage || generating}
          className="btn-primary"
          style={{
            padding: '13px 0', width: '100%',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.06em',
            ...((!hasImage || generating) ? {
              background: 'var(--garden-card)', color: 'var(--text-muted)',
              boxShadow: 'none', cursor: 'not-allowed',
            } : {}),
          }}
        >
          {generating ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span className="dot" style={{ width: 5, height: 5 }} />
              <span className="dot" style={{ width: 5, height: 5 }} />
              <span className="dot" style={{ width: 5, height: 5 }} />
              <span style={{ marginLeft: 4 }}>{t('intentions.creating')}</span>
            </span>
          ) : t('intentions.startCreating')}
        </button>
      </div>

      {/* ── Chat — pinned at bottom ── */}
      <div style={{
        borderTop: '1px solid var(--garden-border)',
        padding: '14px 16px',
        background: 'linear-gradient(180deg, var(--garden-deep) 0%, var(--garden-black) 100%)',
        flexShrink: 0,
        position: 'relative', zIndex: 1,
      }}>
        <p className="section-label" style={{ marginBottom: 8 }}>
          {t('intentions.instructions')}
        </p>

        {confirmed && (
          <div style={{
            fontSize: 11, color: 'var(--green-400)', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
            animation: 'fadeIn 0.3s ease',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lastSent}
            </span>
          </div>
        )}

        {applying && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span style={{ marginLeft: 2 }}>{t('intentions.applying')}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            disabled={!hasImage || applying || generating}
            placeholder={hasImage ? t('intentions.placeholder') : t('intentions.uploadFirst')}
            rows={2}
            style={{
              flex: 1, background: 'var(--garden-card)',
              border: '1px solid var(--garden-border)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)', fontSize: 12, padding: '9px 11px',
              resize: 'none', outline: 'none', lineHeight: 1.5,
              fontFamily: 'var(--font-sans)',
              opacity: hasImage ? 1 : 0.35,
              transition: 'border-color var(--duration-normal) var(--ease-out)',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(122,182,72,0.25)')}
            onBlur={e => (e.target.style.borderColor = 'var(--garden-border)')}
          />
          <button
            onClick={submit}
            disabled={!canSend}
            style={{
              alignSelf: 'flex-end', width: 36, height: 36,
              background: canSend ? 'linear-gradient(135deg, var(--green-400), var(--green-500))' : 'var(--garden-card)',
              border: 'none', borderRadius: 'var(--radius-md)',
              color: canSend ? '#fff' : 'var(--text-muted)',
              cursor: canSend ? 'pointer' : 'not-allowed',
              fontSize: 15, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all var(--duration-normal) var(--ease-out)',
              boxShadow: canSend ? '0 2px 8px rgba(122,182,72,0.25)' : 'none',
              flexShrink: 0,
            }}
            title="Send (Enter)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-ghost)', marginTop: 6, letterSpacing: '0.02em' }}>
          {t('intentions.sendHint')}
        </p>
      </div>
    </div>
  );
}
