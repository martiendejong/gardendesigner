import { useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '../lib/types';
import {
  adminGetUsers, adminCreateUser, adminAddCredits,
  adminUpdateUser, adminResendInvite, adminDeleteUser,
} from '../lib/api';

interface Props {
  onClose: () => void;
}

type ModalView = 'create' | 'edit' | 'credits' | null;

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7, boxSizing: 'border-box',
  background: 'var(--garden-black)', border: '1px solid var(--garden-border)',
  color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-sans)', outline: 'none',
};
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
  letterSpacing: '0.06em', display: 'block', marginBottom: 5,
};

export function AdminPanel({ onClose }: Props) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalView>(null);
  const [activeUser, setActiveUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [createForm, setCreateForm] = useState({
    firstname: '', lastname: '', accountname: '', email: '', credits: '10',
  });
  const [creditsAmount, setCreditsAmount] = useState('10');
  const [editForm, setEditForm] = useState({ firstname: '', lastname: '', email: '', credits: '', password: '' });

  const load = useCallback(async () => {
    try {
      setUsers(await adminGetUsers());
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (u: AuthUser) => {
    setActiveUser(u);
    setEditForm({ firstname: u.firstname, lastname: u.lastname, email: u.email, credits: String(u.credits), password: '' });
    setModal('edit');
    setError('');
  };
  const openCredits = (u: AuthUser) => {
    setActiveUser(u);
    setCreditsAmount('10');
    setModal('credits');
    setError('');
  };
  const closeModal = () => { setModal(null); setActiveUser(null); setError(''); setSaving(false); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const user = await adminCreateUser({
        firstname: createForm.firstname.trim(),
        lastname: createForm.lastname.trim(),
        accountname: createForm.accountname.trim(),
        email: createForm.email.trim(),
        credits: parseInt(createForm.credits) || 10,
      });
      setUsers(prev => [user, ...prev]);
      setCreateForm({ firstname: '', lastname: '', accountname: '', email: '', credits: '10' });
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    setError(''); setSaving(true);
    try {
      const updated = await adminUpdateUser(activeUser.id, {
        firstname: editForm.firstname.trim(),
        lastname: editForm.lastname.trim(),
        email: editForm.email.trim(),
        credits: parseInt(editForm.credits),
        ...(editForm.password ? { password: editForm.password } : {}),
      });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  };

  const handleAddCredits = async () => {
    if (!activeUser) return;
    const amount = parseInt(creditsAmount);
    if (!amount) { setError('Enter a valid number'); return; }
    setSaving(true);
    try {
      const updated = await adminAddCredits(activeUser.id, amount);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  };

  const handleResend = async (u: AuthUser) => {
    await adminResendInvite(u.id);
  };

  const handleDelete = async (u: AuthUser) => {
    if (!confirm(`Delete ${u.firstname} ${u.lastname}?`)) return;
    await adminDeleteUser(u.id);
    setUsers(prev => prev.filter(x => x.id !== u.id));
  };

  const filtered = users.filter(u =>
    !search || `${u.firstname} ${u.lastname} ${u.accountname} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 20px', overflowY: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 760,
        background: 'var(--garden-surface)',
        border: '1px solid var(--garden-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        animation: 'fadeIn 0.2s ease',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid var(--garden-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(180deg, var(--garden-surface) 0%, var(--garden-deep) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green-400)', letterSpacing: '0.06em' }}>
              USER MANAGEMENT
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => { setModal('create'); setError(''); }} className="btn-primary"
              style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New User
            </button>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4,
            }}>×</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--garden-border)' }}>
          <input
            type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 7, boxSizing: 'border-box',
              background: 'var(--garden-deep)', border: '1px solid var(--garden-border)',
              color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-sans)', outline: 'none',
            }}
          />
        </div>

        {/* User list */}
        <div style={{ minHeight: 200 }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {search ? 'No users match your search.' : 'No users yet.'}
            </div>
          ) : filtered.map((u, i) => (
            <div key={u.id} style={{
              padding: '12px 22px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--garden-border)' : 'none',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: u.isAdmin ? 'linear-gradient(135deg, #7ab648, #4a8c28)' : 'var(--garden-card)',
                border: '1px solid var(--garden-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: u.isAdmin ? 'white' : 'var(--text-tertiary)',
              }}>
                {u.firstname[0]}{u.lastname[0]}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {u.firstname} {u.lastname}
                  </span>
                  {u.isAdmin && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: 'var(--green-400)',
                      background: 'var(--green-subtle)', padding: '2px 6px',
                      borderRadius: 4, border: '1px solid rgba(122,182,72,0.2)', letterSpacing: '0.06em',
                    }}>ADMIN</span>
                  )}
                  {!u.hasPassword && !u.isAdmin && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: '#c8a04e',
                      background: 'rgba(200,160,78,0.1)', padding: '2px 6px',
                      borderRadius: 4, border: '1px solid rgba(200,160,78,0.2)', letterSpacing: '0.06em',
                    }}>PENDING</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  @{u.accountname} · {u.email}
                </div>
              </div>

              {/* Credits badge */}
              <div style={{
                flexShrink: 0, padding: '5px 12px',
                background: u.credits > 0 ? 'var(--green-subtle)' : 'rgba(204,107,85,0.08)',
                border: `1px solid ${u.credits > 0 ? 'rgba(122,182,72,0.2)' : 'rgba(204,107,85,0.2)'}`,
                borderRadius: 20, textAlign: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: u.credits > 0 ? 'var(--green-400)' : '#cc6b55' }}>
                  {u.isAdmin ? '∞' : u.credits}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>credits</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {!u.isAdmin && (
                  <button onClick={() => openCredits(u)} title="Add credits" style={{
                    padding: '5px 10px', borderRadius: 6,
                    background: 'var(--garden-card)', border: '1px solid var(--garden-border)',
                    color: 'var(--green-400)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}>+ Credits</button>
                )}
                {!u.hasPassword && !u.isAdmin && (
                  <button onClick={() => handleResend(u)} title="Resend invite" style={{
                    padding: '5px 10px', borderRadius: 6,
                    background: 'var(--garden-card)', border: '1px solid var(--garden-border)',
                    color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}>Resend</button>
                )}
                <button onClick={() => openEdit(u)} style={{
                  padding: '5px 10px', borderRadius: 6,
                  background: 'var(--garden-card)', border: '1px solid var(--garden-border)',
                  color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}>Edit</button>
                {!u.isAdmin && (
                  <button onClick={() => handleDelete(u)} style={{
                    padding: '5px 10px', borderRadius: 6,
                    background: 'rgba(204,107,85,0.06)', border: '1px solid rgba(204,107,85,0.2)',
                    color: '#cc6b55', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create / Edit / Credits modals */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            width: 400, background: 'var(--garden-surface)',
            border: '1px solid var(--garden-border)', borderRadius: 'var(--radius-lg)',
            padding: '24px 26px', boxShadow: '0 16px 60px rgba(0,0,0,0.6)',
            animation: 'fadeIn 0.15s ease',
          }}>
            {modal === 'create' && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Create new user</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                  An email with a setup link will be sent to the user.
                </p>
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={LABEL_STYLE}>FIRST NAME</label>
                      <input style={INPUT_STYLE} value={createForm.firstname} onChange={e => setCreateForm(p => ({ ...p, firstname: e.target.value }))} required />
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>LAST NAME</label>
                      <input style={INPUT_STYLE} value={createForm.lastname} onChange={e => setCreateForm(p => ({ ...p, lastname: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>ACCOUNT NAME</label>
                    <input style={INPUT_STYLE} value={createForm.accountname} onChange={e => setCreateForm(p => ({ ...p, accountname: e.target.value }))} required autoComplete="off" />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>EMAIL ADDRESS</label>
                    <input type="email" style={INPUT_STYLE} value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} required />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>INITIAL CREDITS</label>
                    <input type="number" min="0" style={INPUT_STYLE} value={createForm.credits} onChange={e => setCreateForm(p => ({ ...p, credits: e.target.value }))} />
                  </div>
                  {error && <div style={{ fontSize: 12, color: '#cc6b55', padding: '6px 10px', background: 'rgba(204,107,85,0.08)', borderRadius: 6 }}>{error}</div>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button type="button" onClick={closeModal} className="btn-ghost" style={{ flex: 1, padding: '9px 0', fontSize: 12 }}>Cancel</button>
                    <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 2, padding: '9px 0', fontSize: 12, fontWeight: 700 }}>
                      {saving ? 'Creating…' : 'Create & send invite'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {modal === 'edit' && activeUser && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 18 }}>
                  Edit {activeUser.firstname} {activeUser.lastname}
                </h3>
                <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={LABEL_STYLE}>FIRST NAME</label>
                      <input style={INPUT_STYLE} value={editForm.firstname} onChange={e => setEditForm(p => ({ ...p, firstname: e.target.value }))} />
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>LAST NAME</label>
                      <input style={INPUT_STYLE} value={editForm.lastname} onChange={e => setEditForm(p => ({ ...p, lastname: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>EMAIL</label>
                    <input type="email" style={INPUT_STYLE} value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>CREDITS</label>
                    <input type="number" min="0" style={INPUT_STYLE} value={editForm.credits} onChange={e => setEditForm(p => ({ ...p, credits: e.target.value }))} />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>NEW PASSWORD (leave blank to keep)</label>
                    <input type="password" style={INPUT_STYLE} value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} autoComplete="new-password" />
                  </div>
                  {error && <div style={{ fontSize: 12, color: '#cc6b55', padding: '6px 10px', background: 'rgba(204,107,85,0.08)', borderRadius: 6 }}>{error}</div>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button type="button" onClick={closeModal} className="btn-ghost" style={{ flex: 1, padding: '9px 0', fontSize: 12 }}>Cancel</button>
                    <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 2, padding: '9px 0', fontSize: 12, fontWeight: 700 }}>
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {modal === 'credits' && activeUser && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Add credits
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
                  {activeUser.firstname} currently has <strong style={{ color: 'var(--green-400)' }}>{activeUser.credits}</strong> credits.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label style={LABEL_STYLE}>CREDITS TO ADD</label>
                  <input
                    type="number" min="1" style={{ ...INPUT_STYLE, fontSize: 18, padding: '10px 12px', fontWeight: 700 }}
                    value={creditsAmount} onChange={e => setCreditsAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {[10, 25, 50, 100].map(n => (
                    <button key={n} onClick={() => setCreditsAmount(String(n))} style={{
                      flex: 1, padding: '7px 0', borderRadius: 6, cursor: 'pointer',
                      background: creditsAmount === String(n) ? 'var(--green-subtle)' : 'var(--garden-card)',
                      border: `1px solid ${creditsAmount === String(n) ? 'rgba(122,182,72,0.3)' : 'var(--garden-border)'}`,
                      color: creditsAmount === String(n) ? 'var(--green-400)' : 'var(--text-muted)',
                      fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
                    }}>+{n}</button>
                  ))}
                </div>
                {error && <div style={{ fontSize: 12, color: '#cc6b55', padding: '6px 10px', background: 'rgba(204,107,85,0.08)', borderRadius: 6, marginBottom: 12 }}>{error}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} className="btn-ghost" style={{ flex: 1, padding: '9px 0', fontSize: 12 }}>Cancel</button>
                  <button onClick={handleAddCredits} disabled={saving} className="btn-primary" style={{ flex: 2, padding: '9px 0', fontSize: 12, fontWeight: 700 }}>
                    {saving ? 'Adding…' : `Add ${creditsAmount} credits`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
