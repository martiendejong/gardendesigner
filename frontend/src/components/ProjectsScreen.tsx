import { useState, useEffect } from 'react';
import { getProjects, deleteProject } from '../lib/api';
import type { Project, AuthUser } from '../lib/types';

interface Props {
  currentUser: AuthUser;
  onNewDesign: () => void;
  onOpenProject: (project: Project) => void;
  onLogout: () => void;
  onAdmin?: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ProjectsScreen({ currentUser, onNewDesign, onOpenProject, onLogout, onAdmin }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Delete this project? This cannot be undone.')) return;
    setDeletingId(id);
    await deleteProject(id).catch(() => {});
    setProjects(prev => prev.filter(p => p.id !== id));
    setDeletingId(null);
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--garden-black)',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(122,182,72,0.04) 0%, transparent 60%)',
    }}>
      {/* Header */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', borderBottom: '1px solid var(--garden-border)',
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
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 12px', borderRadius: 8,
            background: 'var(--garden-card)', border: '1px solid var(--garden-border)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{currentUser.firstname}</span>
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
            {currentUser.isAdmin && onAdmin && (
              <button onClick={onAdmin} style={{
                padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                background: 'var(--green-subtle)', border: '1px solid rgba(122,182,72,0.2)',
                color: 'var(--green-400)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-sans)',
              }}>Admin</button>
            )}
            <button onClick={onLogout} title="Sign out" style={{
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

          <button onClick={onNewDesign} className="btn-primary" style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Design
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px 48px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.02em' }}>
          My Gardens
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
          Pick up where you left off, or start a new design.
        </p>

        {loading && (
          <div style={{ display: 'flex', gap: 10, paddingTop: 40 }}>
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: 80, gap: 16,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'var(--garden-surface)', border: '1px solid var(--garden-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22V12"/><path d="M12 12C12 6.5 6 4 3 6"/><path d="M12 12C12 6.5 18 4 21 6"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>No garden designs yet</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Upload a photo and create your first design.</p>
            </div>
            <button onClick={onNewDesign} className="btn-primary" style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700, marginTop: 8 }}>
              Start your first design
            </button>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}>
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => onOpenProject(project)}
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${hoveredId === project.id ? 'rgba(122,182,72,0.35)' : 'var(--garden-border)'}`,
                  background: 'var(--garden-surface)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
                  boxShadow: hoveredId === project.id ? '0 8px 32px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
                  transform: hoveredId === project.id ? 'translateY(-2px)' : 'none',
                  position: 'relative',
                }}
              >
                {/* Thumbnail */}
                <div style={{ position: 'relative', paddingBottom: '65%', background: 'var(--garden-deep)', overflow: 'hidden' }}>
                  <img
                    src={project.latestImage}
                    alt={project.name}
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.2s',
                      transform: hoveredId === project.id ? 'scale(1.03)' : 'scale(1)',
                    }}
                  />
                  {/* Hover overlay */}
                  {hoveredId === project.id && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{
                        padding: '8px 20px', borderRadius: 8,
                        background: 'rgba(122,182,72,0.9)',
                        color: 'white', fontSize: 13, fontWeight: 700,
                        fontFamily: 'var(--font-sans)',
                      }}>
                        Open project
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {project.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatDate(project.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={e => handleDelete(e, project.id)}
                    disabled={deletingId === project.id}
                    title="Delete project"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', padding: 4,
                      opacity: hoveredId === project.id ? 1 : 0,
                      transition: 'opacity 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#cc6b55')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
