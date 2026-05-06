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

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    setCaptured(prev => {
      const next = { ...prev, [activeShot]: base64 };
      // Auto-advance to next uncaptured shot
      const nextShot = SHOTS.find(s => !(s.id in next));
      if (nextShot) setActiveShot(nextShot.id);
      return next;
    });
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
      const err = await res.json();
      throw new Error(err.error?.message || 'Cloudinary upload failed');
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

      // 2. Upload all 24 shots directly to Cloudinary (bypasses Vercel 4.5MB limit)
      const imageUrls = [];
      for (let i = 0; i < SHOTS.length; i++) {
        const shot = SHOTS[i];
        const base64 = captured[shot.id];
        if (!base64) continue;

        setUploadProgress({ current: i + 1, total: TOTAL });
        setDebugMsg(`Uploading shot ${i + 1}/${TOTAL} to Cloudinary...`);

        const url = await uploadToCloudinary(base64, cloudName, uploadPreset);
        imageUrls.push(url);
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

  // ── Alignment arrow component ─────────────────────────────────────────────
  function AlignmentArrow({ yaw, pitch }) {
    const rotation = -yaw; // counter-rotate so arrow points in yaw direction
    const pitchText = pitchToTilt(pitch);
    const compass = yawToCompass(yaw);

    return (
      <div style={{
        position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        zIndex: 15, pointerEvents: 'none',
      }}>
        <div style={{
          background: 'rgba(124,58,237,0.9)', color: 'white',
          padding: '6px 16px', borderRadius: '999px',
          fontSize: '0.8rem', fontWeight: 700,
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span>Shot {activeShot + 1}/{TOTAL}</span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span>{compass}</span>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.7)', color: '#ccc',
          padding: '4px 12px', borderRadius: '8px',
          fontSize: '0.75rem', maxWidth: '280px', textAlign: 'center',
        }}>
          {pitchText}
        </div>

        {/* Compass ring with arrow */}
        <div style={{
          width: '80px', height: '80px',
          border: '2px solid rgba(255,255,255,0.3)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {/* N label */}
          <span style={{ position: 'absolute', top: '4px', fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>N</span>
          {/* Arrow */}
          <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.5s ease' }}>
            <polygon points="20,4 28,28 20,22 12,28" fill="#7c3aed" opacity="0.9" />
          </svg>
        </div>
      </div>
    );
  }

  const rowLabels = ['Upper Ring (point UP)', 'Mid-Upper Ring (tilt up)', 'Mid-Lower Ring (tilt down)', 'Lower Ring (point DOWN)'];

  return (
    <div className="tour-capture-overlay">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="tc-header">
        <div className="tc-header-left">
          <span className="tc-icon">🌐</span>
          <div>
            <h2>360° Tour Capture</h2>
            <p>{captureCount} / {TOTAL} shots captured{allDone ? ' ✅ All done!' : ''}</p>
          </div>
        </div>
        <button className="tc-close-btn" onClick={onClose} aria-label="Close">✕</button>
      </header>

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      <div className="tc-progress-bar-track">
        <div className="tc-progress-bar-fill" style={{ width: `${(captureCount / TOTAL) * 100}%` }} />
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="tc-body">

        {/* ── Camera / Viewfinder panel ──────────────────────────────────────── */}
        <div className="tc-camera-panel">
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
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '12px', zIndex: 12, background: 'rgba(7,7,26,0.85)',
              }}>
                <div className="tc-spinner" />
                <span style={{ color: '#9090c0', fontSize: '0.85rem' }}>Starting camera...</span>
                {debugMsg && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: debugMsg.includes('ERR') ? '#ff6b6b' : debugMsg.includes('✅') ? '#51cf66' : '#a0a0d0',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    maxWidth: '90%',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                  }}>
                    {debugMsg}
                  </div>
                )}
              </div>
            )}

            {/* Alignment overlay */}
            {cameraState === 'live' && (
              <>
                <AlignmentArrow yaw={currentShot.yaw} pitch={currentShot.pitch} />

                {/* Crosshair */}
                <div className="tc-guide-overlay">
                  <div className="tc-guide-crosshair" />
                  <div className="tc-guide-ring tc-guide-ring-h" />
                  <div className="tc-guide-ring tc-guide-ring-v" />
                </div>

                {/* Capture button */}
                <button className="tc-capture-btn" onClick={captureFrame} aria-label="Capture photo">
                  <span className="tc-capture-inner" />
                </button>

                <button className="tc-stop-btn" onClick={stopCamera}>■ Stop</button>
              </>
            )}
          </div>

          {/* Placeholder / Start screen */}
          {cameraState !== 'live' && cameraState !== 'starting' && (
            <div className="tc-camera-placeholder">
              <div className="tc-placeholder-icon">📷</div>
              <p style={{ whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.6 }}>
                {cameraError || (
                  'Stand at the center of the room.\n' +
                  'Keep your phone perfectly still.\n' +
                  'Follow the on-screen arrows for each shot.\n' +
                  'You must capture all 24 shots for best quality.'
                )}
              </p>
              {cameraState === 'idle' && (
                <button className="tc-btn-primary" onClick={startCamera}>
                  {captureCount > 0 ? `Resume (shot ${activeShot + 1})` : 'Start Camera'}
                </button>
              )}
              {cameraState === 'starting' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#9090c0' }}>
                  <div className="tc-spinner" />
                  <span>Starting camera...</span>
                </div>
              )}
              {cameraState === 'error' && (
                <button className="tc-btn-primary" onClick={startCamera}>Retry Camera</button>
              )}
              {/* Debug info */}
              {debugMsg && (
                <div style={{
                  fontSize: '0.72rem',
                  color: debugMsg.includes('ERR') ? '#ff6b6b' : debugMsg.includes('✅') ? '#51cf66' : '#7070a0',
                  marginTop: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  maxWidth: '100%',
                }}>
                  Debug: {debugMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Shot grid ────────────────────────────────────────────────────── */}
        <div className="tc-grid-panel">
          <h3 className="tc-grid-title">Shot Map — Capture all 24</h3>

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
                        onClick={() => {
                          if (done) retakeShot(shot.id);
                          else if (isActive && cameraState !== 'live') startCamera();
                        }}
                        title={shot.label}
                        disabled={!isClickable && !done}
                        style={{ opacity: !isClickable && !done ? 0.4 : 1 }}
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
              {uploadProgress.current < uploadProgress.total
                ? `Uploading shot ${uploadProgress.current} of ${uploadProgress.total} to Cloudinary...`
                : `Fusing ${TOTAL} images with Gemini AI...`}
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
              disabled={!allDone || isStitching}
              title={!allDone ? `Complete all 24 shots (${captureCount}/${TOTAL})` : 'Generate 360° panorama'}
            >
              {allDone
                ? '✨ Generate 360° Virtual Tour'
                : `Complete all shots (${captureCount}/${TOTAL})`}
            </button>
          </div>
        )}
      </footer>

      {/* ── Inline styles ──────────────────────────────────────────────────── */}
      <style jsx>{`
        .tour-capture-overlay {
          position: fixed; inset: 0; z-index: 9000;
          background: #07071a;
          display: flex; flex-direction: column;
          font-family: 'Inter', system-ui, sans-serif;
          color: #e8e8f8;
        }
        .tc-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 24px;
          background: rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
        }
        .tc-header-left { display: flex; align-items: center; gap: 14px; }
        .tc-icon { font-size: 28px; }
        .tc-header-left h2 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #fff; }
        .tc-header-left p { margin: 2px 0 0; font-size: 0.8rem; color: #9090c0; }
        .tc-close-btn {
          background: rgba(255,255,255,0.08); border: none; color: #ccc;
          width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
          font-size: 1rem; transition: background 0.2s;
        }
        .tc-close-btn:hover { background: rgba(255,100,100,0.3); }

        .tc-progress-bar-track { height: 3px; background: rgba(255,255,255,0.07); }
        .tc-progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #38bdf8);
          transition: width 0.4s ease;
        }

        .tc-body {
          flex: 1; overflow: auto;
          display: flex; gap: 24px; padding: 20px 24px;
        }

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

        .tc-viewfinder-wrap {
          flex: 1; position: relative;
          border-radius: 16px; overflow: hidden;
          background: #000;
        }
        .tc-video {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
        }

        .tc-flash {
          position: absolute; inset: 0;
          background: white; opacity: 0.7;
          animation: flashOut 0.25s forwards;
          pointer-events: none; z-index: 20;
        }
        @keyframes flashOut { to { opacity: 0; } }

        .tc-guide-overlay {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
        }
        .tc-guide-crosshair {
          position: absolute;
          width: 60px; height: 60px;
          border: 2px solid rgba(124,58,237,0.6);
          border-radius: 50%;
        }
        .tc-guide-crosshair::before, .tc-guide-crosshair::after {
          content: ''; position: absolute; background: rgba(124,58,237,0.5);
        }
        .tc-guide-crosshair::before {
          width: 1px; height: 24px; top: -28px; left: 50%; transform: translateX(-50%);
        }
        .tc-guide-crosshair::after {
          height: 1px; width: 24px; left: -28px; top: 50%; transform: translateY(-50%);
        }
        .tc-guide-ring {
          position: absolute;
          border: 1px dashed rgba(56,189,248,0.25);
          border-radius: 50%;
        }
        .tc-guide-ring-h { width: 70%; height: 25%; }
        .tc-guide-ring-v { width: 25%; height: 70%; }

        .tc-capture-btn {
          position: absolute; bottom: 24px; left: 50%;
          transform: translateX(-50%);
          width: 72px; height: 72px;
          background: rgba(255,255,255,0.12);
          border: 3px solid white;
          border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.1s, background 0.2s;
          z-index: 10;
        }
        .tc-capture-btn:hover { background: rgba(255,255,255,0.25); }
        .tc-capture-btn:active { transform: translateX(-50%) scale(0.92); }
        .tc-capture-inner {
          width: 54px; height: 54px;
          background: white; border-radius: 50%;
          transition: transform 0.1s;
        }
        .tc-capture-btn:active .tc-capture-inner { transform: scale(0.88); }

        .tc-stop-btn {
          position: absolute; top: 12px; right: 12px;
          background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2);
          color: #ccc; padding: 4px 12px; border-radius: 8px;
          cursor: pointer; font-size: 0.75rem;
          transition: background 0.2s; z-index: 15;
        }
        .tc-stop-btn:hover { background: rgba(220,50,50,0.4); }

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
          transition: border-color 0.2s, box-shadow 0.2s, opacity 0.2s;
          padding: 0;
        }
        .tc-shot-cell:hover:not(:disabled) { border-color: rgba(124,58,237,0.5); }
        .tc-shot-cell.active {
          border-color: #7c3aed;
          box-shadow: 0 0 0 2px rgba(124,58,237,0.4);
        }
        .tc-shot-cell.done { border-color: rgba(56,189,248,0.5); }
        .tc-shot-cell:disabled { cursor: not-allowed; }
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
          padding: 0; z-index: 2;
        }

        .tc-footer {
          padding: 14px 24px;
          background: rgba(255,255,255,0.03);
          border-top: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column; gap: 10px;
        }
        .tc-footer-actions {
          display: flex; justify-content: flex-end; gap: 12px; align-items: center;
        }
        .tc-error-banner {
          background: rgba(220,50,50,0.15); border: 1px solid rgba(220,50,50,0.3);
          color: #ff8888; padding: 8px 16px; border-radius: 8px;
          font-size: 0.82rem;
        }

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
