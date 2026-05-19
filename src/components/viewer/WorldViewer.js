'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const TourViewer = dynamic(() => import('./TourViewer'), { ssr: false });

export default function WorldViewer({ world, onExit }) {
  const readyNodes = (world.nodes || []).filter(n => n.panoramaUrl && n.status === 'ready');
  const [currentNodeId, setCurrentNodeId] = useState(readyNodes[0]?.id || null);
  const [transitioning, setTransitioning] = useState(false);
  const [hotspotPlacements, setHotspotPlacements] = useState({});
  const [placementNotice, setPlacementNotice] = useState('');
  const [activePlacementHotspotId, setActivePlacementHotspotId] = useState(null);

  const currentNode = world.nodes?.find(n => n.id === currentNodeId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`xrplot-hotspot-layout:${world?._id || 'default'}`);
      setHotspotPlacements(saved ? JSON.parse(saved) : {});
    } catch (err) {
      setHotspotPlacements({});
    }
  }, [world?._id]);

  const persistPlacements = useCallback((nextPlacements) => {
    setHotspotPlacements(nextPlacements);
    try {
      localStorage.setItem(`xrplot-hotspot-layout:${world?._id || 'default'}`, JSON.stringify(nextPlacements));
    } catch (err) {}
  }, [world?._id]);

  // Calculate yaw based on node position (simple implementation)
  const calculateYaw = useCallback((node) => {
    // For now, distribute hotspots evenly around 360 degrees
    const index = readyNodes.findIndex(n => n.id === node.id);
    if (index === -1) return 0;
    return (index * 360 / readyNodes.length) - 180;
  }, [readyNodes]);

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

  const beginHotspotPlacement = useCallback((nodeId) => {
    setActivePlacementHotspotId(nodeId);
    setPlacementNotice(`${world.nodes?.find(n => n.id === nodeId)?.label || 'Node'} is ready to move. Tap the panorama to place it.`);
    window.setTimeout(() => setPlacementNotice(''), 1800);
  }, [world.nodes]);

  const placeHotspot = useCallback((nodeId, pitch, yaw) => {
    const nextPlacements = {
      ...hotspotPlacements,
      [nodeId]: { pitch, yaw },
    };

    persistPlacements(nextPlacements);
    setActivePlacementHotspotId(null);
    setPlacementNotice(`${world.nodes?.find(n => n.id === nodeId)?.label || 'Node'} hotspot moved.`);
    window.setTimeout(() => setPlacementNotice(''), 1400);
  }, [hotspotPlacements, persistPlacements, world.nodes]);

  // Generate hotspots for Pannellum
  const generateHotspots = useCallback(() => {
    return connections.map(({ edge, node }) => ({
      id: node.id,
      pitch: hotspotPlacements[node.id]?.pitch ?? -10,
      yaw: hotspotPlacements[node.id]?.yaw ?? calculateYaw(node),
      type: 'info',
      text: node.label,
      sceneId: node.id,
      targetPitch: 0,
      targetYaw: 0,
      onLongPress: () => beginHotspotPlacement(node.id),
    }));
  }, [connections, hotspotPlacements, calculateYaw, beginHotspotPlacement]);

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
      <TourViewer 
        imageUrl={currentNode.panoramaUrl} 
        hotspots={generateHotspots()}
        onHotspotClick={(hotspot) => navigateTo(hotspot.sceneId)}
        activePlacementHotspotId={activePlacementHotspotId}
        onPlaceHotspot={placeHotspot}
        autoRotate={0}
        initialHfov={120}
      />

      {/* Top overlay */}
      <div className="viewer-overlay">
        <div className="viewer-label">📍 {currentNode.label}</div>
        <button className="viewer-exit-btn" onClick={onExit}>✕ Exit Preview</button>
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
        🖱️ Drag to explore · Click hotspot markers to navigate · Long press a hotspot to move its marker · Scroll to zoom
      </div>

      {placementNotice && (
        <div style={{
          position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.65)', color: 'white', padding: '8px 14px', borderRadius: 999,
          fontSize: '0.75rem', zIndex: 15, border: '1px solid rgba(255,255,255,0.12)',
        }}>
          {placementNotice}
        </div>
      )}
    </div>
  );
}
