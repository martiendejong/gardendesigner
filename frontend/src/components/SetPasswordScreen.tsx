import { useState, useEffect } from 'react';
import { verifyPasswordToken, setPassword } from '../lib/api';
import type { AuthUser } from '../lib/types';

interface Props {
  token: string;
  onComplete: (token: string, user: AuthUser) => void;
}

export function SetPasswordScreen({ token, onComplete }: Props) {
  const [tokenInfo, setTokenInfo] = useState<{ type: string; firstname: string } | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    verifyPasswordToken(token)
      .then(info => { setTokenInfo(info); setLoading(false); })
      .catch(() => { setTokenError('This link is invalid or has expired.'); setLoading(false); });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setSubmitting(true);
    try {
      const result = await setPassword(token, password);
      onComplete(result.token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--garden-black)',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(122,182,72,0.06) 0%, transparent 60%)',
    }}>
      <div style={{
        width: 360, padding: '36px 32px',
        background: 'var(--garden-surface)',
        border: '1px solid var(--garden-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #7ab648 0%, #4a8c28 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(122,182,72,0.35)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22V12"/><path d="M12 12C12 6.5 6 4 3 6"/><path d="M12 12C12 6.5 18 4 21 6"/>
            </svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Garden Designer
          </span>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Verifying link…
          </div>
        )}

        {!loading && tokenError && (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(204,107,85,0.1)', border: '1px solid rgba(204,107,85,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cc6b55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8 }}>
              Link expired
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
              {tokenError} Please request a new link from your administrator or use the "Forgot password" option.
            </p>
          </>
        )}

        {!loading && tokenInfo && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              {tokenInfo.type === 'setup' ? `Welcome, ${tokenInfo.firstname}!` : 'Set new password'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              {tokenInfo.type === 'setup'
                ? 'Choose a password to activate your account.'
                : 'Enter your new password below.'}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  NEW PASSWORD
                </label>
                <input
                  type="password" value={password} onChange={e => setPasswordValue(e.target.value)}
                  autoFocus autoComplete="new-password" required minLength={8}
                  placeholder="At least 8 characters"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                    background: 'var(--garden-deep)', border: '1px solid var(--garden-border)',
                    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(122,182,72,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'var(--garden-border)'}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  CONFIRM PASSWORD
                </label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password" required
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                    background: 'var(--garden-deep)', border: '1px solid var(--garden-border)',
                    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(122,182,72,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'var(--garden-border)'}
                />
              </div>

              {error && (
                <div style={{
                  padding: '8px 12px', background: 'rgba(204,107,85,0.1)',
                  border: '1px solid rgba(204,107,85,0.25)', borderRadius: 6,
                  fontSize: 12, color: '#cc6b55',
                }}>{error}</div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary"
                style={{ width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                {submitting ? 'Setting password…' : tokenInfo.type === 'setup' ? 'Activate account' : 'Set new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
