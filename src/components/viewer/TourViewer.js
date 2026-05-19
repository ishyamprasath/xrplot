'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Dynamic Pannellum loader ──────────────────────────────────────────────────
// The npm `pannellum` package is a CommonJS build that breaks with
// Next.js SSR. We load the CDN builds dynamically on the client instead.
const PANNELLUM_CSS =
  'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
const PANNELLUM_JS  =
  'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';

function loadAsset(tag, attrs) {
  return new Promise((resolve, reject) => {
    // Don't double-load
    const existing = document.querySelector(
      tag === 'link' ? `link[href="${attrs.href}"]` : `script[src="${attrs.src}"]`
    );
    if (existing) { resolve(); return; }

    const el = document.createElement(tag);
    Object.assign(el, attrs);
    el.onload  = resolve;
    el.onerror = reject;
    if (tag === 'link') document.head.appendChild(el);
    else                document.body.appendChild(el);
  });
}

async function loadPannellum() {
  await loadAsset('link', { rel: 'stylesheet', href: PANNELLUM_CSS });
  await loadAsset('script', { src: PANNELLUM_JS, async: true });
  // Wait until the global is available
  let retries = 20;
  while (!window.pannellum && retries-- > 0) {
    await new Promise(r => setTimeout(r, 100));
  }
  if (!window.pannellum) throw new Error('Pannellum failed to load.');
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * TourViewer — renders a 360° equirectangular panorama using Pannellum.
 *
 * Props:
 *  - imageUrl   {string}   Base64 data-URL or remote URL of the panorama.
 *  - hotspots   {array}    Optional Pannellum hotspot definitions.
 *  - onHotspotClick {fn}   Called with the hotspot object when clicked.
 *  - autoRotate {number}   Deg/sec auto-rotation speed (default -1.5, 0 = off).
 *  - onClose    {fn}       If provided, shows a close button.
 */
export default function TourViewer({
  imageUrl,
  hotspots = [],
  onHotspotClick,
  autoRotate = -1.5,
  initialHfov = 120,
  onClose,
  activePlacementHotspotId = null,
  onPlaceHotspot,
}) {
  const containerRef   = useRef(null);
  const viewerRef      = useRef(null);
  const hotspotLongPressRef = useRef(new Map());
  const [ready, setReady]       = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const attachHotspotInteractions = useCallback((hotSpotDiv, args = {}) => {
    if (!hotSpotDiv) return;

    const { hotspotId, label, onLongPress } = args;
    let pressTimer = null;
    let longPressTriggered = false;

    hotSpotDiv.classList.add('tv-hotspot-root');
    hotSpotDiv.style.width = 'auto';
    hotSpotDiv.style.height = 'auto';
    hotSpotDiv.style.minWidth = '0';
    hotSpotDiv.style.minHeight = '0';
    hotSpotDiv.style.padding = '0';
    hotSpotDiv.style.margin = '0';
    hotSpotDiv.style.border = '0';
    hotSpotDiv.style.background = 'transparent';
    hotSpotDiv.style.boxShadow = 'none';
    hotSpotDiv.style.overflow = 'visible';
    hotSpotDiv.style.display = 'flex';
    hotSpotDiv.style.flexDirection = 'column';
    hotSpotDiv.style.alignItems = 'center';
    hotSpotDiv.style.justifyContent = 'center';
    hotSpotDiv.style.gap = '6px';
    hotSpotDiv.style.pointerEvents = 'auto';
    hotSpotDiv.style.transform = 'translate(-50%, -100%)';
    hotSpotDiv.innerHTML = '';

    const marker = document.createElement('div');
    marker.className = 'tv-hotspot-marker';
    marker.textContent = 'i';

    const text = document.createElement('div');
    text.className = 'tv-hotspot-label';
    text.textContent = label || '';

    hotSpotDiv.appendChild(marker);
    hotSpotDiv.appendChild(text);

    const clearTimer = () => {
      if (pressTimer) {
        window.clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    const triggerLongPress = () => {
      longPressTriggered = true;
      if (hotspotId) {
        hotspotLongPressRef.current.set(hotspotId, true);
      }
      onLongPress?.();
      window.setTimeout(() => {
        if (hotspotId) {
          hotspotLongPressRef.current.delete(hotspotId);
        }
      }, 0);
    };

    const handlePointerDown = (event) => {
      event.stopPropagation();
      clearTimer();
      pressTimer = window.setTimeout(triggerLongPress, 500);
    };

    const handlePointerUp = () => {
      clearTimer();
    };

    const handlePointerLeave = () => {
      clearTimer();
    };

    hotSpotDiv.style.cursor = onLongPress ? 'grab' : 'pointer';
    hotSpotDiv.style.touchAction = 'manipulation';
    hotSpotDiv.addEventListener('pointerdown', handlePointerDown);
    hotSpotDiv.addEventListener('pointerup', handlePointerUp);
    hotSpotDiv.addEventListener('pointerleave', handlePointerLeave);
    hotSpotDiv.addEventListener('pointercancel', handlePointerLeave);
    hotSpotDiv.addEventListener('contextmenu', (event) => event.preventDefault());

    hotSpotDiv.addEventListener('click', (event) => {
      if (!longPressTriggered) return;
      event.preventDefault();
      event.stopPropagation();
      longPressTriggered = false;
    });
  }, []);

  // ── Init / re-init when imageUrl changes ─────────────────────────────────
  useEffect(() => {
    if (!imageUrl) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setReady(false);

      try {
        await loadPannellum();
        if (cancelled || !containerRef.current) return;

        // Destroy previous instance
        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }

        viewerRef.current = window.pannellum.viewer(containerRef.current, {
          type:               'equirectangular',
          panorama:           imageUrl,
          autoLoad:           true,
          autoRotate,
          autoRotateInactivityDelay: 2000,
          compass:            true,
          northOffset:        0,
          hfov:               initialHfov,
          minHfov:           40,
          maxHfov:           initialHfov,
          pitch:              0,
          yaw:                0,
          minPitch:           -85,
          maxPitch:           85,
          showFullscreenCtrl: false,   // we handle it ourselves
          showZoomCtrl:       true,
          keyboardZoom:       true,
          mouseZoom:          true,
          draggable:          true,
          disableKeyboardCtrl: false,
          sceneFadeIn:        1000,
          strings: { loadButtonLabel: 'Loading…' },
        });

        viewerRef.current.on('load', () => {
          if (!cancelled) {
            try {
              viewerRef.current.setHfov?.(initialHfov, true);
            } catch (err) {}
            setLoading(false);
            setReady(true);
          }
        });

        viewerRef.current.on('error', err => {
          console.error('[TourViewer] Pannellum error:', err);
          if (!cancelled) { setError('Failed to load the panorama.'); setLoading(false); }
        });

      } catch (err) {
        console.error('[TourViewer] Init error:', err);
        if (!cancelled) { setError(err.message); setLoading(false); }
      }
    })();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, autoRotate, initialHfov]);

  useEffect(() => {
    if (!viewerRef.current || !ready) return;

    // Remove old hotspots using proper Pannellum API
    hotspots.forEach(h => {
      try { viewerRef.current.removeHotSpot(h.id); } catch (e) {}
    });

    // Add new hotspots using their stable ids when available
    hotspots.forEach((h, i) => {
      const id = h.id || `hs_${Date.now()}_${i}`;
      try {
        viewerRef.current.addHotSpot({
          id,
          pitch: h.pitch ?? 0,
          yaw:   h.yaw   ?? 0,
          type:  h.type  ?? 'info',
          cssClass: 'tv-hotspot-custom',
          ...(h.url      ? { URL: h.url }               : {}),
          ...(h.sceneId  ? { sceneId: h.sceneId }       : {}),
          clickHandlerFunc: () => {
            if (hotspotLongPressRef.current.get(id)) {
              hotspotLongPressRef.current.delete(id);
              return;
            }
            onHotspotClick?.(h);
          },
          createTooltipFunc: attachHotspotInteractions,
          createTooltipArgs: {
            hotspotId: id,
            label: h.text,
            onLongPress: h.onLongPress,
          },
        });
      } catch (err) {
        console.warn('Failed to add hotspot:', err);
      }
    });
  }, [hotspots, ready, onHotspotClick, attachHotspotInteractions]);

  useEffect(() => {
    if (!viewerRef.current || !ready || !activePlacementHotspotId || !onPlaceHotspot) return;

    const container = viewerRef.current.getContainer?.();
    if (!container) return;

    const handleClick = (event) => {
      if (!viewerRef.current?.mouseEventToCoords) return;
      const coords = viewerRef.current.mouseEventToCoords(event);
      if (!Array.isArray(coords) || coords.length < 2) return;

      const [pitch, yaw] = coords;
      if (typeof pitch !== 'number' || typeof yaw !== 'number') return;

      onPlaceHotspot(activePlacementHotspotId, pitch, yaw);
    };

    container.style.cursor = 'crosshair';
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('click', handleClick);
      container.style.cursor = '';
    };
  }, [activePlacementHotspotId, onPlaceHotspot, ready]);

  // ── Fullscreen toggle ────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (!imageUrl) {
    return (
      <div className="tv-empty">
        <span>🌐</span>
        <p>No panorama loaded yet.</p>
      </div>
    );
  }

  return (
    <div className="tv-root">
      {/* Pannellum mounts here */}
      <div ref={containerRef} className="tv-container" />

      {/* Loading overlay */}
      {loading && !error && (
        <div className="tv-overlay tv-loading">
          <div className="tv-spinner-wrap">
            <div className="tv-spinner" />
            <p>Loading panorama…</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="tv-overlay tv-error">
          <div>
            <span className="tv-error-icon">⚠</span>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Custom controls (shown when ready) */}
      {ready && (
        <div className="tv-controls">
          <button className="tv-ctrl-btn" onClick={toggleFullscreen} title="Toggle fullscreen">
            {isFullscreen ? '⤡' : '⤢'}
          </button>
          {onClose && (
            <button className="tv-ctrl-btn tv-ctrl-close" onClick={onClose} title="Close viewer">
              ✕
            </button>
          )}
        </div>
      )}

      {/* Info badge */}
      {ready && (
        <div className="tv-info-badge">
          🌐 360° — Drag to explore · Scroll to zoom
        </div>
      )}

      {ready && activePlacementHotspotId && (
        <div className="tv-placement-badge">
          Tap the panorama to place the selected hotspot.
        </div>
      )}

      <style jsx>{`
        .tv-root {
          position: relative; width: 100%; height: 100%;
          border-radius: 16px; overflow: hidden;
          background: #07071a;
        }
        .tv-placement-badge {
          position: absolute; left: 50%; top: 56px; transform: translateX(-50%);
          z-index: 12; padding: 8px 14px; border-radius: 999px;
          background: rgba(6,182,212,0.16); backdrop-filter: blur(10px);
          color: rgba(255,255,255,0.92); font-size: 0.75rem;
          border: 1px solid rgba(103,232,249,0.28);
        }
        :global(.tv-hotspot-root) {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          pointer-events: auto;
        }
        :global(.tv-hotspot-custom) {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          width: auto !important;
          height: auto !important;
          overflow: visible !important;
        }
        :global(.tv-hotspot-marker) {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(232,232,232,0.94));
          border: 2px solid rgba(0,0,0,0.78);
          box-shadow: 0 8px 18px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #111827;
          font-size: 16px;
          font-weight: 900;
          line-height: 1;
          font-style: normal;
          font-family: inherit;
        }
        :global(.tv-hotspot-label) {
          max-width: 180px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(7,7,26,0.72);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.96);
          font-size: 0.72rem;
          line-height: 1.15;
          text-align: center;
          text-shadow: 0 1px 2px rgba(0,0,0,0.55);
          white-space: normal;
        }
        .tv-container { width: 100%; height: 100%; }

        /* Overlays */
        .tv-overlay {
          position: absolute; inset: 0; z-index: 10;
          display: flex; align-items: center; justify-content: center;
          background: rgba(7,7,26,0.85);
          backdrop-filter: blur(6px);
        }
        .tv-loading p, .tv-error p {
          color: #9090c0; font-size: 0.9rem; margin-top: 12px; text-align: center;
        }
        .tv-spinner-wrap { display: flex; flex-direction: column; align-items: center; }
        .tv-spinner {
          width: 44px; height: 44px;
          border: 4px solid rgba(124,58,237,0.25);
          border-top-color: #7c3aed;
          border-radius: 50%;
          animation: tvSpin 0.9s linear infinite;
        }
        @keyframes tvSpin { to { transform: rotate(360deg); } }

        .tv-error { flex-direction: column; gap: 8px; text-align: center; }
        .tv-error-icon { font-size: 2.5rem; }

        /* Controls */
        .tv-controls {
          position: absolute; top: 14px; right: 14px;
          display: flex; gap: 8px; z-index: 20;
        }
        .tv-ctrl-btn {
          width: 36px; height: 36px;
          background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px; color: #ddd; font-size: 1.1rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .tv-ctrl-btn:hover { background: rgba(124,58,237,0.5); }
        .tv-ctrl-close:hover { background: rgba(220,50,50,0.5); }

        /* Info badge */
        .tv-info-badge {
          position: absolute; bottom: 14px; left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          color: #aaa; font-size: 0.72rem; padding: 4px 14px;
          border-radius: 999px; pointer-events: none;
          animation: fadeUp 0.6s ease forwards;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
        }

        /* Empty state */
        .tv-empty {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          color: #5555aa; font-size: 0.9rem; gap: 10px;
        }
        .tv-empty span { font-size: 3rem; }
      `}</style>
    </div>
  );
}
