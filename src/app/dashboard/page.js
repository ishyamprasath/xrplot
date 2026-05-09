'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Globe, Plus, MapPin, Link2, Edit2, Trash2, Sparkles, Folder, History, MoreVertical, Copy, Move, ChevronRight, FolderPlus } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [worlds, setWorlds] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(null); // null or { parentId }
  const [showDelete, setShowDelete] = useState(null); // { type: 'world'|'folder', id }
  const [showMove, setShowMove] = useState(null); // { type: 'world'|'folder', id, currentParentId }
  const [showCopy, setShowCopy] = useState(null); // { type: 'world'|'folder', id }
  const [moving, setMoving] = useState(false);
  
  const [newWorldName, setNewWorldName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // { type: 'world'|'folder', id }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [worldsRes, foldersRes] = await Promise.all([
        fetch('/api/worlds'),
        fetch('/api/folders')
      ]);
      
      if (worldsRes.ok) setWorlds(await worldsRes.json());
      if (foldersRes.ok) setFolders(await foldersRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rootWorlds = useMemo(() => worlds.filter(w => !w.isPredictionWorld && !w.folderId), [worlds]);
  const rootFolders = useMemo(() => folders.filter(f => !f.parentId), [folders]);
  const predictionWorlds = useMemo(() => worlds.filter(w => w.isPredictionWorld), [worlds]);

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

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newFolderName.trim(),
          parentId: showCreateFolder?.parentId || null
        }),
      });
      if (res.ok) {
        const folder = await res.json();
        setFolders(prev => [folder, ...prev]);
        setShowCreateFolder(null);
        setNewFolderName('');
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorld = async (worldId) => {
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
    console.log('[MOVE FRONTEND] worldId:', worldId);
    console.log('[MOVE FRONTEND] targetFolderId:', targetFolderId);
    console.log('[MOVE FRONTEND] worldId type:', typeof worldId);
    
    try {
      const res = await fetch(`/api/worlds/${worldId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId }),
      });
      
      console.log('[MOVE FRONTEND] response status:', res.status);
      console.log('[MOVE FRONTEND] response ok:', res.ok);
      
      if (res.ok) {
        const updatedWorld = await res.json();
        console.log('[MOVE FRONTEND] success:', updatedWorld);
        setWorlds(prev => prev.map(w => w._id === worldId ? updatedWorld : w));
        setShowMove(null);
      } else {
        const errorData = await res.json();
        console.log('[MOVE FRONTEND] error:', errorData);
        alert(`Failed to move world: ${errorData.error || 'Unknown error'}`);
        // Refresh data to ensure UI consistency
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to move world:', err);
      alert('Failed to move world. Please try again.');
      // Refresh data to ensure UI consistency
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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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

  return (
    <>
      <div className="animated-bg" />

      
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! Manage your immersive worlds and predictions.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-secondary btn-lg"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => router.push('/prediction')}
            >
              <Globe size={18} /> Decade 2.0
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => setShowCreateFolder({ parentId: null })} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderPlus size={18} /> New Folder
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
              <Plus size={18} /> Create New World
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
        ) : worlds.length === 0 && folders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Globe size={64} strokeWidth={1.5} />
            </div>
            <h2>Start Your Journey</h2>
            <p>Create your first 360° world, organize them into folders, or use Decade 2.0 to predict the future.</p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
              <button className="btn btn-secondary btn-lg" onClick={() => router.push('/prediction')}><Globe size={18} /> Decade 2.0</button>
              <button className="btn btn-ghost btn-lg" onClick={() => setShowCreateFolder({ parentId: null })}><FolderPlus size={18} /> New Folder</button>
              <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}><Plus size={18} /> Create Your First World</button>
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
              </div>
            </div>

            {/* Standard Worlds Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <Globe size={20} className="text-violet" />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Your Worlds</h2>
              </div>
              {renderWorldGrid(rootWorlds, "No worlds at the root. Use folders to stay organized or create a new world.")}
            </div>

            {/* Predictions Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <History size={20} className="text-cyan" />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Decade 2.0 Predictions</h2>
              </div>
              {renderWorldGrid(predictionWorlds, "No predictions generated yet. Use the 'Decade 2.0' button to build future worlds.")}
            </div>
          </div>
        )}
      </div>

      {/* Create World Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Sparkles size={20} /> Create New World</h2>
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
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating || !newWorldName.trim()}>
                  {creating ? 'Creating...' : 'Create World'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="modal-overlay" onClick={() => setShowDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="confirm-dialog">
              <h2 style={{ marginBottom: 'var(--space-md)' }}>
                <Trash2 size={24} style={{ color: 'var(--red-light)' }} /> 
                Delete {showDelete.type === 'world' ? 'World' : 'Folder'}?
              </h2>
              <p>
                {showDelete.type === 'world' 
                  ? 'This will permanently delete this world and all its images. This action cannot be undone.'
                  : 'This will delete the folder. Items inside will be moved to the parent folder or root.'}
              </p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setShowDelete(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => showDelete.type === 'world' ? handleDeleteWorld(showDelete.id) : handleDeleteFolder(showDelete.id)}>
                  Delete {showDelete.type === 'world' ? 'Forever' : 'Folder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button */}
      <button 
        className="mobile-fab"
        onClick={() => setShowCreate(true)}
        title="Create New World"
      >
        <Plus size={24} />
      </button>
    </>
  );
}
