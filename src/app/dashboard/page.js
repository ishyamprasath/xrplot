'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [worlds, setWorlds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [newWorldName, setNewWorldName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchWorlds = useCallback(async () => {
    try {
      const res = await fetch('/api/worlds');
      if (res.ok) {
        const data = await res.json();
        setWorlds(data);
      }
    } catch (err) {
      console.error('Failed to fetch worlds:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newWorldName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorldName.trim() }),
      });
      if (res.ok) {
        const world = await res.json();
        router.push(`/worlds/${world._id}`);
      }
    } catch (err) {
      console.error('Failed to create world:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (worldId) => {
    try {
      const res = await fetch(`/api/worlds/${worldId}`, { method: 'DELETE' });
      if (res.ok) {
        setWorlds(prev => prev.filter(w => w._id !== worldId));
        setShowDelete(null);
      }
    } catch (err) {
      console.error('Failed to delete world:', err);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <div className="animated-bg" />
      
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          🌍 <span>XRPlot</span>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </nav>

      {/* Dashboard */}
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Your Worlds</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! Build immersive 360° experiences.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => router.push('/create-tour')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              🌐 Create Tour with AI
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
              ✦ New World
            </button>
          </div>
        </div>

        {loading ? (
          <div className="worlds-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="card">
                <div className="skeleton" style={{ height: 160, marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '40%' }} />
              </div>
            ))}
          </div>
        ) : worlds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🌌</div>
            <h2>No worlds yet</h2>
            <p>Create your first 360° world and start building immersive experiences from your photos.</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => router.push('/create-tour')}
              >
                🌐 Create Tour with AI Camera
              </button>
              <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
                ✦ Create Empty World
              </button>
            </div>
          </div>
        ) : (
          <div className="worlds-grid">
            {worlds.map(world => (
              <div
                key={world._id}
                className="card card-glow world-card"
                onClick={() => router.push(`/worlds/${world._id}`)}
              >
                <div className="world-card-thumb">
                  {world.nodes?.some(n => n.panoramaUrl) ? (
                    <img
                      src={world.nodes.find(n => n.panoramaUrl)?.panoramaUrl}
                      alt={world.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    '🌍'
                  )}
                </div>
                <div className="world-card-name">{world.name}</div>
                <div className="world-card-meta">
                  <span>📍 {world.nodes?.length || 0} spaces</span>
                  <span>🔗 {world.edges?.length || 0} connections</span>
                </div>
                <div className="world-card-meta" style={{ marginTop: 4 }}>
                  <span>Updated {formatDate(world.updatedAt)}</span>
                </div>
                <div className="world-card-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => router.push(`/worlds/${world._id}`)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowDelete(world._id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create World Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✦ Create New World</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} className="create-world-form">
              <div className="form-group">
                <label>World Name</label>
                <input
                  className="input"
                  placeholder="My Dream Home, Downtown Street, Office Building..."
                  value={newWorldName}
                  onChange={e => setNewWorldName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating || !newWorldName.trim()}>
                  {creating ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating...</> : '✦ Create World'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="modal-overlay" onClick={() => setShowDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="confirm-dialog">
              <h2 style={{ marginBottom: 'var(--space-md)' }}>🗑️ Delete World?</h2>
              <p>This will permanently delete this world and all its images. This action cannot be undone.</p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setShowDelete(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDelete(showDelete)}>Delete Forever</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
