import { useState, useEffect, useCallback, useRef } from 'react';
import type { AuthUser, ProductGroup, Product } from '../lib/types';
import {
  adminGetUsers, adminCreateUser, adminAddCredits,
  adminUpdateUser, adminResendInvite, adminDeleteUser,
  adminGetUserProductGroups, adminSetUserProductGroups,
  adminGetProductGroups, adminGetProductGroup,
  adminCreateProductGroup, adminUpdateProductGroup, adminDeleteProductGroup,
  adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  adminAddProductImage, adminDeleteProductImage,
} from '../lib/api';

interface Props { onClose: () => void; }

type UserModal = 'create' | 'edit' | 'credits' | null;
type GroupModal = 'create' | 'edit' | null;
type ProductModal = 'create' | 'edit' | null;

const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7, boxSizing: 'border-box',
  background: 'var(--garden-black)', border: '1px solid var(--garden-border)',
  color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-sans)', outline: 'none',
};
const LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
  letterSpacing: '0.06em', display: 'block', marginBottom: 5,
};
const TEXTAREA: React.CSSProperties = { ...INPUT, resize: 'vertical', minHeight: 60 };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const CATEGORIES = ['Plants', 'Hardscape', 'Structures'] as const;

export function AdminPanel({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'users' | 'product-groups'>('users');

  // ── Users state ────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userModal, setUserModal] = useState<UserModal>(null);
  const [activeUser, setActiveUser] = useState<AuthUser | null>(null);
  const [userError, setUserError] = useState('');
  const [userSaving, setUserSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [createForm, setCreateForm] = useState({ firstname: '', lastname: '', accountname: '', email: '', credits: '10' });
  const [creditsAmount, setCreditsAmount] = useState('10');
  const [editForm, setEditForm] = useState({ firstname: '', lastname: '', email: '', credits: '', password: '' });
  const [editUserGroupIds, setEditUserGroupIds] = useState<number[]>([]);
  const [allGroups, setAllGroups] = useState<ProductGroup[]>([]);

  // ── Product Groups state ────────────────────────────────────────────────────
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupModal, setGroupModal] = useState<GroupModal>(null);
  const [activeGroup, setActiveGroup] = useState<ProductGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', category: 'Plants' as typeof CATEGORIES[number], image: null as string | null });
  const [groupError, setGroupError] = useState('');
  const [groupSaving, setGroupSaving] = useState(false);

  // Product state (within group modal)
  const [productModal, setProductModal] = useState<ProductModal>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: '', description: '' });
  const [productError, setProductError] = useState('');
  const [productSaving, setProductSaving] = useState(false);

  const groupImageInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);

  const loadUsers = useCallback(async () => {
    try { setUsers(await adminGetUsers()); } catch { /* silent */ }
    setUsersLoading(false);
  }, []);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try { setGroups(await adminGetProductGroups()); } catch { /* silent */ }
    setGroupsLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    if (activeTab === 'product-groups') loadGroups();
  }, [activeTab, loadGroups]);

  useEffect(() => {
    adminGetProductGroups().then(setAllGroups).catch(() => {});
  }, []);

  // ── User handlers ──────────────────────────────────────────────────────────

  const openEditUser = async (u: AuthUser) => {
    setActiveUser(u);
    setEditForm({ firstname: u.firstname, lastname: u.lastname, email: u.email, credits: String(u.credits), password: '' });
    setUserError('');
    try { setEditUserGroupIds(await adminGetUserProductGroups(u.id)); } catch { setEditUserGroupIds([]); }
    setUserModal('edit');
  };

  const closeUserModal = () => { setUserModal(null); setActiveUser(null); setUserError(''); setUserSaving(false); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setUserError(''); setUserSaving(true);
    try {
      const user = await adminCreateUser({
        firstname: createForm.firstname.trim(), lastname: createForm.lastname.trim(),
        accountname: createForm.accountname.trim(), email: createForm.email.trim(),
        credits: parseInt(createForm.credits) || 10,
      });
      setUsers(prev => [user, ...prev]);
      setCreateForm({ firstname: '', lastname: '', accountname: '', email: '', credits: '10' });
      setUserModal(null);
    } catch (err) { setUserError(err instanceof Error ? err.message : 'Failed'); }
    finally { setUserSaving(false); }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    setUserError(''); setUserSaving(true);
    try {
      const updated = await adminUpdateUser(activeUser.id, {
        firstname: editForm.firstname.trim(), lastname: editForm.lastname.trim(),
        email: editForm.email.trim(), credits: parseInt(editForm.credits),
        ...(editForm.password ? { password: editForm.password } : {}),
      });
      await adminSetUserProductGroups(activeUser.id, editUserGroupIds);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      closeUserModal();
    } catch (err) { setUserError(err instanceof Error ? err.message : 'Failed'); }
    finally { setUserSaving(false); }
  };

  const handleAddCredits = async () => {
    if (!activeUser) return;
    const amount = parseInt(creditsAmount);
    if (!amount) { setUserError('Enter a valid number'); return; }
    setUserSaving(true);
    try {
      const updated = await adminAddCredits(activeUser.id, amount);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      closeUserModal();
    } catch (err) { setUserError(err instanceof Error ? err.message : 'Failed'); }
    finally { setUserSaving(false); }
  };

  const handleDeleteUser = async (u: AuthUser) => {
    if (!confirm(`Delete ${u.firstname} ${u.lastname}?`)) return;
    await adminDeleteUser(u.id);
    setUsers(prev => prev.filter(x => x.id !== u.id));
  };

  const toggleUserGroup = (gid: number) => {
    setEditUserGroupIds(prev => prev.includes(gid) ? prev.filter(x => x !== gid) : [...prev, gid]);
  };

  // ── Group handlers ─────────────────────────────────────────────────────────

  const openEditGroup = async (g: ProductGroup) => {
    setGroupError(''); setProductModal(null); setActiveProduct(null);
    setGroupForm({ name: g.name, description: g.description ?? '', category: g.category, image: g.image });
    try {
      const full = await adminGetProductGroup(g.id);
      setActiveGroup(full);
    } catch { setActiveGroup(g); }
    setGroupModal('edit');
  };

  const openCreateGroup = () => {
    setGroupForm({ name: '', description: '', category: 'Plants', image: null });
    setGroupError(''); setActiveGroup(null);
    setGroupModal('create');
  };

  const closeGroupModal = () => {
    setGroupModal(null); setActiveGroup(null); setGroupError('');
    setProductModal(null); setActiveProduct(null);
  };

  const handleGroupImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setGroupForm(p => ({ ...p, image: b64 }));
    e.target.value = '';
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) { setGroupError('Name is required'); return; }
    setGroupError(''); setGroupSaving(true);
    try {
      if (groupModal === 'create') {
        const g = await adminCreateProductGroup({ name: groupForm.name.trim(), description: groupForm.description.trim(), category: groupForm.category, image: groupForm.image });
        setGroups(prev => [...prev, g]);
        setAllGroups(prev => [...prev, g]);
        closeGroupModal();
      } else if (activeGroup) {
        await adminUpdateProductGroup(activeGroup.id, { name: groupForm.name.trim(), description: groupForm.description.trim(), category: groupForm.category, image: groupForm.image });
        const updated: ProductGroup = { ...activeGroup, name: groupForm.name.trim(), description: groupForm.description.trim(), category: groupForm.category, image: groupForm.image };
        setGroups(prev => prev.map(g => g.id === updated.id ? { ...g, name: updated.name, description: updated.description, category: updated.category, image: updated.image } : g));
        setAllGroups(prev => prev.map(g => g.id === updated.id ? { ...g, name: updated.name, description: updated.description, category: updated.category, image: updated.image } : g));
        setActiveGroup(updated);
      }
    } catch (err) { setGroupError(err instanceof Error ? err.message : 'Failed'); }
    finally { setGroupSaving(false); }
  };

  const handleDeleteGroup = async (g: ProductGroup) => {
    if (!confirm(`Delete product group "${g.name}" and all its products?`)) return;
    await adminDeleteProductGroup(g.id);
    setGroups(prev => prev.filter(x => x.id !== g.id));
    setAllGroups(prev => prev.filter(x => x.id !== g.id));
  };

  // ── Product handlers ───────────────────────────────────────────────────────

  const openCreateProduct = () => {
    setProductForm({ name: '', description: '' });
    setProductError(''); setActiveProduct(null);
    setProductModal('create');
  };

  const openEditProduct = (p: Product) => {
    setProductForm({ name: p.name, description: p.description ?? '' });
    setProductError(''); setActiveProduct(p);
    setProductModal('edit');
  };

  const closeProductModal = () => { setProductModal(null); setActiveProduct(null); setProductError(''); };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) { setProductError('Name is required'); return; }
    if (!activeGroup) return;
    setProductError(''); setProductSaving(true);
    try {
      if (productModal === 'create') {
        const p = await adminCreateProduct(activeGroup.id, { name: productForm.name.trim(), description: productForm.description.trim() });
        const newProduct: Product = { ...p, images: [] };
        setActiveGroup(prev => prev ? { ...prev, products: [...prev.products, newProduct] } : prev);
        closeProductModal();
      } else if (activeProduct) {
        await adminUpdateProduct(activeProduct.id, { name: productForm.name.trim(), description: productForm.description.trim() });
        setActiveGroup(prev => prev ? {
          ...prev, products: prev.products.map(x => x.id === activeProduct.id ? { ...x, name: productForm.name.trim(), description: productForm.description.trim() } : x),
        } : prev);
        closeProductModal();
      }
    } catch (err) { setProductError(err instanceof Error ? err.message : 'Failed'); }
    finally { setProductSaving(false); }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    await adminDeleteProduct(p.id);
    setActiveGroup(prev => prev ? { ...prev, products: prev.products.filter(x => x.id !== p.id) } : prev);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, productId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const b64 = await fileToBase64(file);
    try {
      const img = await adminAddProductImage(productId, b64);
      setActiveGroup(prev => prev ? {
        ...prev, products: prev.products.map(p => p.id === productId ? { ...p, images: [...p.images, img] } : p),
      } : prev);
    } catch { /* silent */ }
  };

  const handleDeleteProductImage = async (productId: number, imageId: number) => {
    await adminDeleteProductImage(imageId);
    setActiveGroup(prev => prev ? {
      ...prev, products: prev.products.map(p => p.id === productId ? { ...p, images: p.images.filter(i => i.id !== imageId) } : p),
    } : prev);
  };

  const filtered = users.filter(u =>
    !search || `${u.firstname} ${u.lastname} ${u.accountname} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const categoryColor = (cat: string) => cat === 'Plants' ? '#7ab648' : cat === 'Hardscape' ? '#c8a04e' : '#6ba0cc';
  const categoryBg = (cat: string) => cat === 'Plants' ? 'rgba(122,182,72,0.1)' : cat === 'Hardscape' ? 'rgba(200,160,78,0.1)' : 'rgba(107,160,204,0.1)';
  const categoryBorder = (cat: string) => cat === 'Plants' ? 'rgba(122,182,72,0.25)' : cat === 'Hardscape' ? 'rgba(200,160,78,0.25)' : 'rgba(107,160,204,0.25)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 20px', overflowY: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 820,
        background: 'var(--garden-surface)', border: '1px solid var(--garden-border)',
        borderRadius: 'var(--radius-lg)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        animation: 'fadeIn 0.2s ease', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid var(--garden-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(180deg, var(--garden-surface) 0%, var(--garden-deep) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Tabs */}
            {(['users', 'product-groups'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)',
                color: activeTab === tab ? 'var(--green-400)' : 'var(--text-muted)',
                borderBottom: `2px solid ${activeTab === tab ? 'var(--green-400)' : 'transparent'}`,
                letterSpacing: '0.05em',
              }}>
                {tab === 'users' ? 'USERS' : 'PRODUCT GROUPS'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {activeTab === 'users' && (
              <button onClick={() => { setUserModal('create'); setUserError(''); }} className="btn-primary"
                style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New User
              </button>
            )}
            {activeTab === 'product-groups' && (
              <button onClick={openCreateGroup} className="btn-primary"
                style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Group
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
          </div>
        </div>

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <>
            <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--garden-border)' }}>
              <input type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} style={{
                width: '100%', padding: '8px 12px', borderRadius: 7, boxSizing: 'border-box',
                background: 'var(--garden-deep)', border: '1px solid var(--garden-border)',
                color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-sans)', outline: 'none',
              }} />
            </div>
            <div style={{ minHeight: 200 }}>
              {usersLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  {search ? 'No users match your search.' : 'No users yet.'}
                </div>
              ) : filtered.map((u, i) => (
                <div key={u.id} style={{
                  padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 14,
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--garden-border)' : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: u.isAdmin ? 'linear-gradient(135deg, #7ab648, #4a8c28)' : 'var(--garden-card)',
                    border: '1px solid var(--garden-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: u.isAdmin ? 'white' : 'var(--text-tertiary)',
                  }}>{u.firstname[0]}{u.lastname[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{u.firstname} {u.lastname}</span>
                      {u.isAdmin && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green-400)', background: 'var(--green-subtle)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(122,182,72,0.2)', letterSpacing: '0.06em' }}>ADMIN</span>}
                      {!u.hasPassword && !u.isAdmin && <span style={{ fontSize: 9, fontWeight: 700, color: '#c8a04e', background: 'rgba(200,160,78,0.1)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(200,160,78,0.2)', letterSpacing: '0.06em' }}>PENDING</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>@{u.accountname} · {u.email}</div>
                  </div>
                  <div style={{ flexShrink: 0, padding: '5px 12px', background: u.credits > 0 ? 'var(--green-subtle)' : 'rgba(204,107,85,0.08)', border: `1px solid ${u.credits > 0 ? 'rgba(122,182,72,0.2)' : 'rgba(204,107,85,0.2)'}`, borderRadius: 20 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: u.credits > 0 ? 'var(--green-400)' : '#cc6b55' }}>{u.isAdmin ? '∞' : u.credits}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>credits</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {!u.isAdmin && <button onClick={() => { setActiveUser(u); setCreditsAmount('10'); setUserModal('credits'); setUserError(''); }} style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--garden-card)', border: '1px solid var(--garden-border)', color: 'var(--green-400)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>+ Credits</button>}
                    {!u.hasPassword && !u.isAdmin && <button onClick={() => adminResendInvite(u.id)} style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--garden-card)', border: '1px solid var(--garden-border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Resend</button>}
                    <button onClick={() => openEditUser(u)} style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--garden-card)', border: '1px solid var(--garden-border)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Edit</button>
                    {!u.isAdmin && <button onClick={() => handleDeleteUser(u)} style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(204,107,85,0.06)', border: '1px solid rgba(204,107,85,0.2)', color: '#cc6b55', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Delete</button>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── PRODUCT GROUPS TAB ── */}
        {activeTab === 'product-groups' && (
          <div style={{ minHeight: 200 }}>
            {groupsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
            ) : groups.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No product groups yet.</div>
            ) : groups.map((g, i) => (
              <div key={g.id} style={{
                padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 14,
                borderBottom: i < groups.length - 1 ? '1px solid var(--garden-border)' : 'none',
              }}>
                {/* Thumbnail */}
                <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: 'var(--garden-card)', border: '1px solid var(--garden-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {g.image ? <img src={g.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>📦</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: categoryColor(g.category), background: categoryBg(g.category), padding: '2px 6px', borderRadius: 4, border: `1px solid ${categoryBorder(g.category)}`, letterSpacing: '0.05em' }}>{g.category.toUpperCase()}</span>
                  </div>
                  {g.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEditGroup(g)} style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--garden-card)', border: '1px solid var(--garden-border)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Edit</button>
                  <button onClick={() => handleDeleteGroup(g)} style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(204,107,85,0.06)', border: '1px solid rgba(204,107,85,0.2)', color: '#cc6b55', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── USER MODALS ── */}
      {userModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
          <div style={{ width: userModal === 'edit' ? 520 : 400, maxHeight: '90vh', overflowY: 'auto', background: 'var(--garden-surface)', border: '1px solid var(--garden-border)', borderRadius: 'var(--radius-lg)', padding: '24px 26px', boxShadow: '0 16px 60px rgba(0,0,0,0.6)', animation: 'fadeIn 0.15s ease' }}>
            {userModal === 'create' && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Create new user</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>An email with a setup link will be sent to the user.</p>
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={LABEL}>FIRST NAME</label><input style={INPUT} value={createForm.firstname} onChange={e => setCreateForm(p => ({ ...p, firstname: e.target.value }))} required /></div>
                    <div><label style={LABEL}>LAST NAME</label><input style={INPUT} value={createForm.lastname} onChange={e => setCreateForm(p => ({ ...p, lastname: e.target.value }))} required /></div>
                  </div>
                  <div><label style={LABEL}>ACCOUNT NAME</label><input style={INPUT} value={createForm.accountname} onChange={e => setCreateForm(p => ({ ...p, accountname: e.target.value }))} required autoComplete="off" /></div>
                  <div><label style={LABEL}>EMAIL ADDRESS</label><input type="email" style={INPUT} value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} required /></div>
                  <div><label style={LABEL}>INITIAL CREDITS</label><input type="number" min="0" style={INPUT} value={createForm.credits} onChange={e => setCreateForm(p => ({ ...p, credits: e.target.value }))} /></div>
                  {userError && <div style={{ fontSize: 12, color: '#cc6b55', padding: '6px 10px', background: 'rgba(204,107,85,0.08)', borderRadius: 6 }}>{userError}</div>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button type="button" onClick={closeUserModal} className="btn-ghost" style={{ flex: 1, padding: '9px 0', fontSize: 12 }}>Cancel</button>
                    <button type="submit" disabled={userSaving} className="btn-primary" style={{ flex: 2, padding: '9px 0', fontSize: 12, fontWeight: 700 }}>{userSaving ? 'Creating…' : 'Create & send invite'}</button>
                  </div>
                </form>
              </>
            )}

            {userModal === 'edit' && activeUser && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 18 }}>Edit {activeUser.firstname} {activeUser.lastname}</h3>
                <form onSubmit={handleEditUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={LABEL}>FIRST NAME</label><input style={INPUT} value={editForm.firstname} onChange={e => setEditForm(p => ({ ...p, firstname: e.target.value }))} /></div>
                    <div><label style={LABEL}>LAST NAME</label><input style={INPUT} value={editForm.lastname} onChange={e => setEditForm(p => ({ ...p, lastname: e.target.value }))} /></div>
                  </div>
                  <div><label style={LABEL}>EMAIL</label><input type="email" style={INPUT} value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} /></div>
                  <div><label style={LABEL}>CREDITS</label><input type="number" min="0" style={INPUT} value={editForm.credits} onChange={e => setEditForm(p => ({ ...p, credits: e.target.value }))} /></div>
                  <div><label style={LABEL}>NEW PASSWORD (leave blank to keep)</label><input type="password" style={INPUT} value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} autoComplete="new-password" /></div>

                  {allGroups.length > 0 && (
                    <div>
                      <label style={LABEL}>PRODUCT GROUPS</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', padding: '4px 0' }}>
                        {allGroups.map(g => (
                          <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={editUserGroupIds.includes(g.id)}
                              onChange={() => toggleUserGroup(g.id)}
                              style={{ accentColor: 'var(--green-400)', width: 14, height: 14 }}
                            />
                            <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{g.name}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: categoryColor(g.category), background: categoryBg(g.category), padding: '1px 5px', borderRadius: 3, letterSpacing: '0.05em' }}>{g.category.toUpperCase()}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {userError && <div style={{ fontSize: 12, color: '#cc6b55', padding: '6px 10px', background: 'rgba(204,107,85,0.08)', borderRadius: 6 }}>{userError}</div>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button type="button" onClick={closeUserModal} className="btn-ghost" style={{ flex: 1, padding: '9px 0', fontSize: 12 }}>Cancel</button>
                    <button type="submit" disabled={userSaving} className="btn-primary" style={{ flex: 2, padding: '9px 0', fontSize: 12, fontWeight: 700 }}>{userSaving ? 'Saving…' : 'Save changes'}</button>
                  </div>
                </form>
              </>
            )}

            {userModal === 'credits' && activeUser && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Add credits</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
                  {activeUser.firstname} currently has <strong style={{ color: 'var(--green-400)' }}>{activeUser.credits}</strong> credits.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label style={LABEL}>CREDITS TO ADD</label>
                  <input type="number" min="1" style={{ ...INPUT, fontSize: 18, padding: '10px 12px', fontWeight: 700 }} value={creditsAmount} onChange={e => setCreditsAmount(e.target.value)} autoFocus />
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {[10, 25, 50, 100].map(n => (
                    <button key={n} onClick={() => setCreditsAmount(String(n))} style={{ flex: 1, padding: '7px 0', borderRadius: 6, cursor: 'pointer', background: creditsAmount === String(n) ? 'var(--green-subtle)' : 'var(--garden-card)', border: `1px solid ${creditsAmount === String(n) ? 'rgba(122,182,72,0.3)' : 'var(--garden-border)'}`, color: creditsAmount === String(n) ? 'var(--green-400)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>+{n}</button>
                  ))}
                </div>
                {userError && <div style={{ fontSize: 12, color: '#cc6b55', padding: '6px 10px', background: 'rgba(204,107,85,0.08)', borderRadius: 6, marginBottom: 12 }}>{userError}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeUserModal} className="btn-ghost" style={{ flex: 1, padding: '9px 0', fontSize: 12 }}>Cancel</button>
                  <button onClick={handleAddCredits} disabled={userSaving} className="btn-primary" style={{ flex: 2, padding: '9px 0', fontSize: 12, fontWeight: 700 }}>{userSaving ? 'Adding…' : `Add ${creditsAmount} credits`}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── GROUP MODAL ── */}
      {groupModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
          <div style={{ width: '100%', maxWidth: 760, background: 'var(--garden-surface)', border: '1px solid var(--garden-border)', borderRadius: 'var(--radius-lg)', boxShadow: '0 16px 60px rgba(0,0,0,0.6)', animation: 'fadeIn 0.15s ease', overflow: 'hidden' }}>
            {/* Group modal header */}
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--garden-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(180deg, var(--garden-surface) 0%, var(--garden-deep) 100%)' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {groupModal === 'create' ? 'New Product Group' : `Edit: ${activeGroup?.name ?? ''}`}
              </span>
              <button onClick={closeGroupModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
            </div>

            <div style={{ padding: '22px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
              {/* Left: group fields */}
              <form onSubmit={handleSaveGroup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><label style={LABEL}>NAME</label><input style={INPUT} value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} required /></div>
                <div>
                  <label style={LABEL}>CATEGORY</label>
                  <select style={{ ...INPUT, cursor: 'pointer' }} value={groupForm.category} onChange={e => setGroupForm(p => ({ ...p, category: e.target.value as typeof CATEGORIES[number] }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={LABEL}>DESCRIPTION</label><textarea style={TEXTAREA} value={groupForm.description} onChange={e => setGroupForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div>
                  <label style={LABEL}>IMAGE</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {groupForm.image && (
                      <div style={{ position: 'relative', width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--garden-border)' }}>
                        <img src={groupForm.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={() => setGroupForm(p => ({ ...p, image: null }))} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    )}
                    <button type="button" onClick={() => groupImageInputRef.current?.click()} style={{ padding: '7px 0', borderRadius: 6, background: 'var(--garden-card)', border: '1px solid var(--garden-border)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                      {groupForm.image ? 'Replace image' : 'Upload image'}
                    </button>
                    <input ref={groupImageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleGroupImageUpload} />
                  </div>
                </div>
                {groupError && <div style={{ fontSize: 12, color: '#cc6b55', padding: '6px 10px', background: 'rgba(204,107,85,0.08)', borderRadius: 6 }}>{groupError}</div>}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={closeGroupModal} className="btn-ghost" style={{ flex: 1, padding: '9px 0', fontSize: 12 }}>Cancel</button>
                  <button type="submit" disabled={groupSaving} className="btn-primary" style={{ flex: 2, padding: '9px 0', fontSize: 12, fontWeight: 700 }}>{groupSaving ? 'Saving…' : 'Save group'}</button>
                </div>
              </form>

              {/* Right: products list (only when editing existing group) */}
              {groupModal === 'edit' && activeGroup && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>PRODUCTS ({activeGroup.products.length})</span>
                    <button onClick={openCreateProduct} className="btn-primary" style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add Product
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 460, overflowY: 'auto' }}>
                    {activeGroup.products.length === 0 ? (
                      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No products yet.</div>
                    ) : activeGroup.products.map(p => (
                      <div key={p.id} style={{ background: 'var(--garden-card)', border: '1px solid var(--garden-border)', borderRadius: 8, padding: '10px 12px' }}>
                        {/* Product header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                            {p.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{p.description}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                            <button onClick={() => openEditProduct(p)} style={{ padding: '3px 8px', borderRadius: 5, background: 'var(--garden-surface)', border: '1px solid var(--garden-border)', color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Edit</button>
                            <button onClick={() => handleDeleteProduct(p)} style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(204,107,85,0.06)', border: '1px solid rgba(204,107,85,0.2)', color: '#cc6b55', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Del</button>
                          </div>
                        </div>
                        {/* Product images */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {p.images.map(img => (
                            <div key={img.id} style={{ position: 'relative', width: 48, height: 48, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--garden-border)', flexShrink: 0 }}>
                              <img src={img.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button onClick={() => handleDeleteProductImage(p.id, img.id)} style={{ position: 'absolute', top: 1, right: 1, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                            </div>
                          ))}
                          <label style={{ width: 48, height: 48, borderRadius: 6, border: '1px dashed var(--garden-border)', background: 'var(--garden-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleProductImageUpload(e, p.id)} />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {groupModal === 'create' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
                    Save the group first,<br />then add products.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCT MODAL ── */}
      {productModal && activeGroup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
          <div style={{ width: 380, background: 'var(--garden-surface)', border: '1px solid var(--garden-border)', borderRadius: 'var(--radius-lg)', padding: '24px 26px', boxShadow: '0 16px 60px rgba(0,0,0,0.6)', animation: 'fadeIn 0.15s ease' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 18 }}>
              {productModal === 'create' ? 'New Product' : `Edit: ${activeProduct?.name}`}
            </h3>
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={LABEL}>NAME</label><input style={INPUT} value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} required autoFocus /></div>
              <div><label style={LABEL}>DESCRIPTION</label><textarea style={TEXTAREA} value={productForm.description} onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} /></div>
              {productError && <div style={{ fontSize: 12, color: '#cc6b55', padding: '6px 10px', background: 'rgba(204,107,85,0.08)', borderRadius: 6 }}>{productError}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={closeProductModal} className="btn-ghost" style={{ flex: 1, padding: '9px 0', fontSize: 12 }}>Cancel</button>
                <button type="submit" disabled={productSaving} className="btn-primary" style={{ flex: 2, padding: '9px 0', fontSize: 12, fontWeight: 700 }}>{productSaving ? 'Saving…' : 'Save product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden product image input used elsewhere */}
      <input ref={productImageInputRef} type="file" accept="image/*" style={{ display: 'none' }} />
    </div>
  );
}
