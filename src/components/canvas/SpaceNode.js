'use client';

import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

const statusConfig = {
  empty: { label: 'Empty', className: 'badge-empty' },
  uploaded: { label: 'Uploaded', className: 'badge-uploaded' },
  analyzing: { label: 'Analyzing...', className: 'badge-analyzing' },
  stitching: { label: 'Stitching...', className: 'badge-stitching' },
  ready: { label: 'Ready', className: 'badge-ready' },
  error: { label: 'Error', className: 'badge-error' },
};

function SpaceNode({ id, data, selected }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label || 'New Space');
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

  return (
    <div className={`space-node ${selected ? 'selected' : ''}`}>
      {/* Connection handles */}
      <Handle type="target" position={Position.Top} style={{ background: '#7c3aed', border: '2px solid #0d0d1a', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#7c3aed', border: '2px solid #0d0d1a', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ background: '#7c3aed', border: '2px solid #0d0d1a', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="right-source" style={{ background: '#7c3aed', border: '2px solid #0d0d1a', width: 10, height: 10 }} />

      {/* Header */}
      <div className="space-node-header">
        <div className="space-node-label">
          🏠
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
            <span onClick={() => setEditing(true)} style={{ cursor: 'text' }}>{label}</span>
          )}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="space-node-thumb">
        {data.panoramaUrl ? (
          <img src={data.panoramaUrl} alt={label} />
        ) : data.images?.length > 0 ? (
          <img src={data.images[0].url} alt={label} />
        ) : (
          '📷'
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
      <div className="space-node-actions">
        <button
          className="btn btn-secondary"
          onClick={(e) => { e.stopPropagation(); dispatch('openCapture'); }}
        >
          📷 Capture
        </button>
        <button
          className="btn btn-secondary"
          onClick={(e) => { e.stopPropagation(); dispatch('openUpload'); }}
        >
          � Upload
        </button>
        <button
          className="btn btn-primary"
          onClick={(e) => { e.stopPropagation(); dispatch('openPreview'); }}
          disabled={!data.panoramaUrl}
          style={{ opacity: data.panoramaUrl ? 1 : 0.4 }}
        >
          👁️ Preview
        </button>
      </div>
    </div>
  );
}

export default memo(SpaceNode);
