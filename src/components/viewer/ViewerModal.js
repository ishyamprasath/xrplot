'use client';

import dynamic from 'next/dynamic';

const TourViewer = dynamic(() => import('./TourViewer'), { ssr: false });

export default function ViewerModal({ panoramaUrl, label, onClose }) {
  return (
    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div className="viewer-overlay">
          <div className="viewer-label">🏠 {label || 'Space Preview'}</div>
          <button className="viewer-exit-btn" onClick={onClose}>✕ Close</button>
        </div>
        <TourViewer imageUrl={panoramaUrl} autoRotate={0} />
        <div style={{
          position: 'absolute', bottom: 'var(--space-md)', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
          padding: '6px 16px', borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem', color: 'var(--text-muted)', zIndex: 10,
        }}>
          🖱️ Drag to look around · Scroll to zoom · Use controls for fullscreen
        </div>
      </div>
    </div>
  );
}
