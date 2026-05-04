'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Shot definition ──────────────────────────────────────────────────────────
// 24 shots arranged in 4 rows × 6 columns covering the full sphere,
// plus nadir (floor) and zenith (ceiling) shots.
const SHOTS = [
  // Row 0 — pitch +60° (upper)
  { id: 0,  row: 0, col: 0, pitch:  60, yaw:   0, label: 'Upper N'  },
  { id: 1,  row: 0, col: 1, pitch:  60, yaw:  60, label: 'Upper NE' },
  { id: 2,  row: 0, col: 2, pitch:  60, yaw: 120, label: 'Upper E'  },
  { id: 3,  row: 0, col: 3, pitch:  60, yaw: 180, label: 'Upper S'  },
  { id: 4,  row: 0, col: 4, pitch:  60, yaw: 240, label: 'Upper SW' },
  { id: 5,  row: 0, col: 5, pitch:  60, yaw: 300, label: 'Upper NW' },
  // Row 1 — pitch +20° (mid-upper)
  { id: 6,  row: 1, col: 0, pitch:  20, yaw:   0, label: 'Mid-Up N'  },
  { id: 7,  row: 1, col: 1, pitch:  20, yaw:  60, label: 'Mid-Up NE' },
  { id: 8,  row: 1, col: 2, pitch:  20, yaw: 120, label: 'Mid-Up E'  },
  { id: 9,  row: 1, col: 3, pitch:  20, yaw: 180, label: 'Mid-Up S'  },
  { id: 10, row: 1, col: 4, pitch:  20, yaw: 240, label: 'Mid-Up SW' },
  { id: 11, row: 1, col: 5, pitch:  20, yaw: 300, label: 'Mid-Up NW' },
  // Row 2 — pitch -20° (mid-lower)
  { id: 12, row: 2, col: 0, pitch: -20, yaw:   0, label: 'Mid-Dn N'  },
  { id: 13, row: 2, col: 1, pitch: -20, yaw:  60, label: 'Mid-Dn NE' },
  { id: 14, row: 2, col: 2, pitch: -20, yaw: 120, label: 'Mid-Dn E'  },
  { id: 15, row: 2, col: 3, pitch: -20, yaw: 180, label: 'Mid-Dn S'  },
  { id: 16, row: 2, col: 4, pitch: -20, yaw: 240, label: 'Mid-Dn SW' },
  { id: 17, row: 2, col: 5, pitch: -20, yaw: 300, label: 'Mid-Dn NW' },
  // Row 3 — pitch -60° (lower)
  { id: 18, row: 3, col: 0, pitch: -60, yaw:   0, label: 'Lower N'  },
  { id: 19, row: 3, col: 1, pitch: -60, yaw:  60, label: 'Lower NE' },
  { id: 20, row: 3, col: 2, pitch: -60, yaw: 120, label: 'Lower E'  },
  { id: 21, row: 3, col: 3, pitch: -60, yaw: 180, label: 'Lower S'  },
  { id: 22, row: 3, col: 4, pitch: -60, yaw: 240, label: 'Lower SW' },
  { id: 23, row: 3, col: 5, pitch: -60, yaw: 300, label: 'Lower NW' },
];

const TOTAL = SHOTS.length; // 24

export default function TourCapture({ onTourReady, onClose }) {
  // Captured images: { [shotId]: base64String }
  const [captured, setCaptured]         = useState({});
  const [activeShot, setActiveShot]     = useState(0);
  const [cameraOn, setCameraOn]         = useState(false);
  const [cameraError, setCameraError]   = useState(null);
  const [isStitching, setIsStitching]   = useState(false);
  const [stitchError, setStitchError]   = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [flashActive, setFlashActive]   = useState(false);

  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  const captureCount = Object.keys(captured).length;
  const currentShot  = SHOTS[activeShot];
  const allDone      = captureCount === TOTAL;

  // ── Camera helpers ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1920 }, // 1080p is plenty for stitching and faster to upload
          height: { ideal: 1080 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraOn(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Cannot access camera. Check browser permissions and try again.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Capture a single frame ──────────────────────────────────────────────────
  const captureFrame = useCallback(() => {
    if (!videoRef.current) return;

    const video  = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Resize for faster processing and upload (1280x720 is usually enough for LMM understanding)
    const MAX_W = 1280;
    const scale = Math.min(1, MAX_W / video.videoWidth);
    canvas.width  = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

    // Flash animation
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    setCaptured(prev => ({ ...prev, [currentShot.id]: base64 }));

    // Advance to the next uncaptured shot
    const next = SHOTS.find(s => s.id !== currentShot.id && !captured[s.id]);
    if (next) setActiveShot(next.id);
  }, [currentShot, captured]);

  // ── Retake a shot ───────────────────────────────────────────────────────────
  const retakeShot = useCallback((shotId) => {
    setCaptured(prev => {
      const updated = { ...prev };
      delete updated[shotId];
      return updated;
    });
    setActiveShot(shotId);
    if (!cameraOn) startCamera();
  }, [cameraOn, startCamera]);

  // ── Stitch via API ──────────────────────────────────────────────────────────
  const handleStitch = useCallback(async () => {
    setIsStitching(true);
    setStitchError(null);
    setUploadProgress({ current: 0, total: TOTAL });
    stopCamera();

    try {
      const imageUrls = [];
      const orderedShotIds = SHOTS.map(s => s.id);

      // 1. Batch upload to Cloudinary (sequentially to avoid overwhelming connection)
      for (let i = 0; i < orderedShotIds.length; i++) {
        const shotId = orderedShotIds[i];
        const base64 = captured[shotId];
        
        if (!base64) continue;

        setUploadProgress({ current: i + 1, total: TOTAL });

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || `Upload failed for shot ${i+1}`);
        
        imageUrls.push(uploadData.url);
      }

      // 2. Trigger Fusion API with Cloudinary URLs
      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls }),
      });

      const data = await res.json();

      if (!res.ok || !data.panoramaUrl) {
        throw new Error(data.error || 'Stitching failed — no panorama URL returned.');
      }

      onTourReady?.(data.panoramaUrl);
    } catch (err) {
      console.error('[TourCapture] Stitch error:', err);
      setStitchError(err.message);
    } finally {
      setIsStitching(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  }, [captured, onTourReady, stopCamera]);

  // ── Grid row labels ─────────────────────────────────────────────────────────
  const rowLabels = ['Upper (+60°)', 'Mid-Upper (+20°)', 'Mid-Lower (−20°)', 'Lower (−60°)'];

  return (
    <div className="tour-capture-overlay">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="tc-header">
        <div className="tc-header-left">
          <span className="tc-icon">🌐</span>
          <div>
            <h2>360° Tour Capture</h2>
            <p>{captureCount} / {TOTAL} shots captured</p>
          </div>
        </div>
        <button className="tc-close-btn" onClick={onClose} aria-label="Close">✕</button>
      </header>

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      <div className="tc-progress-bar-track">
        <div
          className="tc-progress-bar-fill"
          style={{ width: `${(captureCount / TOTAL) * 100}%` }}
        />
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="tc-body">

        {/* ── Camera panel ─────────────────────────────────────────────────── */}
        <div className="tc-camera-panel">
          {!cameraOn ? (
            <div className="tc-camera-placeholder">
              <div className="tc-placeholder-icon">📷</div>
              <p>{cameraError ?? `Position yourself at the centre of the scene.\nKeep your camera perfectly still.`}</p>
              <button className="tc-btn-primary" onClick={startCamera}>Start Camera</button>
            </div>
          ) : (
            <div className="tc-viewfinder-wrap">
              {/* Flash */}
              {flashActive && <div className="tc-flash" />}

              {/* Live video */}
              <video ref={videoRef} autoPlay playsInline muted className="tc-video" />

              {/* Spherical guide overlay */}
              <div className="tc-guide-overlay">
                <div className="tc-guide-crosshair" />
                <div className="tc-guide-ring tc-guide-ring-h" />
                <div className="tc-guide-ring tc-guide-ring-v" />
                <div className="tc-guide-label">
                  <span className="tc-shot-badge">
                    #{activeShot + 1} — {currentShot.label}
                  </span>
                  <span className="tc-shot-sub">
                    Pitch {currentShot.pitch > 0 ? '+' : ''}{currentShot.pitch}° · Yaw {currentShot.yaw}°
                  </span>
                </div>
              </div>

              {/* Capture button */}
              <button
                className="tc-capture-btn"
                onClick={captureFrame}
                aria-label="Capture photo"
              >
                <span className="tc-capture-inner" />
              </button>

              {/* Stop camera */}
              <button className="tc-stop-btn" onClick={stopCamera}>■ Stop</button>
            </div>
          )}
        </div>

        {/* ── Shot grid ────────────────────────────────────────────────────── */}
        <div className="tc-grid-panel">
          <h3 className="tc-grid-title">Shot Map</h3>

          {[0, 1, 2, 3].map(rowIdx => {
            const rowShots = SHOTS.filter(s => s.row === rowIdx);
            return (
              <div key={rowIdx} className="tc-grid-row">
                <span className="tc-row-label">{rowLabels[rowIdx]}</span>
                <div className="tc-row-shots">
                  {rowShots.map(shot => {
                    const done    = !!captured[shot.id];
                    const isActive = shot.id === activeShot;
                    return (
                      <button
                        key={shot.id}
                        className={`tc-shot-cell ${done ? 'done' : ''} ${isActive ? 'active' : ''}`}
                        onClick={() => { setActiveShot(shot.id); if (!cameraOn) startCamera(); }}
                        title={shot.label}
                      >
                        {done ? (
                          <img
                            src={`data:image/jpeg;base64,${captured[shot.id]}`}
                            alt={shot.label}
                            className="tc-shot-thumb"
                          />
                        ) : (
                          <span className="tc-shot-num">{shot.id + 1}</span>
                        )}
                        {done && (
                          <button
                            className="tc-retake-btn"
                            onClick={e => { e.stopPropagation(); retakeShot(shot.id); }}
                            title="Retake"
                          >↺</button>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="tc-footer">
        {stitchError && (
          <div className="tc-error-banner">⚠ {stitchError}</div>
        )}

        {isStitching ? (
          <div className="tc-stitching-state">
            <div className="tc-spinner" />
            <span>
              {uploadProgress.total > 0 && uploadProgress.current < uploadProgress.total
                ? `Uploading shot ${uploadProgress.current} of ${uploadProgress.total}...`
                : `Fusing ${uploadProgress.total} images with Gemini 3.1 Flash...`}
            </span>
          </div>
        ) : (
          <div className="tc-footer-actions">
            <button className="tc-btn-ghost" onClick={onClose} disabled={isStitching}>
              Cancel
            </button>
            <button
              className={`tc-btn-primary tc-stitch-btn ${allDone ? 'glow' : ''}`}
              onClick={handleStitch}
              disabled={captureCount < 6 || isStitching}
              title={captureCount < 6 ? 'Capture at least 6 shots to stitch' : ''}
            >
              {allDone
                ? '✨ Stitch Virtual Tour (24/24)'
                : captureCount >= 6
                ? `Stitch with ${captureCount} shots`
                : `Capture at least 6 shots (${captureCount}/6)`}
            </button>
          </div>
        )}
      </footer>

      {/* ── Inline styles ──────────────────────────────────────────────────── */}
      <style jsx>{`
        /* ── Overlay ── */
        .tour-capture-overlay {
          position: fixed; inset: 0; z-index: 9000;
          background: #07071a;
          display: flex; flex-direction: column;
          font-family: 'Inter', system-ui, sans-serif;
          color: #e8e8f8;
        }

        /* ── Header ── */
        .tc-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 24px;
          background: rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
        }
        .tc-header-left { display: flex; align-items: center; gap: 14px; }
        .tc-icon { font-size: 28px; }
        .tc-header-left h2 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #fff; }
        .tc-header-left p  { margin: 2px 0 0; font-size: 0.8rem; color: #9090c0; }
        .tc-close-btn {
          background: rgba(255,255,255,0.08); border: none; color: #ccc;
          width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
          font-size: 1rem; transition: background 0.2s;
        }
        .tc-close-btn:hover { background: rgba(255,100,100,0.3); }

        /* ── Progress bar ── */
        .tc-progress-bar-track {
          height: 3px; background: rgba(255,255,255,0.07);
        }
        .tc-progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #38bdf8);
          transition: width 0.4s ease;
        }

        /* ── Body ── */
        .tc-body {
          flex: 1; overflow: auto;
          display: flex; gap: 24px; padding: 20px 24px;
        }

        /* ── Camera panel ── */
        .tc-camera-panel {
          flex: 1; min-width: 0;
          display: flex; align-items: stretch;
        }
        .tc-camera-placeholder {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 16px; text-align: center;
          border: 2px dashed rgba(255,255,255,0.12);
          border-radius: 16px;
          padding: 40px;
        }
        .tc-placeholder-icon { font-size: 52px; }
        .tc-camera-placeholder p {
          color: #8888aa; font-size: 0.9rem; line-height: 1.5;
          white-space: pre-line; max-width: 320px;
        }

        .tc-viewfinder-wrap {
          flex: 1; position: relative;
          border-radius: 16px; overflow: hidden;
          background: #000;
        }
        .tc-video {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
        }

        /* Flash */
        .tc-flash {
          position: absolute; inset: 0;
          background: white; opacity: 0.7;
          animation: flashOut 0.2s forwards;
          pointer-events: none; z-index: 20;
        }
        @keyframes flashOut { to { opacity: 0; } }

        /* Spherical guide */
        .tc-guide-overlay {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
        }
        .tc-guide-crosshair {
          position: absolute;
          width: 40px; height: 40px;
          border: 2px solid rgba(124,58,237,0.9);
          border-radius: 50%;
          box-shadow: 0 0 16px rgba(124,58,237,0.6);
        }
        .tc-guide-crosshair::before, .tc-guide-crosshair::after {
          content: '';
          position: absolute;
          background: rgba(124,58,237,0.7);
        }
        .tc-guide-crosshair::before {
          width: 1px; height: 20px;
          top: -24px; left: 50%; transform: translateX(-50%);
        }
        .tc-guide-crosshair::after {
          height: 1px; width: 20px;
          left: -24px; top: 50%; transform: translateY(-50%);
        }

        .tc-guide-ring {
          position: absolute;
          border: 1px solid rgba(56,189,248,0.3);
          border-radius: 50%;
        }
        .tc-guide-ring-h { width: 80%; height: 20%; }
        .tc-guide-ring-v { width: 20%; height: 80%; }

        .tc-guide-label {
          position: absolute; bottom: 80px; left: 50%;
          transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .tc-shot-badge {
          background: rgba(124,58,237,0.85); color: white;
          padding: 4px 14px; border-radius: 999px;
          font-size: 0.8rem; font-weight: 700;
          backdrop-filter: blur(8px);
        }
        .tc-shot-sub {
          background: rgba(0,0,0,0.6); color: #ccc;
          padding: 2px 10px; border-radius: 999px;
          font-size: 0.7rem;
        }

        /* Capture button */
        .tc-capture-btn {
          position: absolute; bottom: 20px; left: 50%;
          transform: translateX(-50%);
          width: 64px; height: 64px;
          background: rgba(255,255,255,0.15);
          border: 3px solid white;
          border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.1s, background 0.2s;
          z-index: 10;
        }
        .tc-capture-btn:hover { background: rgba(255,255,255,0.25); }
        .tc-capture-btn:active { transform: translateX(-50%) scale(0.92); }
        .tc-capture-inner {
          width: 48px; height: 48px;
          background: white; border-radius: 50%;
          transition: transform 0.1s;
        }
        .tc-capture-btn:active .tc-capture-inner { transform: scale(0.9); }

        .tc-stop-btn {
          position: absolute; top: 12px; right: 12px;
          background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2);
          color: #ccc; padding: 4px 12px; border-radius: 8px;
          cursor: pointer; font-size: 0.75rem;
          transition: background 0.2s;
        }
        .tc-stop-btn:hover { background: rgba(220,50,50,0.4); }

        /* ── Shot grid ── */
        .tc-grid-panel {
          width: 340px; flex-shrink: 0;
          display: flex; flex-direction: column; gap: 12px;
          overflow-y: auto;
        }
        .tc-grid-title {
          margin: 0; font-size: 0.85rem;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: #9090c0;
        }
        .tc-grid-row {
          display: flex; flex-direction: column; gap: 6px;
        }
        .tc-row-label {
          font-size: 0.7rem; color: #6666aa; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .tc-row-shots {
          display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px;
        }
        .tc-shot-cell {
          position: relative; aspect-ratio: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px; overflow: hidden;
          cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          font-size: 0.65rem; color: #6666aa;
          transition: border-color 0.2s, box-shadow 0.2s;
          padding: 0;
        }
        .tc-shot-cell:hover { border-color: rgba(124,58,237,0.5); }
        .tc-shot-cell.active {
          border-color: #7c3aed;
          box-shadow: 0 0 0 2px rgba(124,58,237,0.4);
        }
        .tc-shot-cell.done { border-color: rgba(56,189,248,0.5); }
        .tc-shot-thumb {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .tc-shot-num { font-size: 0.6rem; font-weight: 700; color: #7070a0; }
        .tc-retake-btn {
          position: absolute; top: 1px; right: 1px;
          width: 16px; height: 16px;
          background: rgba(0,0,0,0.7); border: none;
          color: #ccc; font-size: 0.55rem;
          border-radius: 3px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          padding: 0;
        }

        /* ── Footer ── */
        .tc-footer {
          padding: 16px 24px;
          background: rgba(255,255,255,0.03);
          border-top: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column; gap: 10px;
        }
        .tc-footer-actions {
          display: flex; justify-content: flex-end; gap: 12px; align-items: center;
        }
        .tc-error-banner {
          background: rgba(220,50,50,0.2); border: 1px solid rgba(220,50,50,0.4);
          color: #ff8888; padding: 8px 16px; border-radius: 8px;
          font-size: 0.82rem;
        }

        /* Buttons */
        .tc-btn-primary {
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          color: white; border: none; padding: 10px 22px;
          border-radius: 10px; cursor: pointer;
          font-size: 0.88rem; font-weight: 600;
          transition: opacity 0.2s, box-shadow 0.2s, transform 0.1s;
        }
        .tc-btn-primary:hover:not(:disabled) { opacity: 0.9; }
        .tc-btn-primary:active:not(:disabled) { transform: scale(0.97); }
        .tc-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .tc-btn-primary.glow {
          box-shadow: 0 0 20px rgba(124,58,237,0.6);
          animation: glowPulse 2s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.5); }
          50%       { box-shadow: 0 0 36px rgba(56,189,248,0.7); }
        }
        .tc-stitch-btn { padding: 12px 28px; font-size: 0.95rem; }

        .tc-btn-ghost {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.15);
          color: #9090c0; padding: 10px 18px;
          border-radius: 10px; cursor: pointer;
          font-size: 0.88rem; transition: border-color 0.2s, color 0.2s;
        }
        .tc-btn-ghost:hover { border-color: rgba(255,255,255,0.3); color: #ccc; }

        /* Stitching spinner */
        .tc-stitching-state {
          display: flex; align-items: center; justify-content: center;
          gap: 14px; color: #9090c0; font-size: 0.88rem;
        }
        .tc-spinner {
          width: 22px; height: 22px;
          border: 3px solid rgba(124,58,237,0.3);
          border-top-color: #7c3aed;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Scrollbar */
        .tc-grid-panel::-webkit-scrollbar { width: 4px; }
        .tc-grid-panel::-webkit-scrollbar-track { background: transparent; }
        .tc-grid-panel::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 2px; }

        @media (max-width: 768px) {
          .tc-body { flex-direction: column; }
          .tc-grid-panel { width: 100%; }
          .tc-row-shots { grid-template-columns: repeat(6, 1fr); }
        }
      `}</style>
    </div>
  );
}
