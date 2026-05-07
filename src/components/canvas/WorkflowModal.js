'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, Play, Settings2, List } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function WorkflowModal({ nodeId, nodeData, onClose, onUpdate }) {
  const [workflows, setWorkflows] = useState(nodeData.workflows || []);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleAddWorkflow = () => {
    const newWorkflow = {
      id: uuidv4(),
      name: `Workflow ${workflows.length + 1}`,
      steps: [],
      status: 'draft'
    };
    const updated = [...workflows, newWorkflow];
    console.log("WorkflowModal: Updating node", nodeId, "with workflows:", updated);
    setWorkflows(updated);
    onUpdate(nodeId, { workflows: updated });
  };

  const handleDeleteWorkflow = (id) => {
    const updated = workflows.filter(w => w.id !== id);
    console.log("WorkflowModal: Updating node", nodeId, "after delete:", updated);
    setWorkflows(updated);
    onUpdate(nodeId, { workflows: updated });
  };

  const startEditing = (workflow) => {
    setEditingId(workflow.id);
    setEditName(workflow.name);
  };

  const saveEdit = (id) => {
    const updated = workflows.map(w => w.id === id ? { ...w, name: editName } : w);
    setWorkflows(updated);
    onUpdate(nodeId, { workflows: updated });
    setEditingId(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: '90%' }}>
        <div className="modal-header">
          <h2><List size={20} /> Workflows: {nodeData.label}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: '20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Manage automation workflows for this space.
            </p>
            <button className="btn btn-primary btn-sm" onClick={handleAddWorkflow}>
              <Plus size={14} /> Add
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {workflows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No workflows defined yet.</p>
              </div>
            ) : (
              workflows.map(wf => (
                <div 
                  key={wf.id}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px', 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '10px' 
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingId === wf.id ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          className="input" 
                          value={editName} 
                          onChange={e => setEditName(e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                          autoFocus
                        />
                        <button className="btn btn-ghost btn-sm" onClick={() => saveEdit(wf.id)}><Check size={14} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>{wf.name}</span>
                        <button className="btn-icon-xs" onClick={() => startEditing(wf)}><Edit2 size={12} /></button>
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {wf.steps?.length || 0} steps · Status: {wf.status}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-ghost btn-sm" title="Configure steps" style={{ padding: '6px' }}>
                      <Settings2 size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" title="Run workflow" style={{ padding: '6px', color: 'var(--cyan)' }}>
                      <Play size={14} />
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => handleDeleteWorkflow(wf.id)}
                      style={{ padding: '6px', color: 'var(--red-light)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
