'use client';

import { memo, useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

const statusConfig = {
  empty: { label: 'No panorama', className: 'badge-empty' },
  uploaded: { label: 'Uploaded', className: 'badge-uploaded' },
  analyzing: { label: 'Analyzing', className: 'badge-analyzing' },
  stitching: { label: 'Stitching', className: 'badge-stitching' },
  ready: { label: 'Ready', className: 'badge-ready' },
  error: { label: 'Needs review', className: 'badge-error' },
};

function SpaceNode({ id, data, selected }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label || 'New Space');
  const status = statusConfig[data.status] || statusConfig.empty;
  const imageCount = data.images?.length || 0;

  useEffect(() => {
    setLabel(data.label || 'New Space');
  }, [data.label]);

  const dispatch = (type, detail = {}) => {
    window.dispatchEvent(new CustomEvent('xrplot-action', { detail: { type, nodeId: id, ...detail } }));
  };

  const handleLabelBlur = () => {
    setEditing(false);
    const nextLabel = label.trim() || 'New Space';
    setLabel(nextLabel);
    if (nextLabel !== data.label) {
      dispatch('updateNodeLabel', { data: { label: nextLabel } });
    }
  };

  return (
    <div className={`space-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="node-handle node-handle-top" />
      <Handle type="source" position={Position.Bottom} className="node-handle node-handle-bottom" />
      <Handle type="target" position={Position.Left} id="left-target" className="node-handle node-handle-left" />
      <Handle type="source" position={Position.Right} id="right-source" className="node-handle node-handle-right" />

      <div className="space-node-topline">
        <span className="node-type-chip">Space</span>
        <span className={`node-readiness ${data.panoramaUrl ? 'ready' : ''}`} />
      </div>

      <div className="space-node-thumb">
        {data.panoramaUrl ? (
          <img src={data.panoramaUrl} alt={label} />
        ) : data.images?.length > 0 ? (
          <img src={data.images[0].url} alt={label} />
        ) : (
          <div className="node-placeholder">
            <span />
            <strong>360</strong>
          </div>
        )}
      </div>

      <div className="space-node-body">
        {editing ? (
          <input
            className="input node-title-input"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={e => e.key === 'Enter' && handleLabelBlur()}
            autoFocus
          />
        ) : (
          <button className="space-node-title" onClick={() => setEditing(true)}>
            {label}
          </button>
        )}
        <span className={`badge ${status.className}`}>
          <span className="badge-dot" />
          {status.label}
          {imageCount > 0 ? ` - ${imageCount} images` : ''}
        </span>
      </div>

      <div className="space-node-actions">
        <button
          className="btn btn-secondary"
          onClick={(e) => { e.stopPropagation(); dispatch('openCapture'); }}
        >
          Capture
        </button>
        <button
          className="btn btn-secondary"
          onClick={(e) => { e.stopPropagation(); dispatch('openUpload'); }}
        >
          Upload
        </button>
        <button
          className="btn btn-primary"
          onClick={(e) => { e.stopPropagation(); dispatch('openPreview'); }}
          disabled={!data.panoramaUrl}
          title={!data.panoramaUrl ? 'Add a panorama before previewing this space' : 'Preview this space'}
        >
          Preview
        </button>
      </div>
    </div>
  );
}

export default memo(SpaceNode);
