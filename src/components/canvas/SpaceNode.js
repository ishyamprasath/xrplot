'use client';

import { memo, useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Upload, Wand2, Eye, Trash2, Camera, Pencil, Check, X } from 'lucide-react';

const statusConfig = {
  empty: { label: 'Empty', className: 'badge-empty' },
  uploaded: { label: 'Uploaded', className: 'badge-uploaded' },
  analyzing: { label: 'Analyzing...', className: 'badge-analyzing' },
  stitching: { label: 'Stitching...', className: 'badge-stitching' },
  ready: { label: 'Ready', className: 'badge-ready' },
  error: { label: 'Error', className: 'badge-error' },
};

const handleStyle = { background: '#7c3aed', border: '2px solid #0d0d1a', width: 10, height: 10 };

function SpaceNode({ id, data, selected }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label || 'New Space');
  useEffect(() => { if (!editing) setLabel(data.label || 'New Space'); }, [data.label, editing]);
  const status = statusConfig[data.status] || statusConfig.empty;

  const dispatch = (type, detail = {}) => {
    window.dispatchEvent(new CustomEvent('xrplot-action', { detail: { type, nodeId: id, ...detail } }));
  };

  const handleLabelBlur = () => {
    setEditing(false);
    if (label !== data.label) {
      dispatch('updateNodeLabel', { data: { label } });
    }
  };

  const hasAIEdits = !!data.originalPanoramaUrl || (data.images && data.images.some(img => !!img.originalUrl));

  return (
    <div className={`space-node ${selected ? 'selected' : ''}`} style={{ position: 'relative' }}>
      
      {hasAIEdits && (
        <div style={{ position: 'absolute', top: -38, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '16px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', zIndex: 10 }}>
          <button 
            onClick={(e) => { e.stopPropagation(); dispatch('acceptChanges'); }}
            style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', transition: 'background 0.2s' }}
            title="Keep Changes"
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Check size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); dispatch('revertChanges'); }}
            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', transition: 'background 0.2s' }}
            title="Revert to Original"
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="target" position={Position.Left} id="left-target" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right-source" style={handleStyle} />

      {/* Header */}
      <div className="space-node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="space-node-label">
          {editing ? (
            <input
              className="input"
              style={{ padding: '2px 6px', fontSize: '0.85rem', width: 120 }}
              value={label}
              onChange={e => setLabel(e.target.value)}
              onBlur={handleLabelBlur}
              onKeyDown={e => e.key === 'Enter' && handleLabelBlur()}
              autoFocus
            />
          ) : (
            <span onClick={() => setEditing(true)} style={{ cursor: 'text', display: 'flex', alignItems: 'center', gap: 4 }}>
              {label} <Pencil size={10} style={{ opacity: 0.4 }} />
            </span>
          )}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); dispatch('deleteNode'); }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff4444', padding: '0 4px', display: 'flex', alignItems: 'center' }}
          title="Delete Node"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Thumbnail */}
      <div className="space-node-thumb">
        {data.panoramaUrl ? (
          <img src={data.panoramaUrl} alt={label} />
        ) : data.images?.length > 0 ? (
          <img src={data.images[0].url} alt={label} />
        ) : (
          <Camera size={24} style={{ opacity: 0.4 }} />
        )}
      </div>

      {/* Status */}
      <div className="space-node-status">
        <span className={`badge ${status.className}`}>
          <span className="badge-dot" />
          {status.label}
          {data.images?.length > 0 && ` · ${data.images.length} imgs`}
        </span>
      </div>

      {/* Actions */}
      <div className="space-node-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button
          className="btn"
          onClick={(e) => { e.stopPropagation(); dispatch('openUpload'); }}
          title="Upload Images"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '8px', flex: 1, borderRadius: '8px' }}
        >
          <Upload size={14} />
        </button>
        <button
          className="btn"
          onClick={(e) => { e.stopPropagation(); dispatch('openPrompt'); }}
          title="AI Prompt"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '8px', flex: 1, borderRadius: '8px' }}
        >
          <Wand2 size={14} />
        </button>
        <button
          className="btn"
          onClick={(e) => { e.stopPropagation(); dispatch('openPreview'); }}
          disabled={!data.panoramaUrl}
          title="Preview 360 View"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '8px', flex: 1, borderRadius: '8px', opacity: data.panoramaUrl ? 1 : 0.4 }}
        >
          <Eye size={14} />
        </button>
      </div>
    </div>
  );
}

export default memo(SpaceNode);
