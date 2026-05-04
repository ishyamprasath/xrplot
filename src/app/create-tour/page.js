'use client';

// Prevent static pre-rendering — this page uses browser APIs (camera) and Clerk auth
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import dynamicImport from 'next/dynamic';

// Dynamically import client-only components (no SSR)
const TourCapture = dynamicImport(() => import('@/components/capture/TourCapture'), { ssr: false });
const TourViewer  = dynamicImport(() => import('@/components/viewer/TourViewer'),   { ssr: false });

export default function CreateTourPage() {
  const [phase, setPhase]               = useState('idle');   // 'idle' | 'capture' | 'viewing'
  const [panoramaUrl, setPanoramaUrl]   = useState(null);

  const handleTourReady = (url) => {
    setPanoramaUrl(url);
    setPhase('viewing');
  };

  return (
    <div className="ctp-root">
      {/* ── Background glow ───────────────────────────────────────────────── */}
      <div className="ctp-bg-glow" />

      {/* ── Idle / Landing ────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <section className="ctp-hero">
          <div className="ctp-hero-badge">✦ Powered by Vertex AI · Gemini 1.5 Pro</div>
          <h1 className="ctp-hero-title">
            Create a <span className="ctp-gradient-text">360° Virtual Tour</span>
            <br />with your camera
          </h1>
          <p className="ctp-hero-sub">
            Take 24 overlapping photos from a single vantage point. Our AI stitches
            them into a seamless equirectangular panorama you can explore in your browser.
          </p>

          {/* Step cards */}
          <div className="ctp-steps">
            {[
              { num: '01', icon: '📷', title: 'Capture 24 shots',
                desc: 'Follow the spherical guide overlay — 4 elevation rows × 6 directions.' },
              { num: '02', icon: '🤖', title: 'AI Stitching',
                desc: 'Gemini 1.5 Pro blends seams, matches lighting, and outputs a 2:1 equirectangular panorama.' },
              { num: '03', icon: '🌐', title: 'Explore 360°',
                desc: 'Drag, zoom, and navigate your virtual tour with the Pannellum viewer.' },
            ].map(s => (
              <div key={s.num} className="ctp-step-card">
                <span className="ctp-step-num">{s.num}</span>
                <span className="ctp-step-icon">{s.icon}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>

          <button
            className="ctp-start-btn"
            onClick={() => setPhase('capture')}
          >
            <span>🎬</span> Start Capturing
          </button>

          {/* Demo: load existing panorama */}
          <p className="ctp-demo-hint">
            Already have a panorama?{' '}
            <label className="ctp-file-link">
              Load image
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => { setPanoramaUrl(ev.target.result); setPhase('viewing'); };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </p>
        </section>
      )}

      {/* ── Capture phase (full-screen modal) ────────────────────────────── */}
      {phase === 'capture' && (
        <TourCapture
          onTourReady={handleTourReady}
          onClose={() => setPhase('idle')}
        />
      )}

      {/* ── Viewing phase ─────────────────────────────────────────────────── */}
      {phase === 'viewing' && panoramaUrl && (
        <div className="ctp-viewer-page">
          <header className="ctp-viewer-header">
            <button className="ctp-back-btn" onClick={() => setPhase('idle')}>
              ← Back
            </button>
            <h2>Your 360° Virtual Tour</h2>
            <button
              className="ctp-new-btn"
              onClick={() => { setPanoramaUrl(null); setPhase('capture'); }}
            >
              + New Tour
            </button>
          </header>

          <div className="ctp-viewer-wrap">
            <TourViewer
              imageUrl={panoramaUrl}
              autoRotate={-1.5}
              onClose={() => setPhase('idle')}
            />
          </div>

          {/* Download button */}
          <div className="ctp-viewer-footer">
            <a
              href={panoramaUrl}
              download="virtual-tour-panorama.jpg"
              className="ctp-download-btn"
            >
              ⬇ Download Panorama
            </a>
          </div>
        </div>
      )}

      <style jsx>{`
        * { box-sizing: border-box; }

        .ctp-root {
          min-height: 100vh;
          background: #07071a;
          color: #e8e8f8;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative; overflow: hidden;
        }

        /* Background glow */
        .ctp-bg-glow {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background: radial-gradient(ellipse 60% 50% at 50% -10%, rgba(124,58,237,0.25) 0%, transparent 70%);
        }

        /* ── Hero ── */
        .ctp-hero {
          position: relative; z-index: 1;
          max-width: 900px; margin: 0 auto;
          padding: 80px 24px 60px;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 24px;
        }
        .ctp-hero-badge {
          background: rgba(124,58,237,0.2); border: 1px solid rgba(124,58,237,0.4);
          color: #c4b5fd; padding: 6px 16px; border-radius: 999px;
          font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em;
        }
        .ctp-hero-title {
          font-size: clamp(2rem, 5vw, 3.2rem);
          font-weight: 800; line-height: 1.15;
          color: #fff; margin: 0;
        }
        .ctp-gradient-text {
          background: linear-gradient(135deg, #7c3aed 0%, #38bdf8 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .ctp-hero-sub {
          font-size: 1.05rem; color: #8888aa; max-width: 580px;
          line-height: 1.7; margin: 0;
        }

        /* Steps */
        .ctp-steps {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px; width: 100%; margin-top: 8px;
        }
        .ctp-step-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 24px;
          text-align: left; display: flex; flex-direction: column; gap: 8px;
          transition: border-color 0.3s, transform 0.2s;
        }
        .ctp-step-card:hover { border-color: rgba(124,58,237,0.4); transform: translateY(-2px); }
        .ctp-step-num {
          font-size: 0.7rem; font-weight: 700; color: #7c3aed;
          letter-spacing: 0.12em;
        }
        .ctp-step-icon { font-size: 1.8rem; }
        .ctp-step-card h3 { margin: 0; font-size: 0.95rem; color: #fff; }
        .ctp-step-card p  { margin: 0; font-size: 0.82rem; color: #7070a0; line-height: 1.5; }

        /* Start button */
        .ctp-start-btn {
          display: flex; align-items: center; gap: 10px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white; border: none; padding: 16px 40px;
          border-radius: 14px; font-size: 1.05rem; font-weight: 700;
          cursor: pointer; margin-top: 8px;
          box-shadow: 0 0 30px rgba(124,58,237,0.4);
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .ctp-start-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 44px rgba(124,58,237,0.6);
        }
        .ctp-start-btn:active { transform: scale(0.97); }

        .ctp-demo-hint { font-size: 0.82rem; color: #5555aa; margin-top: 8px; }
        .ctp-file-link {
          color: #7c3aed; text-decoration: underline; cursor: pointer;
        }

        /* ── Viewer page ── */
        .ctp-viewer-page {
          position: relative; z-index: 1;
          height: 100vh; display: flex; flex-direction: column;
        }
        .ctp-viewer-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 24px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ctp-viewer-header h2 { margin: 0; font-size: 1rem; color: #ddd; }
        .ctp-back-btn {
          background: transparent; border: 1px solid rgba(255,255,255,0.15);
          color: #aaa; padding: 6px 14px; border-radius: 8px;
          cursor: pointer; font-size: 0.85rem; transition: border-color 0.2s;
        }
        .ctp-back-btn:hover { border-color: rgba(255,255,255,0.35); color: #fff; }

        .ctp-new-btn {
          background: rgba(124,58,237,0.2); border: 1px solid rgba(124,58,237,0.4);
          color: #c4b5fd; padding: 6px 14px; border-radius: 8px;
          cursor: pointer; font-size: 0.85rem; transition: background 0.2s;
        }
        .ctp-new-btn:hover { background: rgba(124,58,237,0.35); }

        .ctp-viewer-wrap {
          flex: 1; padding: 0;
        }

        .ctp-viewer-footer {
          padding: 12px 24px;
          display: flex; justify-content: center;
          background: rgba(255,255,255,0.02);
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .ctp-download-btn {
          background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3);
          color: #38bdf8; padding: 8px 24px; border-radius: 10px;
          text-decoration: none; font-size: 0.85rem; font-weight: 600;
          transition: background 0.2s;
        }
        .ctp-download-btn:hover { background: rgba(56,189,248,0.25); }

        @media (max-width: 600px) {
          .ctp-hero { padding: 48px 16px; }
          .ctp-steps { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
