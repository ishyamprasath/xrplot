'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

const PanoramaViewer = dynamic(() => import('./PanoramaViewer'), { ssr: false });

export default function WorldViewer({ world, onExit }) {
  const readyNodes = (world.nodes || []).filter(n => n.panoramaUrl && n.status === 'ready');
  const [currentNodeId, setCurrentNodeId] = useState(readyNodes[0]?.id || null);
  const [transitioning, setTransitioning] = useState(false);

  const currentNode = world.nodes?.find(n => n.id === currentNodeId);

  // Find connected nodes
  const getConnections = useCallback(() => {
    if (!currentNodeId) return [];
    return (world.edges || []).filter(
      e => e.source === currentNodeId || e.target === currentNodeId
    ).map(e => {
      const targetId = e.source === currentNodeId ? e.target : e.source;
      const targetNode = world.nodes?.find(n => n.id === targetId);
      return { edge: e, node: targetNode };
    }).filter(c => c.node?.panoramaUrl);
  }, [currentNodeId, world]);

  const connections = getConnections();

  const navigateTo = useCallback((nodeId) => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentNodeId(nodeId);
      setTransitioning(false);
    }, 600);
  }, []);

  if (!currentNode?.panoramaUrl) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', flexDirection: 'column', gap: 16,
      }}>
        <p style={{ color: 'var(--text-secondary)' }}>No panoramas ready yet. Stitch at least one space first.</p>
        <button className="btn btn-secondary" onClick={onExit}>← Back to Editor</button>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Transition overlay */}
      <div style={{
        position: 'absolute', inset: 0, background: '#000', zIndex: 20,
        opacity: transitioning ? 1 : 0, transition: 'opacity 0.5s ease',
        pointerEvents: transitioning ? 'auto' : 'none',
      }} />

      {/* Panorama */}
      <PanoramaViewer imageUrl={currentNode.panoramaUrl} />

      {/* Top overlay */}
      <div className="viewer-overlay">
        <div className="viewer-label">📍 {currentNode.label}</div>
        <button className="viewer-exit-btn" onClick={onExit}>✕ Exit Preview</button>
      </div>

      {/* Navigation hotspots */}
      <div style={{
        position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 12, zIndex: 10,
      }}>
        {connections.map(({ edge, node }) => (
          <button
            key={node.id}
            className="hotspot"
            onClick={() => navigateTo(node.id)}
            style={{ width: 'auto', borderRadius: 'var(--radius-lg)', padding: '10px 20px', fontSize: '0.85rem' }}
            title={`Go to ${node.label}`}
          >
            → {node.label}
          </button>
        ))}
      </div>

      {/* Minimap */}
      <div className="viewer-minimap">
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>World Map</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {readyNodes.map(n => (
            <button
              key={n.id}
              onClick={() => navigateTo(n.id)}
              style={{
                padding: '3px 8px', fontSize: '0.65rem', borderRadius: 4,
                border: n.id === currentNodeId ? '1px solid var(--violet)' : '1px solid var(--border-subtle)',
                background: n.id === currentNodeId ? 'var(--violet-glow)' : 'var(--bg-card)',
                color: 'var(--text-primary)', cursor: 'pointer',
              }}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        position: 'absolute', bottom: 'var(--space-md)', left: '50%', transform: 'translateX(-50%)',
        background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
        padding: '6px 16px', borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem', color: 'var(--text-muted)', zIndex: 10,
      }}>
        🖱️ Drag to explore · Click arrows to navigate · Scroll to zoom
      </div>
    </div>
  );
}
