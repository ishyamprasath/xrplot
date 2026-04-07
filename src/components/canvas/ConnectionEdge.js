'use client';

import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import { Trash2 } from 'lucide-react';

function ConnectionEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, data }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const handleDelete = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('xrplot-action', {
      detail: { type: 'deleteEdge', edgeId: id }
    }));
  };

  return (
    <>
      <BaseEdge path={edgePath} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={handleDelete}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#ffffff',
              border: '1.5px solid #1a1a2e',
              color: '#1a1a2e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              opacity: 0.7,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.borderColor = '#ef4444';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '0.7';
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#1a1a2e';
              e.currentTarget.style.color = '#1a1a2e';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Delete Connection"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(ConnectionEdge);
