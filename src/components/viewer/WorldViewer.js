'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const PanoramaViewer = dynamic(() => import('./PanoramaViewer'), { ssr: false });

export default function WorldViewer({ world, onExit }) {
  const readyNodes = (world.nodes || []).filter(n => n.panoramaUrl && n.status === 'ready');
  const [currentNodeId, setCurrentNodeId] = useState(readyNodes[0]?.id || null);
  const [history, setHistory] = useState(readyNodes[0]?.id ? [readyNodes[0].id] : []);
  const [showNextChoices, setShowNextChoices] = useState(false);
  const [showPrevChoices, setShowPrevChoices] = useState(false);

  const currentNode = world.nodes?.find(n => n.id === currentNodeId);

  // Find connected nodes - treat all edges as bidirectional for navigation
  const getConnectedNodes = useCallback(() => {
    if (!currentNodeId) return { prev: [], next: [] };

    const connectedNodes = [];
    const nodeIds = new Set();

    (world.edges || []).forEach(e => {
      let connectedNodeId = null;
      if (e.source === currentNodeId) {
        connectedNodeId = e.target;
      } else if (e.target === currentNodeId) {
        connectedNodeId = e.source;
      }
      
      if (connectedNodeId && !nodeIds.has(connectedNodeId)) {
        const node = world.nodes?.find(n => n.id === connectedNodeId);
        if (node?.panoramaUrl) {
          connectedNodes.push(node);
          nodeIds.add(connectedNodeId);
        }
      }
    });

    // Put all connections in both prev and next for bidirectional behavior
    return { prev: connectedNodes, next: connectedNodes };
  }, [currentNodeId, world]);

  const { prev, next } = getConnectedNodes();

  const navigateTo = useCallback((nodeId) => {
    setCurrentNodeId(nodeId);
    setShowNextChoices(false);
    setShowPrevChoices(false);
    setHistory(prev => {
      if (prev.length > 1 && prev[prev.length - 2] === nodeId) {
        return prev.slice(0, -1);
      }
      return [...prev, nodeId];
    });
  }, []);

  if (!currentNode?.panoramaUrl) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#07070f', flexDirection: 'column', gap: 16,
      }}>
        <p style={{ color: '#999' }}>No panoramas ready yet. Stitch at least one space first.</p>
        <button onClick={onExit} style={{
          background: '#fff', color: '#000', border: '2px solid #000',
          padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
        }}>← Back to Editor</button>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Panorama (no hotspots - we use fixed buttons now) */}
      <PanoramaViewer
        imageUrl={currentNode?.panoramaUrl}
        hotspots={[]}
        onHotspotClick={() => {}}
      />

      {/* Exit button - top right, solid white */}
      <button
        onClick={onExit}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 30,
          background: '#ffffff', color: '#000000',
          border: '2px solid #000000', borderRadius: 8,
          padding: '8px 18px', cursor: 'pointer',
          fontWeight: 700, fontSize: '0.85rem',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        ✕ Close
      </button>

      {/* Current location label - top left */}
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 30,
        background: '#ffffff', color: '#000000',
        border: '2px solid #000000', borderRadius: 8,
        padding: '8px 16px', fontWeight: 700, fontSize: '0.85rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        📍 {currentNode?.label}
      </div>

      {/* Previous choices popup - bottom left, above the button */}
      {showPrevChoices && prev.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 88, left: 24, zIndex: 31,
          background: '#ffffff', border: '2px solid #000000', borderRadius: 12,
          padding: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', gap: 12,
          maxWidth: 320, minWidth: 220,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Choose Previous</span>
            <button
              onClick={() => setShowPrevChoices(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {prev.map(n => (
              <button
                key={n.id}
                onClick={() => navigateTo(n.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#f5f5f5', border: '1.5px solid #000000', borderRadius: 8,
                  padding: '8px 10px', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.15s ease, transform 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#e8e8e8';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <img
                  src={n.panoramaUrl}
                  alt={n.label}
                  style={{ width: 48, height: 32, borderRadius: 4, objectFit: 'cover', border: '1px solid #ccc', flexShrink: 0 }}
                />
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#000' }}>{n.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Previous node button - bottom left */}
      <div style={{
        position: 'absolute', bottom: 24, left: 24, zIndex: 30,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start',
      }}>
        {prev.length === 1 && (
          <button
            onClick={() => navigateTo(prev[0].id)}
            style={{
              background: '#ffffff', color: '#000000',
              border: '2px solid #000000', borderRadius: 10,
              padding: '12px 22px', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
            </svg>
            Prev: {prev[0].label}
          </button>
        )}
        {prev.length > 1 && (
          <button
            onClick={() => setShowPrevChoices(true)}
            style={{
              background: '#ffffff', color: '#000000',
              border: '2px solid #000000', borderRadius: 10,
              padding: '12px 22px', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
            </svg>
            Explore Previous
          </button>
        )}
      </div>

      {/* Next choices popup - bottom right, above the button */}
      {showNextChoices && next.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 88, right: 24, zIndex: 31,
          background: '#ffffff', border: '2px solid #000000', borderRadius: 12,
          padding: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', gap: 12,
          maxWidth: 320, minWidth: 220,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Choose Destination</span>
            <button
              onClick={() => setShowNextChoices(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {next.map(n => (
              <button
                key={n.id}
                onClick={() => navigateTo(n.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#f5f5f5', border: '1.5px solid #000000', borderRadius: 8,
                  padding: '8px 10px', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.15s ease, transform 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#e8e8e8';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <img
                  src={n.panoramaUrl}
                  alt={n.label}
                  style={{ width: 48, height: 32, borderRadius: 4, objectFit: 'cover', border: '1px solid #ccc', flexShrink: 0 }}
                />
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#000' }}>{n.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Next node button - bottom right */}
      <div style={{
        position: 'absolute', bottom: 24, right: 24, zIndex: 30,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
      }}>
        {next.length === 1 && (
          <button
            onClick={() => navigateTo(next[0].id)}
            style={{
              background: '#ffffff', color: '#000000',
              border: '2px solid #000000', borderRadius: 10,
              padding: '12px 22px', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Next: {next[0].label}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        )}
        {next.length > 1 && (
          <button
            onClick={() => setShowNextChoices(true)}
            style={{
              background: '#ffffff', color: '#000000',
              border: '2px solid #000000', borderRadius: 10,
              padding: '12px 22px', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Explore Choices
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Minimap */}
      <div style={{
        position: 'absolute', bottom: 80, right: 24, zIndex: 25,
        background: '#ffffff', border: '2px solid #000', borderRadius: 8,
        padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <p style={{ fontSize: '0.7rem', color: '#666', marginBottom: 4, fontWeight: 600 }}>World Map</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {[...new Set([...prev, ...next, currentNode])].filter(Boolean).map(n => (
            <button
              key={n.id}
              onClick={() => navigateTo(n.id)}
              style={{
                padding: '3px 8px', fontSize: '0.65rem', borderRadius: 4,
                border: n.id === currentNodeId ? '2px solid #000' : '1px solid #ccc',
                background: n.id === currentNodeId ? '#000' : '#f5f5f5',
                color: n.id === currentNodeId ? '#fff' : '#333',
                cursor: 'pointer', fontWeight: n.id === currentNodeId ? 700 : 400,
              }}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
