'use client';

import dynamic from 'next/dynamic';
import { Box, X, MousePointer2 } from 'lucide-react';

const PanoramaViewer = dynamic(() => import('./PanoramaViewer'), { ssr: false });

export default function ViewerModal({ panoramaUrl, label, onClose }) {
  return (
    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div className="viewer-overlay">
          <div className="viewer-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box size={16} /> {label || 'Space Preview'}
          </div>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '8px', color: '#1a1a2e', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <X size={14} /> Close
          </button>
        </div>
        <PanoramaViewer imageUrl={panoramaUrl} />
        <div style={{
          position: 'absolute', bottom: 'var(--space-md)', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
          padding: '8px 20px', borderRadius: 'var(--radius-full)',
          fontSize: '0.8rem', color: 'var(--text-primary)', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)', border: '1px solid var(--border-medium)'
        }}>
          <MousePointer2 size={14} style={{ color: 'var(--violet-light)'}} /> <span>Drag to look around · Scroll to zoom</span>
        </div>
      </div>
    </div>
  );
}
