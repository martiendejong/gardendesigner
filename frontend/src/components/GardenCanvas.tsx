import type { GardenPreferences, DesignResult } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  imagePreview: string | null;
  result: DesignResult | null;
  generating: boolean;
  generatingMessage: string;
  preferences: GardenPreferences;
  onSliderChange: (key: keyof GardenPreferences['sliders'], value: number) => void;
  onStyleSelect: (style: 'contemplative' | 'social' | 'evening') => void;
}

type SliderKey = keyof GardenPreferences['sliders'];

const SLIDER_KEYS: { key: SliderKey; leftKey: string; rightKey: string; leftIcon: string; rightIcon: string }[] = [
  { key: 'tranquilVibrant', leftKey: 'slider.tranquil', rightKey: 'slider.vibrant',   leftIcon: '🍃', rightIcon: '🌺' },
  { key: 'openSheltered',   leftKey: 'slider.open',     rightKey: 'slider.sheltered', leftIcon: '☀️',  rightIcon: '🌳' },
  { key: 'lightMass',       leftKey: 'slider.light',    rightKey: 'slider.mass',      leftIcon: '✨', rightIcon: '🪨' },
  { key: 'socialSolitary',  leftKey: 'slider.social',   rightKey: 'slider.solitary',  leftIcon: '👥', rightIcon: '🧘' },
];

const STYLES = [
  {
    id: 'contemplative' as const,
    nameKey: 'style.contemplative',
    subKey: 'style.contemplative.sub',
    gradient: 'linear-gradient(160deg, #1a3d2a 0%, #0c2015 60%, #081a0e 100%)',
    glowColor: 'rgba(40,140,70,0.25)',
    accentColor: '#4a9a5a',
    icon: '🧘',
  },
  {
    id: 'social' as const,
    nameKey: 'style.social',
    subKey: 'style.social.sub',
    gradient: 'linear-gradient(160deg, #3d2e1a 0%, #2a1f0c 60%, #1a160a 100%)',
    glowColor: 'rgba(200,160,78,0.25)',
    accentColor: '#c8a04e',
    icon: '🌻',
  },
  {
    id: 'evening' as const,
    nameKey: 'style.evening',
    subKey: 'style.evening.sub',
    gradient: 'linear-gradient(160deg, #1a1a35 0%, #12122a 60%, #0a0a1a 100%)',
    glowColor: 'rgba(100,80,180,0.25)',
    accentColor: '#8b7ec8',
    icon: '🌙',
  },
];

export function GardenCanvas({
  imagePreview, result, generating, generatingMessage,
  preferences, onSliderChange, onStyleSelect,
}: Props) {
  const { t } = useI18n();
  const displayImage = result?.imageUrl || imagePreview;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', minWidth: 0,
      background: 'var(--garden-black)',
    }}>

      {/* Canvas header */}
      {(generating || result) && (
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--garden-border)',
          flexShrink: 0,
          background: 'linear-gradient(90deg, var(--garden-deep) 0%, var(--garden-surface) 50%, var(--garden-deep) 100%)',
        }}>
          <span style={{
            fontSize: 13, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            letterSpacing: '0.01em',
          }}>
            {generating ? t('canvas.generating') : result?.generationMessage}
          </span>
        </div>
      )}

      {/* Main image area */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'var(--garden-black)',
      }}>
        {displayImage ? (
          <>
            <img
              src={displayImage}
              alt="Garden"
              className="garden-image"
              style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                opacity: generating ? 0.3 : 1,
              }}
            />
            {!generating && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at center, transparent 60%, rgba(6,10,7,0.4) 100%)',
                pointerEvents: 'none',
              }} />
            )}
          </>
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
            background: 'radial-gradient(ellipse at center, rgba(122,182,72,0.02) 0%, transparent 60%)',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'var(--garden-card)',
              border: '1px solid var(--garden-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 4 }}>
                {t('canvas.uploadTitle')}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {t('canvas.uploadSubtitle')}
              </p>
            </div>
          </div>
        )}

        {generating && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
            background: 'radial-gradient(ellipse at center, rgba(6,10,7,0.7) 0%, rgba(6,10,7,0.85) 100%)',
            animation: 'overlayPulse 3s ease-in-out infinite',
          }}>
            <p style={{
              fontSize: 26, fontWeight: 300, color: 'var(--text-primary)',
              textAlign: 'center',
              textShadow: '0 2px 40px rgba(0,0,0,0.9)',
              letterSpacing: '0.02em',
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              maxWidth: 400, animation: 'fadeIn 0.5s ease',
            }}>
              {generatingMessage}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
      </div>

      {/* ── Sliders ── */}
      <div className="marble" style={{
        padding: '12px 20px 10px',
        borderTop: '1px solid var(--garden-border)',
        background: 'linear-gradient(180deg, var(--garden-surface) 0%, var(--garden-deep) 100%)',
        display: 'flex', flexDirection: 'column', gap: 8,
        flexShrink: 0,
        position: 'relative',
      }}>
        {SLIDER_KEYS.map(s => {
          const val = preferences.sliders[s.key];
          const pct = Math.round(val * 100);
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
              <span style={{ fontSize: 12, width: 20, textAlign: 'center', flexShrink: 0 }}>{s.leftIcon}</span>
              <span style={{
                fontSize: 11, color: 'var(--text-tertiary)', width: 58,
                textAlign: 'right', flexShrink: 0, fontWeight: 500,
              }}>{t(s.leftKey as any)}</span>
              <input
                type="range" min={0} max={100} value={pct}
                className="garden-slider"
                style={{ '--val': `${pct}%` } as React.CSSProperties}
                onChange={e => onSliderChange(s.key, parseInt(e.target.value) / 100)}
              />
              <span style={{
                fontSize: 11, color: 'var(--text-tertiary)', width: 58,
                flexShrink: 0, fontWeight: 500,
              }}>{t(s.rightKey as any)}</span>
              <span style={{ fontSize: 12, width: 20, textAlign: 'center', flexShrink: 0 }}>{s.rightIcon}</span>
            </div>
          );
        })}
      </div>

      {/* ── Style Cards ── */}
      <div className="marble" style={{
        padding: '10px 20px 14px',
        borderTop: '1px solid var(--garden-border)',
        background: 'var(--garden-deep)',
        display: 'flex', gap: 10,
        flexShrink: 0,
        position: 'relative',
      }}>
        {STYLES.map(card => (
          <div
            key={card.id}
            onClick={() => onStyleSelect(card.id)}
            style={{
              flex: 1, borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              border: '1px solid var(--garden-border)', cursor: 'pointer',
              transition: 'all var(--duration-normal) var(--ease-out)',
              position: 'relative', zIndex: 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = card.accentColor;
              e.currentTarget.style.boxShadow = `0 4px 20px ${card.glowColor}`;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--garden-border)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              height: 52, background: card.gradient, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(ellipse at 50% 100%, ${card.glowColor} 0%, transparent 70%)`,
              }} />
              <span style={{ fontSize: 22, position: 'relative', zIndex: 1 }}>{card.icon}</span>
            </div>
            <div style={{ padding: '8px 10px 10px', background: 'var(--garden-card)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-primary)', marginBottom: 2, fontWeight: 600, lineHeight: 1.2 }}>
                {t(card.nameKey as any)}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                {t(card.subKey as any)}
              </p>
              <div style={{
                padding: '3px 0', textAlign: 'center',
                background: 'var(--green-subtle)',
                border: '1px solid var(--garden-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--green-400)', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.04em',
              }}>
                {t('canvas.explore')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
