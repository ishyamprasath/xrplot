'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { compressImage } from '@/utils/imageCompression';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

const DIRECTIONS = ['up', 'down', 'left', 'right', 'middle'];

export default function ChatUploadModal({ worldId, nodeId, onClose, onComplete }) {
  const [nodeImages, setNodeImages] = useState({
    up: [], down: [], left: [], right: [], middle: []
  });
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stitching, setStitching] = useState(false);
  const [error, setError] = useState('');
  const [activeCameraDir, setActiveCameraDir] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let stream = null;
    const initCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        }).catch(async () => {
          return await navigator.mediaDevices.getUserMedia({ video: true });
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error(e));
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Could not access camera. Check permissions.');
        setActiveCameraDir(null);
      }
    };
    if (activeCameraDir) initCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [activeCameraDir]);

  const handleNodeFiles = useCallback((dir, files) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setNodeImages(prev => {
      const currentCount = prev[dir].length;
      const remaining = 5 - currentCount;
      if (remaining <= 0) {
        setError(`Maximum 5 images for ${dir}`);
        return prev;
      }
      
      const toAdd = newImages.slice(0, remaining);
      if (newImages.length > remaining) {
        setError(`Added only ${remaining} images. Maximum 5 allowed per direction.`);
      } else {
        setError('');
      }
      
      return { ...prev, [dir]: [...prev[dir], ...toAdd] };
    });
  }, []);

  const removeNodeImage = (dir, index) => {
    setNodeImages(prev => {
      const newImages = [...prev[dir]];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return { ...prev, [dir]: newImages };
    });
    setError('');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !activeCameraDir) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 480;
    if (!width || !height) {
      setError('Camera not ready yet.');
      return;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('Failed to capture photo.');
        return;
      }
      const file = new File([blob], `capture_${activeCameraDir}_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const newImage = { file, preview: URL.createObjectURL(file) };
      setNodeImages(prev => {
        const combined = [...prev[activeCameraDir], newImage];
        if (combined.length > 5) {
          setError(`Maximum 5 images for ${activeCameraDir}`);
          return { ...prev, [activeCameraDir]: combined.slice(0, 5) };
        }
        return { ...prev, [activeCameraDir]: combined };
      });
    }, 'image/jpeg', 0.9);
  };

  const totalImages = Object.values(nodeImages).flat().length;

  const handleUpload = async () => {
    const invalidDirs = Object.entries(nodeImages).filter(([dir, imgs]) => imgs.length < 2);
    if (invalidDirs.length > 0) {
      setError(`Need at least 2 images for: ${invalidDirs.map(d => d[0]).join(', ')}`);
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      const directionsMap = {};
      const allImages = Object.entries(nodeImages).flatMap(([dir, imgs]) => 
        imgs.map(img => ({ ...img, dir }))
      );
      
      for (let i = 0; i < allImages.length; i++) {
        const img = allImages[i];
        const compressedFile = await compressImage(img.file);
        const fileName = `file_${i}_${img.dir}.jpg`;
        const fileWithDir = new File([compressedFile], fileName, { type: 'image/jpeg' });
        formData.append('images', fileWithDir);
        directionsMap[fileName] = img.dir;
      }
      
      formData.append('directions', JSON.stringify(directionsMap));

      const res = await fetch(`/api/worlds/${worldId}/nodes/${nodeId}/images`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      setUploading(false);
      await handleAnalyze();
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/worlds/${worldId}/nodes/${nodeId}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }
      setAnalyzing(false);
      await handleStitch();
    } catch (err) {
      setError('Analysis: ' + err.message);
      setAnalyzing(false);
    }
  };

  const handleStitch = async () => {
    setStitching(true);
    try {
      const res = await fetch(`/api/worlds/${worldId}/nodes/${nodeId}/stitch`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Stitching failed');
      }
      onComplete();
    } catch (err) {
      setError('Stitching: ' + err.message);
      setStitching(false);
    }
  };

  const isProcessing = uploading || analyzing || stitching;

  return (
    <div className="modal-overlay" onClick={!isProcessing && !activeCameraDir ? onClose : undefined}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>Upload Node Images</h2>
          {!isProcessing && !activeCameraDir && (
            <button className="modal-close" onClick={onClose}><X size={18} /></button>
          )}
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
          Provide images for all 5 directions. Minimum 2 and maximum 5 per direction.
        </p>

        {activeCameraDir ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', alignItems: 'center' }}>
            <h3 style={{ textTransform: 'capitalize', fontSize: '1.1rem' }}>Capture for {activeCameraDir}</h3>
            <div style={{ position: 'relative', width: '100%', maxWidth: 480, backgroundColor: '#000', borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button className="btn btn-secondary" onClick={() => setActiveCameraDir(null)}>Done</button>
              <button className="btn btn-primary" onClick={capturePhoto}>Snap Photo</button>
            </div>
            {nodeImages[activeCameraDir].length > 0 && (
              <div className="upload-preview-grid" style={{ alignSelf: 'stretch' }}>
                {nodeImages[activeCameraDir].map((img, i) => (
                  <div key={i} className="upload-preview-item">
                    <img src={img.preview} alt={`${activeCameraDir} ${i + 1}`} />
                    <button className="upload-preview-remove" onClick={() => removeNodeImage(activeCameraDir, i)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {DIRECTIONS.map(dir => (
              <div key={dir} style={{ border: '1px solid var(--border-subtle)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                  <h4 style={{ textTransform: 'capitalize', margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{dir}</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', margin: 0 }}>
                      <Upload size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      Upload
                      <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleNodeFiles(dir, e.target.files)} />
                    </label>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', margin: 0 }} onClick={() => { setError(''); setActiveCameraDir(dir); }}>
                      <Camera size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      Capture
                    </button>
                  </div>
                </div>
                {nodeImages[dir].length > 0 ? (
                  <div className="upload-preview-grid">
                    {nodeImages[dir].map((img, i) => (
                      <div key={i} className="upload-preview-item">
                        <img src={img.preview} alt={`${dir} ${i + 1}`} />
                        <button className="upload-preview-remove" onClick={() => removeNodeImage(dir, i)}>×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>0/5 images (min 2)</p>
                )}
              </div>
            ))}
          </div>
        )}

        {isProcessing && (
          <div style={{ marginTop: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <Loader2 size={18} className="spinner" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {uploading ? 'Uploading...' : analyzing ? 'AI analyzing...' : 'Stitching panorama...'}
            </span>
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--red-light)', fontSize: '0.85rem', marginTop: 'var(--space-sm)' }}>
            {error}
          </p>
        )}

        {!activeCameraDir && !isProcessing && (
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpload}>
              Upload & Process ({totalImages} images)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
