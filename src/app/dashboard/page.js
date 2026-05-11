'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
<<<<<<< HEAD
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Globe, MapPin, Link2, Edit2, Trash2, Sparkles, Folder, History, MoreVertical, Copy, Move, ChevronRight, FolderPlus } from 'lucide-react';
=======
import { useState, useEffect, useCallback } from 'react';
>>>>>>> b7b535f5abb9f831b9ea1a24893a77fde364eae4

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [worlds, setWorlds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
<<<<<<< HEAD
  const [showCreateFolder, setShowCreateFolder] = useState(null); // null or { parentId }
  const [showDelete, setShowDelete] = useState(null); // { type: 'world'|'folder', id }
  const [showMove, setShowMove] = useState(null); // { type: 'world'|'folder', id, currentParentId }
  const [showCopy, setShowCopy] = useState(null); // { type: 'world'|'folder', id }
  const [moving, setMoving] = useState(false);
  
=======
  const [showDelete, setShowDelete] = useState(null);
>>>>>>> b7b535f5abb9f831b9ea1a24893a77fde364eae4
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

<<<<<<< HEAD
  const handleDeleteFolder = async (folderId) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' });
      if (res.ok) {
        setFolders(prev => prev.filter(f => f._id !== folderId));
        fetchData();
        setShowDelete(null);
      }
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  const handleMoveWorld = async (worldId, targetFolderId) => {
    setMoving(true);
    try {
      const res = await fetch(`/api/worlds/${worldId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId }),
      });
      
      if (res.ok) {
        const updatedWorld = await res.json();
        setWorlds(prev => prev.map(w => w._id === worldId ? updatedWorld : w));
        setShowMove(null);
      } else {
        const errorData = await res.json();
        alert(`Failed to move world: ${errorData.error || 'Unknown error'}`);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to move world:', err);
      alert('Failed to move world. Please try again.');
      await fetchData();
    } finally {
      setMoving(false);
    }
  };

  const handleCopyWorld = async (worldId, targetFolderId) => {
    try {
      const res = await fetch(`/api/worlds/${worldId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId }),
      });
      if (res.ok) {
        const newWorld = await res.json();
        setWorlds(prev => [newWorld, ...prev]);
        setShowCopy(null);
      }
    } catch (err) {
      console.error('Failed to copy world:', err);
    }
  };

  const handleMoveFolder = async (folderId, targetParentId) => {
    try {
      const res = await fetch(`/api/folders/${folderId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFolderId: targetParentId }),
      });
      if (res.ok) {
        const updatedFolder = await res.json();
        setFolders(prev => prev.map(f => f._id === folderId ? updatedFolder : f));
        setShowMove(null);
      }
    } catch (err) {
      console.error('Failed to move folder:', err);
    }
  };

  const handleCopyFolder = async (folderId, targetParentId) => {
    try {
      const res = await fetch(`/api/folders/${folderId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFolderId: targetParentId }),
      });
      if (res.ok) {
        const newFolder = await res.json();
        setFolders(prev => [newFolder, ...prev]);
        fetchData();
        setShowCopy(null);
      }
    } catch (err) {
      console.error('Failed to copy folder:', err);
    }
  };

=======
>>>>>>> b7b535f5abb9f831b9ea1a24893a77fde364eae4
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

<<<<<<< HEAD
  const renderWorldGrid = (worldsToRender, emptyMessage) => {
    if (worldsToRender.length === 0) {
      return (
        <div className="empty-state-mini" style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border-medium)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="worlds-grid">
        {worldsToRender.map(world => (
          <div
            key={world._id}
            className="card card-glow world-card"
            onClick={() => router.push(`/worlds/${world._id}`)}
          >
            <div className="world-card-thumb" style={{ position: 'relative' }}>
              {world.isPredictionWorld && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--violet)', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px', boxShadow: '0 2px 10px rgba(124, 58, 237, 0.4)', zIndex: 5 }}>
                  PREDICTION
                </div>
              )}
              {world.nodes?.some(n => n.panoramaUrl) ? (
                <img
                  src={world.nodes.find(n => n.panoramaUrl)?.panoramaUrl}
                  alt={world.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Globe size={48} strokeWidth={1.5} />
              )}
              
              <button 
                className="card-menu-trigger"
                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu?.id === world._id ? null : { type: 'world', id: world._id }); }}
                style={{ position: 'absolute', top: 12, left: 12, zIndex: 6, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}
              >
                <MoreVertical size={16} />
              </button>
              
              {activeMenu?.type === 'world' && activeMenu?.id === world._id && (
                <div className="menu-dropdown" onClick={e => e.stopPropagation()} style={{ top: 40, left: 12 }}>
                  <button className="menu-item" onClick={() => { setShowMove({ type: 'world', id: world._id, currentParentId: world.folderId }); setActiveMenu(null); }}>
                    <Move size={14} /> Move to...
                  </button>
                  <button className="menu-item" onClick={() => { setShowCopy({ type: 'world', id: world._id }); setActiveMenu(null); }}>
                    <Copy size={14} /> Copy to...
                  </button>
                  <div className="menu-divider" />
                  <button className="menu-item danger" onClick={() => { setShowDelete({ type: 'world', id: world._id }); setActiveMenu(null); }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
            <div className="world-card-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {world.name.length > 28 ? `${world.name.substring(0, 25)}...` : world.name}
            </div>
            <div className="world-card-meta">
              <span><MapPin size={12} /> {world.nodes?.length || 0} spaces</span>
              <span><Link2 size={12} /> {world.edges?.length || 0} connections</span>
            </div>
            <div className="world-card-meta" style={{ marginTop: 4 }}>
              <span>Updated {formatDate(world.updatedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

=======
>>>>>>> b7b535f5abb9f831b9ea1a24893a77fde364eae4
  return (
    <>
      <div className="animated-bg" />
      
<<<<<<< HEAD
=======
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          🌍 <span>XRPlot</span>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </nav>

      {/* Dashboard */}
>>>>>>> b7b535f5abb9f831b9ea1a24893a77fde364eae4
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
<<<<<<< HEAD
              className="btn btn-secondary btn-lg"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => router.push('/prediction')}
=======
              className="btn btn-secondary"
              onClick={() => router.push('/create-tour')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
>>>>>>> b7b535f5abb9f831b9ea1a24893a77fde364eae4
            >
              🌐 Create Tour with AI
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
<<<<<<< HEAD
              Create New World
=======
              ✦ New World
>>>>>>> b7b535f5abb9f831b9ea1a24893a77fde364eae4
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
<<<<<<< HEAD
            <div className="empty-state-icon">
              <Globe size={64} strokeWidth={1.5} />
            </div>
            <h2>Start Your Journey</h2>
            <p>Create your first 360° world, organize them into folders, or use Decade 2.0 to predict the future.</p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
              <button className="btn btn-secondary btn-lg" onClick={() => router.push('/prediction')}><Globe size={18} /> Decade 2.0</button>
              <button className="btn btn-ghost btn-lg" onClick={() => setShowCreateFolder({ parentId: null })}><FolderPlus size={18} /> New Folder</button>
              <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>Create Your First World</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {/* Folders Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <Folder size={20} className="text-violet" />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Folders</h2>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {rootFolders.map(folder => (
                  <div 
                    key={folder._id} 
                    className="folder-card"
                    onClick={() => router.push(`/dashboard/folders/${folder._id}`)}
                  >
                    <Folder size={24} style={{ color: 'var(--violet)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {worlds.filter(w => w.folderId === folder._id).length} worlds, {folders.filter(f => f.parentId === folder._id).length} folders
                      </div>
                    </div>
                    
                    <button 
                      className="card-menu-trigger"
                      onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu?.id === folder._id ? null : { type: 'folder', id: folder._id }); }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {activeMenu?.type === 'folder' && activeMenu?.id === folder._id && (
                      <div className="menu-dropdown" onClick={e => e.stopPropagation()} style={{ top: '100%', right: 0, marginTop: '8px' }}>
                        <button className="menu-item" onClick={() => { setShowMove({ type: 'folder', id: folder._id, currentParentId: folder.parentId }); setActiveMenu(null); }}>
                          <Move size={14} /> Move to...
                        </button>
                        <button className="menu-item" onClick={() => { setShowCopy({ type: 'folder', id: folder._id }); setActiveMenu(null); }}>
                          <Copy size={14} /> Copy to...
                        </button>
                        <div className="menu-divider" />
                        <button className="menu-item danger" onClick={() => { setShowDelete({ type: 'folder', id: folder._id }); setActiveMenu(null); }}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                    
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ))}
                {rootFolders.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No folders created yet. Organize your worlds by creating folders.</p>
                )}
=======
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
>>>>>>> b7b535f5abb9f831b9ea1a24893a77fde364eae4
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

<<<<<<< HEAD
      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="modal-overlay" onClick={() => setShowCreateFolder(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FolderPlus size={20} /> New Folder</h2>
              <button className="modal-close" onClick={() => setShowCreateFolder(null)}>×</button>
            </div>
            <form onSubmit={handleCreateFolder} className="create-world-form">
              <div className="form-group">
                <label>Folder Name</label>
                <input
                  className="input"
                  placeholder="Projects, Client A, Personal..."
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateFolder(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating || !newFolderName.trim()}>
                  {creating ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move/Copy Selection Modal */}
      {(showMove || showCopy) && (
        <div className="modal-overlay" onClick={() => { setShowMove(null); setShowCopy(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>
                {(showMove || showCopy).type === 'world' ? (showMove ? <Move size={20} /> : <Copy size={20} />) : <Folder size={20} />} 
                {showMove ? ' Move' : ' Copy'} to Folder
              </h2>
              <button className="modal-close" onClick={() => { setShowMove(null); setShowCopy(null); }}>×</button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Select target folder:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                <button 
                  onClick={() => {
                    const item = showMove || showCopy;
                    if (showMove) {
                      item.type === 'world' ? handleMoveWorld(item.id, null) : handleMoveFolder(item.id, null);
                    } else {
                      item.type === 'world' ? handleCopyWorld(item.id, null) : handleCopyFolder(item.id, null);
                    }
                  }}
                  disabled={moving && showMove}
                  className="menu-item"
                  style={{ padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', marginBottom: '8px', opacity: moving && showMove ? 0.5 : 1 }}
                >
                  <Globe size={18} /> Root (No Folder)
                </button>
                {folders
                  .filter(f => {
                    const item = showMove || showCopy;
                    // Prevent moving folder into itself
                    return !(item.type === 'folder' && item.id === f._id);
                  })
                  .map(folder => (
                  <button 
                    key={folder._id}
                    onClick={() => {
                      const item = showMove || showCopy;
                      if (showMove) {
                        item.type === 'world' ? handleMoveWorld(item.id, folder._id) : handleMoveFolder(item.id, folder._id);
                      } else {
                        item.type === 'world' ? handleCopyWorld(item.id, folder._id) : handleCopyFolder(item.id, folder._id);
                      }
                    }}
                    disabled={moving && showMove}
                    className="menu-item"
                    style={{ padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', marginBottom: '8px', opacity: moving && showMove ? 0.5 : 1 }}
                  >
                    <Folder size={18} style={{ color: 'var(--violet)' }} /> {folder.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

=======
>>>>>>> b7b535f5abb9f831b9ea1a24893a77fde364eae4
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
