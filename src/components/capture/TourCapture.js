'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';

// ─── Shot definition ──────────────────────────────────────────────────────────
// 24 shots covering the full sphere in 4 rows × 6 columns
const SHOTS = [
  // Row 0 — pitch +60° (upper ring)
  { id: 0,  row: 0, pitch:  60, yaw:   0, label: 'Upper North',     dir: 'Point straight up, face North' },
  { id: 1,  row: 0, pitch:  60, yaw:  60, label: 'Upper North-East', dir: 'Point straight up, face North-East' },
  { id: 2,  row: 0, pitch:  60, yaw: 120, label: 'Upper East',      dir: 'Point straight up, face East' },
  { id: 3,  row: 0, pitch:  60, yaw: 180, label: 'Upper South',     dir: 'Point straight up, face South' },
  { id: 4,  row: 0, pitch:  60, yaw: 240, label: 'Upper South-West', dir: 'Point straight up, face South-West' },
  { id: 5,  row: 0, pitch:  60, yaw: 300, label: 'Upper North-West', dir: 'Point straight up, face North-West' },
  // Row 1 — pitch +20° (mid-upper ring)
  { id: 6,  row: 1, pitch:  20, yaw:   0, label: 'Mid-Up North',     dir: 'Tilt up slightly, face North' },
  { id: 7,  row: 1, pitch:  20, yaw:  60, label: 'Mid-Up North-East', dir: 'Tilt up slightly, face North-East' },
  { id: 8,  row: 1, pitch:  20, yaw: 120, label: 'Mid-Up East',      dir: 'Tilt up slightly, face East' },
  { id: 9,  row: 1, pitch:  20, yaw: 180, label: 'Mid-Up South',     dir: 'Tilt up slightly, face South' },
  { id: 10, row: 1, pitch:  20, yaw: 240, label: 'Mid-Up South-West', dir: 'Tilt up slightly, face South-West' },
  { id: 11, row: 1, pitch:  20, yaw: 300, label: 'Mid-Up North-West', dir: 'Tilt up slightly, face North-West' },
  // Row 2 — pitch -20° (mid-lower ring)
  { id: 12, row: 2, pitch: -20, yaw:   0, label: 'Mid-Dn North',     dir: 'Tilt down slightly, face North' },
  { id: 13, row: 2, pitch: -20, yaw:  60, label: 'Mid-Dn North-East', dir: 'Tilt down slightly, face North-East' },
  { id: 14, row: 2, pitch: -20, yaw: 120, label: 'Mid-Dn East',      dir: 'Tilt down slightly, face East' },
  { id: 15, row: 2, pitch: -20, yaw: 180, label: 'Mid-Dn South',     dir: 'Tilt down slightly, face South' },
  { id: 16, row: 2, pitch: -20, yaw: 240, label: 'Mid-Dn South-West', dir: 'Tilt down slightly, face South-West' },
  { id: 17, row: 2, pitch: -20, yaw: 300, label: 'Mid-Dn North-West', dir: 'Tilt down slightly, face North-West' },
  // Row 3 — pitch -60° (lower ring)
  { id: 18, row: 3, pitch: -60, yaw:   0, label: 'Lower North',     dir: 'Point straight down, face North' },
  { id: 19, row: 3, pitch: -60, yaw:  60, label: 'Lower North-East', dir: 'Point straight down, face North-East' },
  { id: 20, row: 3, pitch: -60, yaw: 120, label: 'Lower East',      dir: 'Point straight down, face East' },
  { id: 21, row: 3, pitch: -60, yaw: 180, label: 'Lower South',     dir: 'Point straight down, face South' },
  { id: 22, row: 3, pitch: -60, yaw: 240, label: 'Lower South-West', dir: 'Point straight down, face South-West' },
  { id: 23, row: 3, pitch: -60, yaw: 300, label: 'Lower North-West', dir: 'Point straight down, face North-West' },
];

const TOTAL = SHOTS.length;

// ─── Helper: yaw → compass direction text ───────────────────────────────────
function yawToCompass(yaw) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((yaw % 360 + 360) % 360) / 45) % 8;
  return dirs[idx];
}

// ─── Helper: pitch → tilt text ────────────────────────────────────────────────
function pitchToTilt(pitch) {
  if (pitch >= 50) return 'Point camera straight UP at the ceiling / sky';
  if (pitch >= 10) return 'Tilt UP about 20°';
  if (pitch <= -50) return 'Point camera straight DOWN at the floor / ground';
  if (pitch <= -10) return 'Tilt DOWN about 20°';
  return 'Hold camera LEVEL (eye height)';
}

export default function TourCapture({ onTourReady, onClose }) {
  const [captured, setCaptured]       = useState({});
  const [activeShot, setActiveShot]   = useState(0);
  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'starting' | 'live' | 'error'
  const [cameraError, setCameraError] = useState(null);
  const [isStitching, setIsStitching] = useState(false);
  const [stitchError, setStitchError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [flashActive, setFlashActive] = useState(false);
  const [debugMsg, setDebugMsg]       = useState('');

  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const pendingStreamRef = useRef(null); // stream obtained before video element mounts
  const connectTimeoutRef = useRef(null);

  const captureCount = Object.keys(captured).length;
  const currentShot  = SHOTS[activeShot];
  const allDone      = captureCount === TOTAL;

  // ── Verify video element is actually in the DOM ──────────────────────────
  const isVideoInDocument = () => {
    return videoRef.current && document.contains(videoRef.current);
  };

  // ── Connect stream to video element ────────────────────────────────────────
  const connectStreamToVideo = useCallback(async (stream) => {
    if (!stream || !isVideoInDocument()) {
      console.log('[CAMERA DEBUG] Video element not in DOM, aborting connection');
      return;
    }
    
    try {
      console.log('[CAMERA DEBUG] Connecting stream to video element...');
      setDebugMsg('Step 3: Assigning stream to video...');

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      console.log('[CAMERA DEBUG] Stream assigned. Calling play()...');
      setDebugMsg('Step 4: Calling video.play()...');

      try {
        await videoRef.current.play();
        console.log('[CAMERA DEBUG] play() succeeded. readyState:', videoRef.current.readyState);
        setDebugMsg(`Step 5: play() OK | readyState=${videoRef.current.readyState}`);
      } catch (e) {
        console.warn('[CAMERA DEBUG] play() warning:', e.name, e.message);
        setDebugMsg(`Step 5 ERR: play() failed - ${e.name}`);
      }

      if (videoRef.current.readyState < 2) {
        console.log('[CAMERA DEBUG] Waiting for loadedmetadata... readyState:', videoRef.current.readyState);
        setDebugMsg('Step 6: Waiting for loadedmetadata event...');
        await new Promise((res, rej) => {
          const t = setTimeout(() => {
            console.error('[CAMERA DEBUG] loadedmetadata TIMEOUT after 3s');
            setDebugMsg('Step 6 ERR: Metadata timeout (3s)');
            rej(new Error('video metadata timeout'));
          }, 3000);
          const onMeta = () => {
            console.log('[CAMERA DEBUG] loadedmetadata FIRED!');
            setDebugMsg('Step 6: loadedmetadata ✅');
            clearTimeout(t);
            videoRef.current?.removeEventListener('loadedmetadata', onMeta);
            res();
          };
          videoRef.current.addEventListener('loadedmetadata', onMeta, { once: true });
        });
      } else {
        console.log('[CAMERA DEBUG] readyState >= 2, skipping metadata wait');
        setDebugMsg('Step 6: readyState OK, skip wait');
      }

      console.log('[CAMERA DEBUG] SUCCESS! Transitioning to live');
      setDebugMsg('Step 7: Camera LIVE ✅');
      setCameraState('live');
    } catch (err) {
      console.error('[CAMERA DEBUG] FAILED to connect stream to video:', err);
      setDebugMsg(`Step ERR: ${err.message}`);
      setCameraError('Failed to start video feed. Please reload and try again.');
      setCameraState('error');
    }
  }, []);

  // ── Start camera ────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    console.log('[CAMERA DEBUG] startCamera() called');
    if (streamRef.current || pendingStreamRef.current) {
      console.log('[CAMERA DEBUG] Already has stream, returning');
      return;
    }
    setCameraError(null);
    setDebugMsg('Step 1: Requesting camera permission...');
    console.log('[CAMERA DEBUG] Setting cameraState=starting');
    
    // Force synchronous render so video element is created before getUserMedia completes
    flushSync(() => {
      setCameraState('starting');
    });

    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };
      console.log('[CAMERA DEBUG] Calling getUserMedia with constraints:', constraints);

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('[CAMERA DEBUG] getUserMedia SUCCESS (environment camera)');
      } catch (envErr) {
        console.warn('[CAMERA DEBUG] Environment camera failed:', envErr.name, envErr.message);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        console.log('[CAMERA DEBUG] getUserMedia SUCCESS (any camera fallback)');
      }

      console.log('[CAMERA DEBUG] Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, label: t.label, readyState: t.readyState })));
      setDebugMsg('Step 2: Stream obtained. Connecting to video...');
      console.log('[CAMERA DEBUG] Stream obtained. videoRef.current=', !!videoRef.current);

      // If video element is already mounted and in DOM, connect immediately
      if (isVideoInDocument()) {
        console.log('[CAMERA DEBUG] Video element ready and in DOM, connecting immediately');
        await connectStreamToVideo(stream);
      } else {
        // Video element not yet rendered, poll for it
        console.log('[CAMERA DEBUG] Video element not ready, starting poll...');
        setDebugMsg('Step 2b: Waiting for video element to mount...');
        pendingStreamRef.current = stream;

        const pollInterval = setInterval(() => {
          if (isVideoInDocument() && pendingStreamRef.current) {
            clearInterval(pollInterval);
            console.log('[CAMERA DEBUG] Video element detected via poll, connecting...');
            const pendingStream = pendingStreamRef.current;
            pendingStreamRef.current = null;
            connectStreamToVideo(pendingStream);
          }
        }, 50);

        // Timeout after 5 seconds
        connectTimeoutRef.current = setTimeout(() => {
          clearInterval(pollInterval);
          if (pendingStreamRef.current) {
            pendingStreamRef.current = null;
            console.error('[CAMERA DEBUG] Video element never mounted');
            setDebugMsg('Step 2b ERR: Video element timeout');
            setCameraError('Video element failed to load. Please reload and try again.');
            setCameraState('error');
          }
        }, 5000);
      }
    } catch (err) {
      console.error('[CAMERA DEBUG] Camera access FAILED:', err.name, err.message);
      let msg = 'Cannot access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera access in your browser settings and reload the page.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is already in use by another app. Please close other apps using the camera.';
      }
      setCameraError(msg);
      setCameraState('error');
      setDebugMsg(`Step 1 ERR: ${err.name}`);
    }
  }, []);

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    pendingStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    setCameraState('idle');
    setDebugMsg('Camera stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    pendingStreamRef.current?.getTracks().forEach(t => t.stop());
    videoRef.current = null;
  }, []);

  // ── Capture the current shot ──────────────────────────────────────────────
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setCameraError('Video not ready. Please wait a moment.');
      return;
    }

    // Trigger flash immediately
    setFlashActive(true);
    const flashTimer = setTimeout(() => setFlashActive(false), 250);

    const canvas = document.createElement('canvas');
    const MAX_W = 1280;
    const scale = Math.min(1, MAX_W / video.videoWidth);
    canvas.width  = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

    setCaptured(prev => {
      // Prevent capturing more than TOTAL shots
      if (Object.keys(prev).length >= TOTAL) {
        setCameraError(`Maximum ${TOTAL} shots reached. Click "Generate Tour" to finish.`);
        return prev;
      }
      const next = { ...prev, [activeShot]: base64 };
      // Show captured success indicator
      setJustCaptured(true);
      setTimeout(() => setJustCaptured(false), 1000);
      // Auto-advance to next uncaptured shot after a brief delay
      const nextShot = SHOTS.find(s => !(s.id in next));
      if (nextShot) {
        setTimeout(() => setActiveShot(nextShot.id), 500);
      }
      return next;
    });

    return () => clearTimeout(flashTimer);
  }, [activeShot]);

  // ── Retake a specific shot ────────────────────────────────────────────────
  const retakeShot = useCallback((shotId) => {
    setCaptured(prev => {
      const next = { ...prev };
      delete next[shotId];
      return next;
    });
    setActiveShot(shotId);
    if (cameraState !== 'live') startCamera();
  }, [cameraState, startCamera]);

  // ── Upload to Cloudinary (client-side) ────────────────────────────────────
  const uploadToCloudinary = async (base64String, cloudName, uploadPreset) => {
    const blob = await fetch(`data:image/jpeg;base64,${base64String}`).then(r => r.blob());
    const formData = new FormData();
    formData.append('file', blob, `shot-${Date.now()}.jpg`);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'xrplot/tours');
    formData.append('quality', 'auto:good');

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = err.error?.message || `Cloudinary upload failed (${res.status})`;
      // Mark as preset error so we can fallback
      if (message.toLowerCase().includes('preset') || res.status === 400) {
        const error = new Error(message);
        error.isPresetError = true;
        throw error;
      }
      throw new Error(message);
    }

    const data = await res.json();
    return data.secure_url;
  };

  // ── Stitch all 24 shots ───────────────────────────────────────────────────
  const handleStitch = useCallback(async () => {
    if (captureCount < TOTAL) {
      setStitchError(`Please capture all ${TOTAL} shots before stitching. You have ${captureCount}/${TOTAL}.`);
      return;
    }

    setIsStitching(true);
    setStitchError(null);
    setUploadProgress({ current: 0, total: TOTAL });
    stopCamera();

    try {
      // 1. Get Cloudinary config for client-side upload
      setDebugMsg('Fetching Cloudinary config...');
      const configRes = await fetch('/api/cloudinary-config');
      if (!configRes.ok) throw new Error('Failed to get upload configuration');
      const { cloudName, uploadPreset } = await configRes.json();

      if (!cloudName || !uploadPreset) {
        // Fallback to server-side upload if unsigned preset not configured
        setDebugMsg('Using server upload (unsigned preset not configured)...');
        
        // Use existing server upload endpoint
        const imageUrls = [];
        for (let i = 0; i < SHOTS.length; i++) {
          const shot = SHOTS[i];
          const base64 = captured[shot.id];
          if (!base64) continue;

          setUploadProgress({ current: i + 1, total: TOTAL });
          setDebugMsg(`Uploading shot ${i + 1}/${TOTAL} to server...`);

          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `Upload failed for shot ${i+1}`);
          imageUrls.push(data.url);
        }

        setDebugMsg('Fusing images with AI...');
        const stitchRes = await fetch('/api/stitch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrls }),
        });

        const stitchData = await stitchRes.json();
        if (!stitchRes.ok || !stitchData.panoramaUrl) {
          throw new Error(stitchData.error || 'Stitching failed — no panorama returned.');
        }

        setDebugMsg('Tour ready! ✅');
        onTourReady?.(stitchData.panoramaUrl);
        return;
      }

      // 2. Upload all 24 shots — try Cloudinary first, fallback to server upload
      const imageUrls = [];
      let useServerFallback = false;
      
      for (let i = 0; i < SHOTS.length; i++) {
        const shot = SHOTS[i];
        const base64 = captured[shot.id];
        if (!base64) continue;

        setUploadProgress({ current: i + 1, total: TOTAL });

        // If we already know preset is bad, skip Cloudinary and use server directly
        if (useServerFallback) {
          setDebugMsg(`Uploading shot ${i + 1}/${TOTAL} to server...`);
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `Upload failed for shot ${i+1}`);
          imageUrls.push(data.url);
          continue;
        }

        setDebugMsg(`Uploading shot ${i + 1}/${TOTAL} to Cloudinary...`);

        try {
          const url = await uploadToCloudinary(base64, cloudName, uploadPreset);
          imageUrls.push(url);
        } catch (uploadErr) {
          // If preset not found, mark fallback and retry this image via server
          if (uploadErr.isPresetError || uploadErr.message?.toLowerCase().includes('preset')) {
            setDebugMsg('Cloudinary preset not found, switching to server upload...');
            useServerFallback = true;
            // Retry this same image via server
            setDebugMsg(`Uploading shot ${i + 1}/${TOTAL} to server...`);
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64 }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Upload failed for shot ${i+1}`);
            imageUrls.push(data.url);
          } else {
            throw uploadErr;
          }
        }
      }

      // 3. Send URLs to stitching API (small JSON, well under Vercel limit)
      setDebugMsg('Fusing images with AI...');
      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls }),
      });

      const data = await res.json();
      if (!res.ok || !data.panoramaUrl) {
        throw new Error(data.error || 'Stitching failed — no panorama returned.');
      }

      setDebugMsg('Tour ready! ✅');
      onTourReady?.(data.panoramaUrl);
    } catch (err) {
      console.error('[TourCapture] Stitch error:', err);
      setStitchError(err.message);
      setDebugMsg(`Error: ${err.message}`);
    } finally {
      setIsStitching(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  }, [captured, captureCount, onTourReady, stopCamera]);

  // ── Alignment guidance overlay (mobile-first, large and clear) ─────────────
  function AlignmentGuide({ yaw, pitch, label, dir }) {
    const rotation = -yaw;
    const pitchText = pitchToTilt(pitch);
    const compass = yawToCompass(yaw);

    return (
      <div className="tc-alignment-guide">
        {/* Progress + Compass pill */}
        <div className="tc-alignment-pill">
          <span className="tc-alignment-shot">{activeShot + 1} / {TOTAL}</span>
          <span className="tc-alignment-divider" />
          <span className="tc-alignment-compass">{compass}</span>
        </div>

        {/* Direction instruction */}
        <div className="tc-alignment-instruction">
          <div className="tc-alignment-label">{label}</div>
          <div className="tc-alignment-dir">{dir}</div>
        </div>

        {/* Large compass dial */}
        <div className="tc-compass-dial">
          <span className="tc-compass-n">N</span>
          <svg className="tc-compass-arrow" viewBox="0 0 40 40" style={{ transform: `rotate(${rotation}deg)` }}>
            <polygon points="20,2 32,30 20,24 8,30" fill="#a78bfa" />
          </svg>
        </div>

        {/* Pitch hint */}
        <div className="tc-pitch-hint">{pitchText}</div>
      </div>
    );
  }

  // ── Shot progress dots (mobile-optimized) ──────────────────────────────────
  function ShotProgress() {
    return (
      <div className="tc-progress-dots">
        {SHOTS.map(shot => {
          const done = shot.id in captured;
          const isActive = shot.id === activeShot;
          return (
            <button
              key={shot.id}
              className={`tc-progress-dot ${done ? 'done' : ''} ${isActive ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (done) retakeShot(shot.id);
                else if (isActive && cameraState !== 'live') startCamera();
              }}
              title={shot.label}
              disabled={!done && !isActive}
            >
              {done ? (
                <div className="tc-dot-check">✓</div>
              ) : (
                <span className="tc-dot-num">{shot.id + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  const rowLabels = ['Upper Ring (point UP)', 'Mid-Upper Ring (tilt up)', 'Mid-Lower Ring (tilt down)', 'Lower Ring (point DOWN)'];

  const [showMap, setShowMap] = useState(false);
  const [justCaptured, setJustCaptured] = useState(false);

  return (
    <div className="tour-capture-overlay">
      {/* ═══ MOBILE-FIRST LAYOUT ═══ */}

      {/* ── Top bar (minimal) ──────────────────────────────────────────────── */}
      <header className="tc-topbar">
        <div className="tc-topbar-left">
          <span className="tc-topbar-count">{captureCount}/{TOTAL}</span>
          {allDone && <span className="tc-topbar-done">✅</span>}
        </div>
        <div className="tc-topbar-center">
          <span className="tc-topbar-title">360° Capture</span>
        </div>
        <button className="tc-topbar-close" onClick={onClose}>✕</button>
      </header>

      {/* ── Shot progress strip ────────────────────────────────────────────── */}
      <div className="tc-progress-strip">
        <ShotProgress />
      </div>

      {/* ── Main content: camera fills the screen ──────────────────────────── */}
      <div className="tc-main">

        {/* Viewfinder / Camera feed */}
        <div className="tc-viewfinder-wrap" style={{ display: cameraState === 'live' || cameraState === 'starting' ? 'block' : 'none' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="tc-video"
            onLoadedMetadata={() => {
              console.log('[CAMERA DEBUG] onLoadedMetadata event fired! readyState:', videoRef.current?.readyState);
            }}
            onPlay={() => {
              console.log('[CAMERA DEBUG] onPlay event fired!');
            }}
            onError={(e) => {
              console.error('[CAMERA DEBUG] Video error:', e);
            }}
          />

          {flashActive && <div className="tc-flash" />}

          {/* Starting overlay */}
          {cameraState === 'starting' && (
            <div className="tc-starting-overlay">
              <div className="tc-spinner" />
              <span>Starting camera...</span>
              {debugMsg && (
                <div className="tc-starting-debug">{debugMsg}</div>
              )}
            </div>
          )}

          {/* Alignment overlay */}
          {cameraState === 'live' && (
            <>
              <AlignmentGuide yaw={currentShot.yaw} pitch={currentShot.pitch} label={currentShot.label} dir={currentShot.dir} />

              {/* Captured success indicator */}
              {justCaptured && (
                <div className="tc-captured-toast">
                  <span>✓ Captured!</span>
                </div>
              )}

              {/* Center crosshair */}
              <div className="tc-guide-overlay">
                <div className="tc-guide-crosshair" />
                <div className="tc-guide-ring tc-guide-ring-h" />
                <div className="tc-guide-ring tc-guide-ring-v" />
              </div>

              {/* Stop button (top-right) */}
              <button className="tc-stop-btn" onClick={stopCamera}>✕</button>
            </>
          )}
        </div>

        {/* Placeholder / Start screen */}
        {cameraState !== 'live' && cameraState !== 'starting' && (
          <div className="tc-camera-placeholder">
            <div className="tc-placeholder-icon">📷</div>
            <h3 className="tc-placeholder-title">{cameraError ? 'Camera Error' : 'Ready to Capture'}</h3>
            <p className="tc-placeholder-text">
              {cameraError || (
                'Stand at the center of the room. Keep your phone still. Follow the arrows for each of the 24 shots.'
              )}
            </p>
            {cameraState === 'idle' && (
              <button className="tc-btn-primary tc-btn-large" onClick={startCamera}>
                {captureCount > 0 ? `Resume Shot ${activeShot + 1}` : '📷 Start Camera'}
              </button>
            )}
            {cameraState === 'error' && (
              <button className="tc-btn-primary tc-btn-large" onClick={startCamera}>Retry Camera</button>
            )}
            {debugMsg && (
              <div className="tc-debug-msg">Debug: {debugMsg}</div>
            )}
          </div>
        )}

        {/* Shot map toggle (mobile) */}
        {cameraState === 'live' && (
          <button className="tc-map-toggle" onClick={() => setShowMap(!showMap)}>
            {showMap ? 'Hide Map ↑' : `Show Map (${captureCount}/${TOTAL}) ↓`}
          </button>
        )}
      </div>

      {/* ── Shot map panel (collapsible on mobile, side panel on desktop) ──── */}
      <div className={`tc-map-panel ${showMap ? 'open' : ''}`}>
        <div className="tc-map-header">
          <h3>Shot Map</h3>
          <button className="tc-map-close" onClick={() => setShowMap(false)}>✕</button>
        </div>
        {[0, 1, 2, 3].map(rowIdx => {
          const rowShots = SHOTS.filter(s => s.row === rowIdx);
          return (
            <div key={rowIdx} className="tc-grid-row">
              <span className="tc-row-label">{rowLabels[rowIdx]}</span>
              <div className="tc-row-shots">
                {rowShots.map(shot => {
                  const done = shot.id in captured;
                  const isActive = shot.id === activeShot;
                  const isClickable = done || (isActive && cameraState === 'live');
                  return (
                    <button
                      key={shot.id}
                      className={`tc-shot-cell ${done ? 'done' : ''} ${isActive ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (done) retakeShot(shot.id);
                        else if (isActive && cameraState !== 'live') startCamera();
                      }}
                      title={shot.label}
                      disabled={!isClickable && !done}
                      style={{ opacity: !isClickable && !done ? 0.4 : 1 }}
                    >
                      {done ? (
                        <span className="tc-shot-check">✓</span>
                      ) : (
                        <span className="tc-shot-num">{shot.id + 1}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom action bar ──────────────────────────────────────────────── */}
      <footer className="tc-bottombar">
        {stitchError && (
          <div className="tc-error-banner">⚠ {stitchError}</div>
        )}

        {isStitching ? (
          <div className="tc-stitching-state">
            <div className="tc-spinner" />
            <span>
              {uploadProgress.current < uploadProgress.total
                ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...`
                : `Fusing ${TOTAL} images with AI...`}
            </span>
          </div>
        ) : cameraState === 'live' ? (
          /* Big capture button when camera is live */
          <div className="tc-capture-bar">
            <button 
              className="tc-capture-btn-large"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (allDone) {
                  stopCamera();
                } else {
                  captureFrame();
                }
              }}
              aria-label={allDone ? "All shots complete" : "Capture photo"}
              disabled={isStitching}
            >
              <div className={`tc-capture-ring ${allDone ? 'complete' : ''}`}>
                <div className={`tc-capture-inner ${allDone ? 'complete' : ''}`} />
              </div>
              <span className="tc-capture-label">
                {allDone 
                  ? '✅ All Done! Tap to Finish'
                  : justCaptured 
                    ? 'Captured!' 
                    : `Shot ${activeShot + 1}: Tap to Capture`}
              </span>
            </button>
          </div>
        ) : (
          /* Footer buttons when not capturing */
          <div className="tc-footer-actions">
            <button className="tc-btn-ghost" onClick={onClose} disabled={isStitching}>
              Cancel
            </button>
            <button
              className={`tc-btn-primary tc-stitch-btn ${allDone ? 'glow' : ''}`}
              onClick={handleStitch}
              disabled={!allDone || isStitching}
              title={!allDone ? `Complete all 24 shots (${captureCount}/${TOTAL})` : 'Generate 360° panorama'}
            >
              {allDone
                ? '✨ Generate Tour'
                : `${captureCount}/${TOTAL} Shots`}
            </button>
          </div>
        )}
      </footer>

      {/* ── Inline styles ── MOBILE-FIRST DESIGN ─────────────────────────── */}
      <style jsx>{`
        /* ===== BASE LAYOUT ===== */
        .tour-capture-overlay {
          position: fixed; inset: 0; z-index: 9000;
          background: #07071a;
          display: flex; flex-direction: column;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #e8e8f8;
          overflow: hidden;
        }

        /* ===== TOP BAR (minimal) ===== */
        .tc-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(12px);
          z-index: 100;
          flex-shrink: 0;
        }
        .tc-topbar-left {
          display: flex; align-items: center; gap: 8px;
        }
        .tc-topbar-count {
          background: rgba(124,58,237,0.9);
          color: white;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .tc-topbar-done { font-size: 0.9rem; }
        .tc-topbar-center {
          position: absolute; left: 50%; transform: translateX(-50%);
          font-size: 0.8rem; font-weight: 600; color: #a0a0d0;
          letter-spacing: 0.05em;
        }
        .tc-topbar-close {
          background: rgba(255,255,255,0.1); border: none; color: #ccc;
          width: 32px; height: 32px; border-radius: 50%;
          cursor: pointer; font-size: 0.9rem;
          display: flex; align-items: center; justify-content: center;
        }

        /* ===== SHOT PROGRESS DOTS ===== */
        .tc-progress-strip {
          padding: 8px 12px;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(8px);
          z-index: 100;
          flex-shrink: 0;
        }
        .tc-progress-dots {
          display: flex; gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .tc-progress-dots::-webkit-scrollbar { display: none; }
        .tc-progress-dot {
          flex-shrink: 0;
          width: 28px; height: 28px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.05);
          cursor: pointer;
          padding: 0;
          position: relative;
          overflow: hidden;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 600;
          color: #606080;
        }
        .tc-progress-dot:disabled { cursor: default; opacity: 0.25; }
        .tc-progress-dot.active {
          border-color: #a78bfa;
          box-shadow: 0 0 0 2px rgba(167,139,250,0.4), inset 0 0 8px rgba(167,139,250,0.2);
          background: rgba(167,139,250,0.2);
          color: #a78bfa;
          transform: scale(1.1);
        }
        .tc-progress-dot.done {
          border-color: #38bdf8;
          background: rgba(56,189,248,0.25);
        }
        .tc-dot-check {
          color: #38bdf8;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .tc-dot-num {
          font-size: 0.6rem;
          font-weight: 600;
        }

        /* ===== MAIN CONTENT (camera viewfinder) ===== */
        .tc-main {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
        }

        /* ===== VIEWFINDER ===== */
        .tc-viewfinder-wrap {
          flex: 1;
          position: relative;
          background: #000;
          overflow: hidden;
        }
        .tc-video {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Starting overlay */
        .tc-starting-overlay {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; z-index: 50;
          background: rgba(7,7,26,0.9);
          backdrop-filter: blur(4px);
        }
        .tc-starting-overlay span {
          color: #9090c0; font-size: 0.9rem;
        }
        .tc-starting-debug {
          font-size: 0.7rem; color: #a0a0d0;
          background: rgba(0,0,0,0.5);
          padding: 4px 10px;
          border-radius: 6px;
          font-family: monospace;
          max-width: 90%; text-align: center;
        }

        /* Flash effect */
        .tc-flash {
          position: absolute; inset: 0;
          background: white; opacity: 0.9;
          animation: flashOut 0.3s forwards;
          pointer-events: none; z-index: 60;
        }
        @keyframes flashOut { 
          0% { opacity: 0.9; }
          100% { opacity: 0; }
        }

        /* Captured toast */
        .tc-captured-toast {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(56,189,248,0.95);
          color: white;
          padding: 12px 28px;
          border-radius: 999px;
          font-size: 1rem;
          font-weight: 700;
          z-index: 55;
          animation: toastPop 1s ease forwards;
          pointer-events: none;
          box-shadow: 0 4px 20px rgba(56,189,248,0.4);
        }
        @keyframes toastPop {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          20% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
        }

        /* ===== ALIGNMENT GUIDE (prominent on mobile) ===== */
        .tc-alignment-guide {
          position: absolute;
          top: 12px; left: 0; right: 0;
          display: flex; flex-direction: column;
          align-items: center; gap: 10px;
          z-index: 30;
          pointer-events: none;
          padding: 0 16px;
        }
        .tc-alignment-pill {
          display: flex; align-items: center; gap: 8px;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .tc-alignment-shot {
          color: #a78bfa; font-weight: 700; font-size: 0.8rem;
        }
        .tc-alignment-divider {
          width: 1px; height: 12px;
          background: rgba(255,255,255,0.2);
        }
        .tc-alignment-compass {
          color: #fff; font-weight: 700; font-size: 0.85rem;
          letter-spacing: 0.05em;
        }
        .tc-alignment-instruction {
          text-align: center;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(8px);
          padding: 8px 16px;
          border-radius: 12px;
          max-width: 280px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .tc-alignment-label {
          color: #fff; font-size: 0.85rem; font-weight: 600;
          margin-bottom: 2px;
        }
        .tc-alignment-dir {
          color: #a0a0d0; font-size: 0.75rem; line-height: 1.4;
        }
        .tc-compass-dial {
          width: 100px; height: 100px;
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          position: relative;
          background: rgba(0,0,0,0.3);
          backdrop-filter: blur(4px);
        }
        .tc-compass-n {
          position: absolute; top: 6px;
          font-size: 0.7rem; color: #ef4444;
          font-weight: 800;
        }
        .tc-compass-arrow {
          width: 48px; height: 48px;
          transition: transform 0.4s ease;
          filter: drop-shadow(0 0 4px rgba(167,139,250,0.5));
        }
        .tc-pitch-hint {
          background: rgba(124,58,237,0.7);
          color: white;
          padding: 5px 14px;
          border-radius: 999px;
          font-size: 0.75rem; font-weight: 600;
          backdrop-filter: blur(4px);
        }

        /* ===== CENTER CROSSHAIR ===== */
        .tc-guide-overlay {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none; z-index: 20;
        }
        .tc-guide-crosshair {
          position: absolute;
          width: 80px; height: 80px;
          border: 2px solid rgba(167,139,250,0.5);
          border-radius: 50%;
        }
        .tc-guide-crosshair::before, .tc-guide-crosshair::after {
          content: ''; position: absolute; background: rgba(167,139,250,0.4);
        }
        .tc-guide-crosshair::before {
          width: 1px; height: 32px;
          top: -36px; left: 50%; transform: translateX(-50%);
        }
        .tc-guide-crosshair::after {
          height: 1px; width: 32px;
          left: -36px; top: 50%; transform: translateY(-50%);
        }
        .tc-guide-ring {
          position: absolute;
          border: 1px dashed rgba(56,189,248,0.2);
          border-radius: 50%;
        }
        .tc-guide-ring-h { width: 75%; height: 30%; }
        .tc-guide-ring-v { width: 30%; height: 75%; }

        /* Stop button (top-right of viewfinder) */
        .tc-stop-btn {
          position: absolute; top: 12px; right: 12px;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.2);
          color: #ccc;
          width: 36px; height: 36px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 0.85rem;
          z-index: 40;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }

        /* ===== PLACEHOLDER / START SCREEN ===== */
        .tc-camera-placeholder {
          flex: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 20px;
          text-align: center;
          padding: 24px;
          background: linear-gradient(180deg, #0a0a1a 0%, #07071a 100%);
        }
        .tc-placeholder-icon { font-size: 56px; }
        .tc-placeholder-title {
          margin: 0;
          font-size: 1.1rem; font-weight: 700; color: #fff;
        }
        .tc-placeholder-text {
          margin: 0;
          font-size: 0.85rem; color: #9090c0;
          line-height: 1.6; max-width: 280px;
        }
        .tc-debug-msg {
          font-size: 0.7rem; color: #7070a0;
          background: rgba(0,0,0,0.3);
          padding: 4px 10px;
          border-radius: 6px;
          font-family: monospace;
          max-width: 100%;
        }

        /* ===== MAP TOGGLE (mobile) ===== */
        .tc-map-toggle {
          position: absolute;
          bottom: 100px; left: 50%; transform: translateX(-50%);
          z-index: 40;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          color: #a0a0d0;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 0.75rem;
          cursor: pointer;
        }

        /* ===== SHOT MAP PANEL (collapsible) ===== */
        .tc-map-panel {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          max-height: 60vh;
          background: rgba(7,7,26,0.95);
          backdrop-filter: blur(16px);
          border-top: 1px solid rgba(255,255,255,0.08);
          z-index: 90;
          transform: translateY(100%);
          transition: transform 0.3s ease;
          overflow-y: auto;
          padding: 16px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .tc-map-panel.open { transform: translateY(0); }
        .tc-map-header {
          display: flex; align-items: center; justify-content: space-between;
        }
        .tc-map-header h3 {
          margin: 0;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9090c0;
        }
        .tc-map-close {
          background: rgba(255,255,255,0.08); border: none;
          color: #ccc; width: 28px; height: 28px;
          border-radius: 50%; cursor: pointer;
          font-size: 0.8rem;
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
          transition: all 0.2s;
          padding: 0;
        }
        .tc-shot-cell:active:not(:disabled) { transform: scale(0.95); }
        .tc-shot-cell.active {
          border-color: #a78bfa;
          box-shadow: 0 0 0 2px rgba(167,139,250,0.4);
        }
        .tc-shot-cell.done {
          border-color: #38bdf8;
          background: rgba(56,189,248,0.15);
        }
        .tc-shot-cell:disabled { cursor: not-allowed; opacity: 0.3; }
        .tc-shot-num { font-size: 0.6rem; font-weight: 700; color: #7070a0; }
        .tc-shot-check {
          color: #38bdf8;
          font-size: 0.9rem;
          font-weight: 700;
        }

        /* ===== BOTTOM BAR ===== */
        .tc-bottombar {
          flex-shrink: 0;
          padding: 12px 16px;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255,255,255,0.06);
          z-index: 100;
          min-height: 72px;
          display: flex; align-items: center;
          justify-content: center;
        }

        /* Big capture button */
        .tc-capture-bar {
          display: flex; flex-direction: column;
          align-items: center; gap: 6px;
        }
        .tc-capture-btn-large {
          background: none; border: none;
          cursor: pointer;
          display: flex; flex-direction: column;
          align-items: center; gap: 6px;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .tc-capture-ring {
          width: 84px; height: 84px;
          border: 4px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .tc-capture-btn-large:active .tc-capture-ring {
          transform: scale(0.92);
        }
        .tc-capture-ring.complete {
          border-color: #22c55e;
          background: rgba(34,197,94,0.1);
        }
        .tc-capture-inner {
          width: 64px; height: 64px;
          background: white;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .tc-capture-btn-large:active .tc-capture-inner {
          transform: scale(0.9);
        }
        .tc-capture-inner.complete {
          background: #22c55e;
        }
        .tc-capture-label {
          color: #9090c0; font-size: 0.75rem;
          font-weight: 500;
        }

        /* Footer buttons */
        .tc-footer-actions {
          display: flex; justify-content: space-between;
          gap: 12px; align-items: center;
          width: 100%;
        }
        .tc-error-banner {
          background: rgba(220,50,50,0.15);
          border: 1px solid rgba(220,50,50,0.3);
          color: #ff8888;
          padding: 8px 14px; border-radius: 8px;
          font-size: 0.8rem;
          width: 100%; text-align: center;
        }

        /* ===== BUTTONS ===== */
        .tc-btn-primary {
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          color: white; border: none;
          padding: 14px 28px;
          border-radius: 12px; cursor: pointer;
          font-size: 0.95rem; font-weight: 600;
          transition: opacity 0.2s, box-shadow 0.2s, transform 0.1s;
          -webkit-tap-highlight-color: transparent;
        }
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
        .tc-btn-large {
          padding: 16px 36px;
          font-size: 1rem;
          width: 100%; max-width: 280px;
        }
        .tc-stitch-btn {
          padding: 14px 24px;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .tc-btn-ghost {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.15);
          color: #9090c0;
          padding: 14px 22px;
          border-radius: 12px; cursor: pointer;
          font-size: 0.9rem;
          transition: border-color 0.2s, color 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .tc-btn-ghost:active { border-color: rgba(255,255,255,0.3); color: #ccc; }

        /* Stitching state */
        .tc-stitching-state {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; color: #9090c0; font-size: 0.85rem;
        }

        /* Spinner */
        .tc-spinner {
          width: 24px; height: 24px;
          border: 3px solid rgba(124,58,237,0.3);
          border-top-color: #7c3aed;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Scrollbar for map */
        .tc-map-panel::-webkit-scrollbar { width: 4px; }
        .tc-map-panel::-webkit-scrollbar-track { background: transparent; }
        .tc-map-panel::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 2px; }

        /* ===== DESKTOP OVERRIDES ===== */
        @media (min-width: 769px) {
          .tc-main {
            flex-direction: row;
            gap: 0;
          }
          .tc-viewfinder-wrap {
            flex: 1;
            border-radius: 0;
          }
          .tc-map-panel {
            position: static;
            transform: none;
            max-height: none;
            width: 360px;
            flex-shrink: 0;
            border-top: none;
            border-left: 1px solid rgba(255,255,255,0.06);
          }
          .tc-map-toggle { display: none; }
          .tc-map-header { display: none; }
          .tc-topbar-center { font-size: 0.85rem; }
          .tc-alignment-guide { top: 16px; }
          .tc-compass-dial { width: 120px; height: 120px; }
          .tc-compass-arrow { width: 56px; height: 56px; }
          .tc-capture-ring { width: 72px; height: 72px; }
          .tc-capture-inner { width: 52px; height: 52px; }
          .tc-bottombar { padding: 14px 24px; }
        }
      `}</style>
    </div>
  );
}
