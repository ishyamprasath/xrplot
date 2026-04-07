'use client';

import { useState, useRef, useCallback } from 'react';

export default function ImageUploadModal({ type, worldId, itemId, existingImages = [], onClose, onComplete }) {
  const [images, setImages] = useState([]); // { file, preview }
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [stitching, setStitching] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const minImages = type === 'node' ? 6 : 1;
  const maxImages = type === 'node' ? 20 : 4;

  const handleFiles = useCallback((files) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages(prev => {
      const combined = [...prev, ...newImages];
      if (combined.length > maxImages) {
        setError(`Maximum ${maxImages} images allowed`);
        return combined.slice(0, maxImages);
      }
      setError('');
      return combined;
    });
  }, [maxImages]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = (index) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
    setError('');
  };

  const handleUpload = async () => {
    if (images.length < minImages) {
      setError(`Please upload at least ${minImages} images`);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const formData = new FormData();
      images.forEach(img => formData.append('images', img.file));

      const endpoint = type === 'node'
        ? `/api/worlds/${worldId}/nodes/${itemId}/images`
        : `/api/worlds/${worldId}/edges/${itemId}/images`;

      const res = await fetch(endpoint, { method: 'POST', body: formData });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      setProgress(100);

      // If it's a node, offer to analyze
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
    <div className="modal-overlay" onClick={!isProcessing ? onClose : undefined}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <h2>{type === 'node' ? 'Upload Space Images' : 'Upload Transition Images'}</h2>
          {!isProcessing && <button className="modal-close" onClick={onClose}>×</button>}
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
          {type === 'node'
            ? `Upload ${minImages}-${maxImages} photos covering all angles of the space. Capture front, back, left, right, ceiling, and floor for best results.`
            : `Upload ${minImages}-${maxImages} photos of the connecting area (doorway, hallway, path) between the two spaces.`
          }
        </p>

        {/* Existing images */}
        {existingImages.length > 0 && !images.length && (
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

        {/* Drop zone */}
        {!isProcessing && !analysis && (
          <>
            <div
              className={`upload-zone ${dragging ? 'dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="upload-zone-icon" style={{ fontSize: '1.8rem', opacity: 0.5 }}>+</div>
              <p>Drag & drop images here or <span className="highlight">browse files</span></p>
              <p style={{ fontSize: '0.75rem', marginTop: 8 }}>{minImages}-{maxImages} images • JPG, PNG, WebP</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
          </>
        )}

        {/* Preview grid */}
        {images.length > 0 && !analysis && (
          <div className="upload-preview-grid" style={{ marginTop: 'var(--space-md)' }}>
            {images.map((img, i) => (
              <div key={i} className="upload-preview-item">
                <img src={img.preview} alt={`Upload ${i + 1}`} />
                {!isProcessing && (
                  <button className="upload-preview-remove" onClick={() => removeImage(i)}>×</button>
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
              
              {existingImages.length >= minImages && images.length === 0 && (
                <button
                  className="btn btn-secondary"
                  onClick={type === 'node' ? handleAnalyze : handleStitch}
                >
                  {type === 'node' ? 'Analyze & Continue' : 'Stitch Existing'}
                </button>
              )}

              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={images.length < minImages}
                style={{ display: images.length > 0 ? 'inline-block' : 'none' }}
              >
                Upload{type === 'node' ? ' & Analyze' : ''}
                <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: 4 }}>
                  ({images.length}/{minImages} min)
                </span>
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
      </div>
    </div>
  );
}
