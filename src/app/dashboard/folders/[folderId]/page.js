'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Globe, Plus, MapPin, Link2, Edit2, Trash2, Sparkles, Folder, History, MoreVertical, Copy, Move, ChevronRight, FolderPlus, ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function FolderPage() {
  const { user } = useUser();
  const router = useRouter();
  const { folderId } = useParams();
  
  const [worlds, setWorlds] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showCreateFolder, setShowCreateFolder] = useState(null);
  const [showCreateWorld, setShowCreateWorld] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [showMove, setShowMove] = useState(null);
  const [showCopy, setShowCopy] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [creating, setCreating] = useState(false);
  const [moving, setMoving] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newWorldName, setNewWorldName] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [worldsRes, foldersRes] = await Promise.all([
        fetch('/api/worlds'),
        fetch('/api/folders')
      ]);
      
      if (worldsRes.ok) {
        const data = await worldsRes.json();
        setWorlds(data);
      }
      
      if (foldersRes.ok) {
        const data = await foldersRes.json();
        setAllFolders(data);
        setCurrentFolder(data.find(f => f._id === folderId));
      }
    } catch (err) {
      console.error('Failed to fetch folder data:', err);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentWorlds = useMemo(() => worlds.filter(w => w.folderId === folderId), [worlds, folderId]);
  const subFolders = useMemo(() => allFolders.filter(f => f.parentId === folderId), [allFolders, folderId]);

  const handleCreateWorld = async (e) => {
    e.preventDefault();
    if (!newWorldName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newWorldName.trim(),
          folderId: folderId
        }),
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
          parentId: folderId
        }),
      });
      if (res.ok) {
        const folder = await res.json();
        setAllFolders(prev => [folder, ...prev]);
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

  const handleDeleteFolder = async (fid) => {
    try {
      const res = await fetch(`/api/folders/${fid}`, { method: 'DELETE' });
      if (res.ok) {
        setAllFolders(prev => prev.filter(f => f._id !== fid));
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

  const handleMoveFolder = async (fid, targetParentId) => {
    try {
      const res = await fetch(`/api/folders/${fid}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFolderId: targetParentId }),
      });
      if (res.ok) {
        const updatedFolder = await res.json();
        setAllFolders(prev => prev.map(f => f._id === fid ? updatedFolder : f));
        setShowMove(null);
      }
    } catch (err) {
      console.error('Failed to move folder:', err);
    }
  };

  const handleCopyFolder = async (fid, targetParentId) => {
    try {
      const res = await fetch(`/api/folders/${fid}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFolderId: targetParentId }),
      });
      if (res.ok) {
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

  if (loading) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!currentFolder && !loading) {
    return (
      <div className="dashboard">
        <button className="btn btn-ghost" onClick={() => router.push('/dashboard')} style={{ marginBottom: '24px' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div className="empty-state">
          <h2>Folder not found</h2>
          <p>This folder may have been deleted or moved.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="animated-bg" />

      {/* Folder View */}
      <div className="dashboard">
        <div className="dashboard-header" style={{ marginBottom: '40px' }}>
          <div>
            <button className="btn btn-ghost" onClick={() => {
              if (currentFolder.parentId) router.push(`/dashboard/folders/${currentFolder.parentId}`);
              else router.push('/dashboard');
            }} style={{ padding: 0, color: 'var(--text-muted)', marginBottom: '16px' }}>
              <ArrowLeft size={16} /> {currentFolder.parentId ? 'Up one level' : 'Back to Dashboard'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Folder size={32} style={{ color: 'var(--violet)' }} />
              <h1 style={{ margin: 0 }}>{currentFolder.name}</h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-ghost btn-lg" onClick={() => setShowCreateFolder(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderPlus size={18} /> New Subfolder
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => setShowCreateWorld(true)}>
              <Plus size={18} /> Create New World
            </button>
          </div>
        </div>

        {currentWorlds.length === 0 && subFolders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Globe size={64} strokeWidth={1.5} />
            </div>
            <h2>Empty Folder</h2>
            <p>Move or copy worlds into this folder from the main dashboard to see them here.</p>
            <button className="btn btn-primary btn-lg" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {subFolders.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                  <Folder size={20} className="text-violet" />
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Subfolders</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                  {subFolders.map(f => (
                    <div 
                      key={f._id} 
                      className="card folder-card"
                      onClick={() => router.push(`/dashboard/folders/${f._id}`)}
                      style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    >
                      <Folder size={24} style={{ color: 'var(--violet)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {worlds.filter(w => w.folderId === f._id).length} worlds
                        </div>
                      </div>
                      <button 
                        className="card-menu-trigger"
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu?.id === f._id ? null : { type: 'folder', id: f._id }); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer' }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {activeMenu?.type === 'folder' && activeMenu?.id === f._id && (
                        <div className="card-menu-dropdown" onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', zIndex: 10, padding: '8px', minWidth: '140px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                          <button onClick={() => { setShowMove({ type: 'folder', id: f._id, currentParentId: f.parentId }); setActiveMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <Move size={14} /> Move to...
                          </button>
                          <button onClick={() => { setShowCopy({ type: 'folder', id: f._id }); setActiveMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <Copy size={14} /> Copy to...
                          </button>
                          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
                          <button onClick={() => { setShowDelete({ type: 'folder', id: f._id }); setActiveMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'var(--red-light)', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentWorlds.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                  <Globe size={20} className="text-violet" />
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Worlds in this Folder</h2>
                </div>
                <div className="worlds-grid">
                  {currentWorlds.map(world => (
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
                          style={{ position: 'absolute', top: 12, left: 12, zIndex: 6, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {activeMenu?.type === 'world' && activeMenu?.id === world._id && (
                          <div className="card-menu-dropdown" onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 40, left: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', zIndex: 10, padding: '8px', minWidth: '140px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                            <button onClick={() => { setShowMove({ type: 'world', id: world._id, currentParentId: world.folderId }); setActiveMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}>
                              <Move size={14} /> Move to...
                            </button>
                            <button onClick={() => { setShowCopy({ type: 'world', id: world._id }); setActiveMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}>
                              <Copy size={14} /> Copy to...
                            </button>
                            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
                            <button onClick={() => { setShowDelete({ type: 'world', id: world._id }); setActiveMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'var(--red-light)', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}>
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create World Modal */}
      {showCreateWorld && (
        <div className="modal-overlay" onClick={() => setShowCreateWorld(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Sparkles size={20} /> Create New World</h2>
              <button className="modal-close" onClick={() => setShowCreateWorld(false)}>×</button>
            </div>
            <form onSubmit={handleCreateWorld} className="create-world-form">
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
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateWorld(false)}>Cancel</button>
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
              <h2><FolderPlus size={20} /> New Subfolder</h2>
              <button className="modal-close" onClick={() => setShowCreateFolder(null)}>×</button>
            </div>
            <form onSubmit={handleCreateFolder} className="create-world-form">
              <div className="form-group">
                <label>Folder Name</label>
                <input
                  className="input"
                  placeholder="Sub-project, Category..."
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
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'white', textAlign: 'left', cursor: moving && showMove ? 'not-allowed' : 'pointer', opacity: moving && showMove ? 0.5 : 1 }}
                >
                  <Globe size={18} /> Root (No Folder)
                </button>
                {allFolders
                  .filter(f => {
                    const item = showMove || showCopy;
                    return !(item.type === 'folder' && item.id === f._id);
                  })
                  .map(f => (
                  <button 
                    key={f._id}
                    onClick={() => {
                      const item = showMove || showCopy;
                      if (showMove) {
                        item.type === 'world' ? handleMoveWorld(item.id, f._id) : handleMoveFolder(item.id, f._id);
                      } else {
                        item.type === 'world' ? handleCopyWorld(item.id, f._id) : handleCopyFolder(item.id, f._id);
                      }
                    }}
                    disabled={moving && showMove}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'white', textAlign: 'left', cursor: moving && showMove ? 'not-allowed' : 'pointer', opacity: moving && showMove ? 0.5 : 1 }}
                  >
                    <Folder size={18} style={{ color: 'var(--violet)' }} /> {f.name}
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
    </>
  );
}
