'use client';

import { memo, useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

function SpaceNode({ id, data, selected }) {
  const [label, setLabel] = useState(data?.label || 'Space');

  useEffect(() => {
    setLabel(data?.label || 'Space');
  }, [data?.label]);

  const dispatch = (type, detail = {}) => {
    window.dispatchEvent(new CustomEvent('xrplot-action', { detail: { type, nodeId: id, ...detail } }));
  };

  const thumbnail = data?.panoramaUrl || data?.images?.[0]?.url || '';
  const statusLabel = data?.panoramaUrl ? 'Ready' : (data?.status || 'Empty');

  const commitLabel = () => {
    const nextLabel = label.trim() || 'Space';
    if (nextLabel !== (data?.label || 'Space')) {
      dispatch('updateNodeLabel', { data: { label: nextLabel } });
    }
  };

  return (
    <div className={`space-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="space-node-header">
        <div className="space-node-label">
          <span>◉</span>
          <input
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            aria-label="Space name"
            style={{
              width: '100%',
              padding: '0',
              border: 'none',
              background: 'transparent',
              boxShadow: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      <div className="space-node-thumb">
        {thumbnail ? <img src={thumbnail} alt={label} /> : <span>+</span>}
      </div>

      <div className="space-node-status">
        <span className={`badge ${data?.panoramaUrl ? 'badge-ready' : 'badge-empty'}`}>{statusLabel}</span>
      </div>

      <div className="space-node-actions nodrag nopan">
        <button className="btn btn-secondary" onClick={() => dispatch('openCapture')}>Capture</button>
        <button className="btn btn-secondary" onClick={() => dispatch('openUpload')}>Upload</button>
        <button className="btn btn-primary" disabled={!data?.panoramaUrl} onClick={() => dispatch('openPreview')}>Preview</button>
      </div>
    </div>
  );
}

export default memo(SpaceNode);