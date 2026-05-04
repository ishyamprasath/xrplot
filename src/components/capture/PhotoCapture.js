'use client';

import { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function PhotoCapture({ onPhotosCaptured, maxPhotos = 8, onClose }) {
  const [photos, setPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [currentDirection, setCurrentDirection] = useState('front');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const directions = [
    { id: 'front', label: 'Front', icon: '🧭' },
    { id: 'back', label: 'Back', icon: '🔄' },
    { id: 'left', label: 'Left', icon: '⬅️' },
    { id: 'right', label: 'Right', icon: '➡️' },
    { id: 'up', label: 'Up', icon: '⬆️' },
    { id: 'down', label: 'Down', icon: '⬇️' }
  ];

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError('Unable to access camera. Please check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCapturing(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      const photo = {
        id: uuidv4(),
        url: URL.createObjectURL(blob),
        blob: blob,
        direction: currentDirection,
        timestamp: new Date().toISOString(),
        file: new File([blob], `photo-${currentDirection}-${Date.now()}.jpg`, { type: 'image/jpeg' })
      };

      setPhotos(prev => [...prev, photo]);
      
      // Auto-advance to next direction
      const currentIndex = directions.findIndex(d => d.id === currentDirection);
      if (currentIndex < directions.length - 1 && photos.length < maxPhotos - 1) {
        setCurrentDirection(directions[currentIndex + 1].id);
      }
    }, 'image/jpeg', 0.9);
  }, [currentDirection, photos.length, maxPhotos]);

  const removePhoto = useCallback((photoId) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo && photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
      return prev.filter(p => p.id !== photoId);
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (photos.length > 0) {
      onPhotosCaptured(photos);
    }
  }, [photos, onPhotosCaptured]);

  const handleRetake = useCallback((direction) => {
    setPhotos(prev => {
      const updated = prev.filter(p => p.direction !== direction);
      return updated;
    });
    setCurrentDirection(direction);
  }, []);

  // Cleanup on unmount
  useState(() => {
    return () => {
      stopCamera();
      photos.forEach(photo => {
        if (photo.url.startsWith('blob:')) {
          URL.revokeObjectURL(photo.url);
        }
      });
    };
  });

  return (
    <div className="photo-capture-modal" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000,
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-default)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
          📸 Capture 360° Photos
        </h2>
        <button className="btn btn-ghost" onClick={onClose}>✕</button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: '24px' }}>
        
        {/* Instructions */}
        <div style={{
          background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Take photos in all directions to create a complete 360° panorama. 
            Current progress: {photos.length}/{maxPhotos} photos
          </p>
        </div>

        {/* Camera View */}
        <div style={{ flex: 1, display: 'flex', gap: '24px' }}>
          
          {/* Video/Preview */}
          <div style={{ flex: 1, position: 'relative' }}>
            {!isCapturing ? (
              <div style={{
                width: '100%', height: '400px', background: 'var(--bg-secondary)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-default)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {cameraError || 'Camera not started'}
                </p>
                <button className="btn btn-primary" onClick={startCamera}>
                  Start Camera
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%', height: '400px' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    borderRadius: 'var(--radius-lg)', border: '2px solid var(--border-default)'
                  }}
                />
                
                {/* Direction Overlay */}
                <div style={{
                  position: 'absolute', top: '16px', left: '16px',
                  background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 16px',
                  borderRadius: 'var(--radius-full)', fontSize: '0.9rem'
                }}>
                  {directions.find(d => d.id === currentDirection)?.icon} {currentDirection}
                </div>

                {/* Capture Button */}
                <button
                  className="btn btn-primary"
                  onClick={capturePhoto}
                  disabled={photos.length >= maxPhotos}
                  style={{
                    position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
                    fontSize: '16px', padding: '12px 24px'
                  }}
                >
                  📸 Capture {directions.find(d => d.id === currentDirection)?.label}
                </button>
              </div>
            )}
          </div>

          {/* Photos Grid */}
          <div style={{ width: '300px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Captured Photos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {directions.map(direction => {
                const photo = photos.find(p => p.direction === direction.id);
                return (
                  <div key={direction.id} style={{
                    position: 'relative', aspectRatio: '1',
                    background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                    border: photo ? '2px solid var(--violet)' : '2px dashed var(--border-default)',
                    overflow: 'hidden'
                  }}>
                    {photo ? (
                      <>
                        <img
                          src={photo.url}
                          alt={direction.label}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute', top: '4px', left: '4px',
                          background: 'rgba(0,0,0,0.7)', color: 'white',
                          padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem'
                        }}>
                          {direction.icon}
                        </div>
                        <button
                          className="btn btn-ghost"
                          onClick={() => removePhoto(photo.id)}
                          style={{
                            position: 'absolute', top: '4px', right: '4px',
                            width: '24px', height: '24px', padding: '0', fontSize: '12px'
                          }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        height: '100%', color: 'var(--text-muted)'
                      }}>
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>{direction.icon}</div>
                        <div style={{ fontSize: '0.7rem' }}>{direction.label}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isCapturing && (
              <button className="btn btn-secondary" onClick={stopCamera}>
                Stop Camera
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={photos.length === 0}
            >
              Use {photos.length} Photo{photos.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
