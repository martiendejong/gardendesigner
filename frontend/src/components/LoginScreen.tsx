import { useState } from 'react';
import { login, forgotPassword } from '../lib/api';
import type { AuthUser } from '../lib/types';

interface Props {
  onLogin: (token: string, user: AuthUser) => void;
}

type View = 'login' | 'forgot' | 'forgot-sent';

export function LoginScreen({ onLogin }: Props) {
  const [view, setView] = useState<View>('login');
  const [accountname, setAccountname] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(accountname.trim(), password);
      onLogin(token, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setView('forgot-sent');
    } finally {
      setLoading(false);
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

        {/* Logo */}
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

        {view === 'login' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Welcome back</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Sign in to your account</p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  ACCOUNT NAME OR EMAIL
                </label>
                <input
                  type="text" value={accountname} onChange={e => setAccountname(e.target.value)}
                  autoFocus autoComplete="username" required
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                    background: 'var(--garden-deep)', border: '1px solid var(--garden-border)',
                    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-sans)',
                    outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(122,182,72,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'var(--garden-border)'}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  PASSWORD
                </label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password" required
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                    background: 'var(--garden-deep)', border: '1px solid var(--garden-border)',
                    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-sans)',
                    outline: 'none',
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

              <button
                type="submit" disabled={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 700, marginTop: 4 }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <button
              onClick={() => { setView('forgot'); setError(''); }}
              style={{
                marginTop: 16, width: '100%', background: 'none', border: 'none',
                color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Forgot your password?
            </button>
          </>
        )}

        {view === 'forgot' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Reset password</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              Enter your email address and we'll send you a reset link.
            </p>

            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  autoFocus required
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                    background: 'var(--garden-deep)', border: '1px solid var(--garden-border)',
                    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(122,182,72,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'var(--garden-border)'}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary"
                style={{ width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 700 }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <button onClick={() => setView('login')} style={{
              marginTop: 16, width: '100%', background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>
              ← Back to sign in
            </button>
          </>
        )}

        {view === 'forgot-sent' && (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--green-subtle)', border: '1px solid rgba(122,182,72,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
              Check your email
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, textAlign: 'center', marginBottom: 24 }}>
              If an account exists for <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong>, you'll receive a reset link shortly.
            </p>
            <button onClick={() => setView('login')} className="btn-ghost"
              style={{ width: '100%', padding: '10px 0', fontSize: 13 }}>
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
