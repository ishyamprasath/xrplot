'use client';

import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';

function ConnectionEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style = {} }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const dispatch = (type, detail = {}) => {
    window.dispatchEvent(new CustomEvent('xrplot-action', { detail: { type, edgeId: id, ...detail } }));
  };

  const hasImages = data?.transitionImages?.length > 0;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          strokeDasharray: hasImages ? 'none' : '8 5',
          animation: hasImages ? 'none' : 'flowDash 12s linear infinite',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            display: 'flex',
            gap: '6px',
            alignItems: 'center'
          }}
          className="nodrag nopan connection-edge-tools"
        >
          <button
            className={`edge-upload-btn ${hasImages ? 'ready' : ''}`}
            onClick={() => dispatch('openEdgeUpload')}
            title={hasImages ? `${data.transitionImages.length} transition photos` : 'Add transition photos'}
          >
            {hasImages ? 'OK' : '+'}
          </button>
          <button
            className="edge-delete-btn"
            onClick={() => dispatch('deleteEdge')}
            title="Delete Connection"
          >
            ✕
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(ConnectionEdge);
