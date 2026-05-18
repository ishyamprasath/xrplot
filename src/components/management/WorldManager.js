'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Edit2, Trash2, Save, X, Globe, MapPin, Layers } from 'lucide-react';

export default function WorldManager({ 
  worlds = [], 
  folders = [], 
  onWorldCreate, 
  onWorldUpdate, 
  onWorldDelete,
  onFolderCreate,
  onFolderUpdate,
  onFolderDelete,
  onClose 
}) {
  const [activeTab, setActiveTab] = useState('worlds');
  const [editingWorld, setEditingWorld] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [newWorldName, setNewWorldName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);

  const filteredWorlds = selectedFolder 
    ? worlds.filter(world => world.folderId === selectedFolder)
    : worlds;

  const handleCreateWorld = () => {
    if (newWorldName.trim()) {
      onWorldCreate({
        name: newWorldName.trim(),
        folderId: selectedFolder,
        nodes: [],
        edges: []
      });
      setNewWorldName('');
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onFolderCreate({
        name: newFolderName.trim(),
        description: ''
      });
      setNewFolderName('');
    }
  };

  const handleUpdateWorld = (worldId, updates) => {
    onWorldUpdate(worldId, updates);
    setEditingWorld(null);
  };

  const handleUpdateFolder = (folderId, updates) => {
    onFolderUpdate(folderId, updates);
    setEditingFolder(null);
  };

  const handleDeleteWorld = (worldId) => {
    if (confirm('Are you sure you want to delete this world? This cannot be undone.')) {
      onWorldDelete(worldId);
    }
  };

  const handleDeleteFolder = (folderId) => {
    const worldsInFolder = worlds.filter(world => world.folderId === folderId);
    if (worldsInFolder.length > 0) {
      alert(`Cannot delete folder with ${worldsInFolder.length} world(s). Move or delete the worlds first.`);
      return;
    }
    
    if (confirm('Are you sure you want to delete this folder?')) {
      onFolderDelete(folderId);
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2><Layers size={20} /> World & Folder Management</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('worlds')}
            style={{
              padding: '12px 20px',
              background: activeTab === 'worlds' ? 'var(--violet)' : 'transparent',
              color: activeTab === 'worlds' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0'
            }}
          >
            <Globe size={16} style={{ marginRight: '8px' }} />
            Worlds ({worlds.length})
          </button>
          <button
            onClick={() => setActiveTab('folders')}
            style={{
              padding: '12px 20px',
              background: activeTab === 'folders' ? 'var(--violet)' : 'transparent',
              color: activeTab === 'folders' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0'
            }}
          >
            <FolderOpen size={16} style={{ marginRight: '8px' }} />
            Folders ({folders.length})
          </button>
        </div>

        {/* Worlds Tab */}
        {activeTab === 'worlds' && (
          <div>
            {/* Folder Filter */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Filter by Folder:
              </label>
              <select
                value={selectedFolder || ''}
                onChange={(e) => setSelectedFolder(e.target.value || null)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'white'
                }}
              >
                <option value="">All Folders</option>
                {folders.map((folder, idx) => (
                  <option key={folder._id || folder.id || `folder-${idx}`} value={folder._id || folder.id || ''}>{folder.name}</option>
                ))}
              </select>
            </div>

            {/* Create World */}
            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '12px', color: 'var(--violet-light)' }}>Create New World</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="World name..."
                  value={newWorldName}
                  onChange={(e) => setNewWorldName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateWorld()}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'white'
                  }}
                />
                <button
                  onClick={handleCreateWorld}
                  disabled={!newWorldName.trim()}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--violet)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} /> Create
                </button>
              </div>
            </div>

            {/* Worlds List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredWorlds.map((world, idx) => (
                <div
                  key={world._id || world.id || `world-${idx}`}
                  style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  {editingWorld === world.id ? (
                    <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        defaultValue={world.name}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateWorld(world.id, { name: e.target.value });
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--violet)',
                          borderRadius: '4px',
                          color: 'white'
                        }}
                      />
                      <button
                        onClick={() => setEditingWorld(null)}
                        style={{ padding: '6px', background: 'var(--text-secondary)', border: 'none', borderRadius: '4px', color: 'white' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>
                          {world.name.length > 30 ? `${world.name.substring(0, 27)}...` : world.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {world.nodes?.length || 0} nodes • {world.edges?.length || 0} connections
                          {world.folderId && (
                            <span style={{ marginLeft: '8px' }}>
                              <FolderOpen size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                              {folders.find(f => (f._id || f.id) === world.folderId)?.name || 'Unknown Folder'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setEditingWorld(world.id)}
                          style={{ padding: '6px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-secondary)' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteWorld(world.id)}
                          style={{ padding: '6px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Folders Tab */}
        {activeTab === 'folders' && (
          <div>
            {/* Create Folder */}
            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '12px', color: 'var(--violet-light)' }}>Create New Folder</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'white'
                  }}
                />
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--violet)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} /> Create
                </button>
              </div>
            </div>

            {/* Folders List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {folders.map((folder, idx) => {
                const folderId = folder._id || folder.id;
                const worldCount = worlds.filter(world => (world.folderId === folderId)).length;
                return (
                  <div
                    key={folderId || `folder-${idx}`}
                    style={{
                      padding: '16px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    {editingFolder === folder.id ? (
                      <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          defaultValue={folder.name}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateFolder(folder.id, { name: e.target.value });
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--violet)',
                            borderRadius: '4px',
                            color: 'white'
                          }}
                        />
                        <button
                          onClick={() => setEditingFolder(null)}
                          style={{ padding: '6px', background: 'var(--text-secondary)', border: 'none', borderRadius: '4px', color: 'white' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>{folder.name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {worldCount} world{worldCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setEditingFolder(folder.id)}
                            style={{ padding: '6px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-secondary)' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteFolder(folder.id)}
                            style={{ padding: '6px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
