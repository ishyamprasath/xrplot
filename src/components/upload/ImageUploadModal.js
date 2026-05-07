'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { compressImage } from '@/utils/imageCompression';

export default function ImageUploadModal({ type, worldId, itemId, existingImages = [], onClose, onComplete }) {
  const [images, setImages] = useState([]); // { file, preview } - Used for edge
  const [nodeImages, setNodeImages] = useState({ // Used for node
    up: [],
    down: [],
    left: [],
    right: [],
    middle: []
  });
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [stitching, setStitching] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  // Camera state
  const [activeCameraDir, setActiveCameraDir] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const minImagesEdge = 1;
  const maxImagesEdge = 4;
  
  const DIRECTIONS = ['up', 'down', 'left', 'right', 'middle'];

  const hasNewImages = type === 'node' 
    ? Object.values(nodeImages).some(arr => arr.length > 0)
    : images.length > 0;

  useEffect(() => {
    let stream = null;

    const initCamera = async () => {
      try {
        // Try environment camera first
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        }).catch(async () => {
          // Fallback to any available camera (fixes desktop issues)
          return await navigator.mediaDevices.getUserMedia({ video: true });
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error(e));
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError('Could not access camera. Please check permissions or try another device.');
        setActiveCameraDir(null);
      }
    };

    if (activeCameraDir) {
      initCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [activeCameraDir]);

  const handleFilesEdge = useCallback((files) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages(prev => {
      const combined = [...prev, ...newImages];
      if (combined.length > maxImagesEdge) {
        setError(`Maximum ${maxImagesEdge} images allowed`);
        return combined.slice(0, maxImagesEdge);
      }
      setError('');
      return combined;
    });
  }, [maxImagesEdge]);

  const handleDropEdge = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFilesEdge(e.dataTransfer.files);
  }, [handleFilesEdge]);

  const removeImageEdge = (index) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
    setError('');
  };

  const handleNodeFiles = useCallback((dir, files) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    
    setNodeImages(prev => {
      const combined = [...prev[dir], ...newImages];
      if (combined.length > 5) {
        setError(`Maximum 5 images allowed for ${dir}`);
        return { ...prev, [dir]: combined.slice(0, 5) };
      }
      setError('');
      return { ...prev, [dir]: combined };
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

  const startCamera = (dir) => {
    setActiveCameraDir(dir);
    setError('');
  };

  const stopCamera = () => {
    setActiveCameraDir(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !activeCameraDir) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Fallback to client dimensions if video metadata isn't fully loaded
    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 480;

    if (!width || !height) {
      setError("Camera feed is not ready yet.");
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);
    
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Failed to capture photo. Try again.");
        return;
      }
      const file = new File([blob], `capture_${activeCameraDir}_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const newImage = {
        file,
        preview: URL.createObjectURL(file),
      };
      
      setNodeImages(prev => {
        const combined = [...prev[activeCameraDir], newImage];
        if (combined.length > 5) {
          setError(`Maximum 5 images allowed for ${activeCameraDir}`);
          return { ...prev, [activeCameraDir]: combined.slice(0, 5) };
        }
        return { ...prev, [activeCameraDir]: combined };
      });
    }, 'image/jpeg', 0.9);
  };

  const handleUpload = async () => {
    if (type === 'node') {
      const invalidDirs = Object.entries(nodeImages).filter(([dir, imgs]) => imgs.length < 2);
      if (invalidDirs.length > 0) {
        setError(`Please provide at least 2 images for: ${invalidDirs.map(d => d[0]).join(', ')}`);
        return;
      }
    } else {
      if (images.length < minImagesEdge) {
        setError(`Please upload at least ${minImagesEdge} images`);
        return;
      }
    }

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const formData = new FormData();
      
      if (type === 'node') {
        const allNodeImages = Object.values(nodeImages).flat();
        for (const img of allNodeImages) {
          const compressedFile = await compressImage(img.file);
          formData.append('images', compressedFile);
        }
      } else {
        for (const img of images) {
          const compressedFile = await compressImage(img.file);
          formData.append('images', compressedFile);
        }
      }

      const endpoint = type === 'node'
        ? `/api/worlds/${worldId}/nodes/${itemId}/images`
        : `/api/worlds/${worldId}/edges/${itemId}/images`;

      const res = await fetch(endpoint, { method: 'POST', body: formData });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        } else {
          if (res.status === 413) {
            throw new Error('Images are still too large for deployment limits. Please upload fewer images.');
          }
          throw new Error('Upload failed with status ' + res.status);
        }
      }

      setProgress(100);

      if (type === 'node') {
        setUploading(false);
        await handleAnalyze();
      } else {
        onComplete();
      }
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch(`/api/worlds/${worldId}/nodes/${itemId}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError('Analysis: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStitch = async () => {
    setStitching(true);
    setError('');
    try {
      const res = await fetch(`/api/worlds/${worldId}/nodes/${itemId}/stitch`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Stitching failed');
      }
      onComplete();
    } catch (err) {
      setError('Stitching: ' + err.message);
    } finally {
      setStitching(false);
    }
  };

  const isProcessing = uploading || analyzing || stitching;

  return (
    <div className="modal-overlay" onClick={!isProcessing && !activeCameraDir ? onClose : undefined}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>{type === 'node' ? 'Files (Upload / Capture)' : 'Upload Transition Images'}</h2>
          {!isProcessing && !activeCameraDir && <button className="modal-close" onClick={onClose}>×</button>}
        </div>

        {activeCameraDir ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', alignItems: 'center' }}>
            <h3 style={{ textTransform: 'capitalize', fontSize: '1.2rem' }}>Capture for {activeCameraDir}</h3>
            <div style={{ position: 'relative', width: '100%', maxWidth: 500, backgroundColor: '#000', borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button className="btn btn-secondary" onClick={stopCamera}>Done</button>
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
            {error && (
              <p style={{ color: 'var(--red-light)', fontSize: '0.85rem', marginTop: 'var(--space-sm)' }}>
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
              {type === 'node'
                ? `Please provide images for all 5 directions (Up, Down, Left, Right, Middle). Minimum 2 and maximum 5 per direction.`
                : `Upload ${minImagesEdge}-${maxImagesEdge} photos of the connecting area (doorway, hallway, path) between the two spaces.`
              }
            </p>

            {/* Existing images */}
            {existingImages.length > 0 && !hasNewImages && (
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                  Currently uploaded: {existingImages.length} images
                </p>
                <div className="upload-preview-grid">
                  {existingImages.map((img, i) => (
                    <div key={i} className="upload-preview-item">
                      <img src={img.url} alt={`Existing ${i + 1}`} />
                      {img.classification && (
                        <span style={{
                          position: 'absolute', bottom: 2, left: 2, right: 2,
                          background: 'rgba(0,0,0,0.8)', color: 'var(--cyan-light)',
                          fontSize: '0.6rem', padding: '2px 4px', borderRadius: 4, textAlign: 'center'
                        }}>
                          {img.classification}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Node UI */}
            {type === 'node' && !isProcessing && !analysis && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {DIRECTIONS.map(dir => (
                  <div key={dir} className="direction-section" style={{ border: '1px solid var(--border-subtle)', padding: 'var(--space-md)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                      <h4 style={{ textTransform: 'capitalize', margin: 0, fontSize: '1rem' }}>{dir}</h4>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <label className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', margin: 0 }}>
                          Upload
                          <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleNodeFiles(dir, e.target.files)} />
                        </label>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', margin: 0 }} onClick={() => startCamera(dir)}>
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
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>0/5 images (minimum 2)</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Edge UI Drop zone */}
            {type !== 'node' && !isProcessing && !analysis && (
              <>
                <div
                  className={`upload-zone ${dragging ? 'dragging' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDropEdge}
                >
                  <div className="upload-zone-icon" style={{ fontSize: '1.8rem', opacity: 0.5 }}>+</div>
                  <p>Drag & drop images here or <span className="highlight">browse files</span></p>
                  <p style={{ fontSize: '0.75rem', marginTop: 8 }}>{minImagesEdge}-{maxImagesEdge} images • JPG, PNG, WebP</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => handleFilesEdge(e.target.files)}
                />
              </>
            )}

            {/* Edge UI Preview grid */}
            {type !== 'node' && images.length > 0 && !analysis && (
              <div className="upload-preview-grid" style={{ marginTop: 'var(--space-md)' }}>
                {images.map((img, i) => (
                  <div key={i} className="upload-preview-item">
                    <img src={img.preview} alt={`Upload ${i + 1}`} />
                    {!isProcessing && (
                      <button className="upload-preview-remove" onClick={() => removeImageEdge(i)}>×</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Progress */}
            {(uploading || analyzing || stitching) && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {uploading ? 'Uploading images...' : analyzing ? 'AI analyzing images...' : 'Stitching panorama...'}
                  </span>
                </div>
                {uploading && (
                  <div className="upload-progress">
                    <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            )}

            {/* Analysis results */}
            {analysis && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)' }}>AI Analysis</h3>
                
                {/* Coverage */}
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Coverage Score:</span>
                    <span style={{ 
                      fontSize: '1.2rem', fontWeight: 700,
                      color: analysis.coverage?.score >= 80 ? 'var(--green-light)' : analysis.coverage?.score >= 50 ? 'var(--amber-light)' : 'var(--red-light)'
                    }}>
                      {analysis.coverage?.score || 0}%
                    </span>
                  </div>
                  {analysis.coverage?.covered?.length > 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--green-light)' }}>
                      Covered: {analysis.coverage.covered.join(', ')}
                    </p>
                  )}
                  {analysis.coverage?.missing?.length > 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--amber-light)' }}>
                      Missing: {analysis.coverage.missing.join(', ')}
                    </p>
                  )}
                </div>

                {/* Classifications */}
                {analysis.classifications && (
                  <div className="analysis-results">
                    {analysis.classifications.map((cls, i) => (
                      <div key={i} className="analysis-item">
                        <span className="analysis-item-label">{cls.direction}</span>
                        <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{cls.description}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round((cls.confidence || 0) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {analysis.coverage?.suggestions?.length > 0 && (
                  <div className="analysis-suggestion">
                    {analysis.coverage.suggestions.join(' • ')}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <p style={{ color: 'var(--red-light)', fontSize: '0.85rem', marginTop: 'var(--space-sm)' }}>
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="modal-actions">
              {!isProcessing && !analysis && (
                <>
                  <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                  
                  {existingImages.length > 0 && !hasNewImages && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        if (type === 'node' && existingImages.length < 10) {
                          setError('Please upload at least 10 images total (minimum 2 per direction) before analyzing.');
                          return;
                        }
                        type === 'node' ? handleAnalyze() : handleStitch();
                      }}
                    >
                      {type === 'node' ? 'Analyze & Continue' : 'Stitch Existing'}
                    </button>
                  )}

                  <button
                    className="btn btn-primary"
                    onClick={handleUpload}
                  >
                    Upload{type === 'node' ? ' & Analyze' : ''}
                  </button>
                </>
              )}
              {analysis && !stitching && (
                <>
                  <button className="btn btn-ghost" onClick={onClose}>Close</button>
                  <button className="btn btn-primary" onClick={handleStitch}>
                    Stitch 360 Panorama
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
