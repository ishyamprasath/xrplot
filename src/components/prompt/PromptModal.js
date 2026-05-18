'use client';

import { useState, useRef } from 'react';
import { Wand2, Paperclip, Undo2, RefreshCw, Pencil, X, Loader2, Image as ImageIcon, Sparkles, ChevronRight } from 'lucide-react';
import { compressImage } from '@/utils/imageCompression';

export default function PromptModal({ worldId, nodeData, onClose, onComplete }) {
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [globalRefImage, setGlobalRefImage] = useState(null);
  
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageRef, setImageRef] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [error, setError] = useState('');
  
  const globalFileInputRef = useRef(null);
  const imageFileInputRef = useRef(null);
  
  const existingImages = nodeData?.images || [];
  const hasPanorama = !!nodeData?.panoramaUrl;

  const handleGlobalFile = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => setGlobalRefImage({ file, dataUrl: event.target.result });
      reader.readAsDataURL(file);
    }
  };

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => setImageRef({ file, dataUrl: event.target.result });
      reader.readAsDataURL(file);
    }
  };

  const submitPrompt = async (promptText, refImg, targetUrl, targetIndex) => {
    if (!promptText.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    if (!targetUrl) {
      setError('No target image available to edit.');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('prompt', promptText);
      formData.append('targetImageUrl', targetUrl);
      formData.append('targetImageIndex', targetIndex);
      if (refImg?.file) {
        const compressedRef = await compressImage(refImg.file);
        formData.append('referenceImage', compressedRef);
      }

      const res = await fetch(`/api/worlds/${worldId}/nodes/${nodeData.nodeId}/prompt`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to generate image');
        } else {
          if (res.status === 413) {
            throw new Error('Reference image is too large for deployment limits.');
          }
          throw new Error('Failed to generate image, status: ' + res.status);
        }
      }

      await onComplete();
    } catch (err) {
      console.error('Prompt err:', err);
      setError(err.message || 'An error occurred during generation');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevert = async (targetIndex) => {
    if (!confirm('Are you sure you want to revert to the original image? All AI edits will be lost.')) return;
    setReverting(true);
    setError('');
    try {
      const res = await fetch(`/api/worlds/${worldId}/nodes/${nodeData.nodeId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetIndex }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Revert failed');
      }
      await onComplete();
    } catch (err) {
      setError(err.message || 'Failed to revert');
    } finally {
      setReverting(false);
    }
  };

  const handleStitch = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/worlds/${worldId}/nodes/${nodeData.nodeId}/stitch`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Stitching failed');
      }
      await onComplete();
    } catch (err) {
      setError('Stitching: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const isProcessing = generating || reverting;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 5, 12, 0.8)', backdropFilter: 'blur(12px)' }}>
      <div className="modal-content premium-modal" onClick={e => e.stopPropagation()} style={{ 
        maxWidth: '750px', width: '92%', padding: '0', position: 'relative', maxHeight: '90vh', overflowY: 'auto',
        background: 'rgba(15, 15, 25, 0.75)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
      }}>
        
        {/* Glow Header Background */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(180deg, rgba(124, 58, 237, 0.15) 0%, transparent 100%)', pointerEvents: 'none', borderRadius: '24px 24px 0 0' }} />

        {/* Loading Overlay */}
        {isProcessing && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 10, 15, 0.85)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit', color: 'white', backdropFilter: 'blur(10px)' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: 'var(--violet)', borderRightColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ position: 'absolute', inset: '8px', background: 'rgba(124, 58, 237, 0.2)', borderRadius: '50%', filter: 'blur(8px)' }} />
              <Wand2 size={28} style={{ color: 'white', animation: 'pulse 2s infinite' }} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 8px 0', background: 'linear-gradient(to right, #a78bfa, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {reverting ? 'Reverting Changes' : 'AI is Generating'}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>Please wait while we process the image</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } } @keyframes pulse { 50% { opacity: 0.5; transform: scale(0.95); } } `}</style>
          </div>
        )}

        <div style={{ padding: '32px' }}>
          {/* Close */}
          <button onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, background: '#ffffff', border: '1.5px solid #1a1a2e', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a2e', transition: 'all 0.2s', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <X size={16} />
          </button>
          
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', position: 'relative', zIndex: 2 }}>
            <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.8), rgba(6, 182, 212, 0.8))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)' }}>
              <Sparkles size={24} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px 0', letterSpacing: '-0.5px', color: '#fff' }}>AI Visual Studio</h2>
              <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>Transform and refine your 360° spaces with intelligent prompting.</p>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '12px 16px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <span style={{ fontWeight: 600 }}>Error:</span> {error}
            </div>
          )}

          {/* === Global 360 Editor === */}
          <div style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', padding: '24px', borderRadius: '16px', marginBottom: '28px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(167, 139, 250, 0.15)', padding: '6px', borderRadius: '8px', color: '#a78bfa' }}>
                <ImageIcon size={18} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: '#e5e7eb' }}>Global Panorama Edit</h3>
            </div>

            <textarea 
              value={globalPrompt} onChange={e => setGlobalPrompt(e.target.value)}
              placeholder="e.g. Transform this room into a futuristic neon lounge..."
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginBottom: '16px', resize: 'vertical', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', outline: 'none', transition: 'border 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(167, 139, 250, 0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              disabled={isProcessing} rows={3}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="file" ref={globalFileInputRef} onChange={handleGlobalFile} accept="image/*" style={{ display: 'none' }} />
                <button 
                  onClick={() => !isProcessing && globalFileInputRef.current?.click()} 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e5e7eb', fontSize: '0.85rem', cursor: isProcessing ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => {if(!isProcessing) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}}
                  onMouseOut={(e) => {if(!isProcessing) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}}
                >
                  <Paperclip size={14} /> {globalRefImage ? 'Change Ref' : 'Add Ref Image'}
                </button>
                {globalRefImage && <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 500 }}>Reference Attached</span>}

                {/* Revert Button for Global Panorama */}
                {nodeData?.originalPanoramaUrl && (
                  <button 
                    onClick={() => handleRevert('panorama')} 
                    disabled={isProcessing} 
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', color: '#fcd34d', fontSize: '0.85rem', cursor: isProcessing ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => {if(!isProcessing) { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(245,158,11,0.2)'; }}}
                    onMouseOut={(e) => {if(!isProcessing) { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'; e.currentTarget.style.boxShadow = 'none'; }}}
                    title="Undo AI edit and revert to the original image"
                  >
                    <Undo2 size={14} /> Revert
                  </button>
                )}
              </div>

              <button 
                onClick={() => submitPrompt(globalPrompt, globalRefImage, nodeData.panoramaUrl || (existingImages[0]?.url || 'none'), 'panorama')}
                disabled={isProcessing || !globalPrompt.trim() || (!hasPanorama && existingImages.length === 0)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'linear-gradient(to right, #7c3aed, #6d28d9)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: (isProcessing || !globalPrompt.trim() ) ? 'not-allowed' : 'pointer', opacity: (isProcessing || !globalPrompt.trim() ) ? 0.5 : 1, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)', transition: 'all 0.2s' }}
                onMouseOver={(e) => {if(!isProcessing && globalPrompt.trim()) e.currentTarget.style.transform = 'translateY(-2px)'}}
                onMouseOut={(e) => {if(!isProcessing) e.currentTarget.style.transform = 'translateY(0)'}}
              >
                Let's Generate <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* === Individual Image Editor === */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingLeft: '8px' }}>
            <Pencil size={16} style={{ color: '#67e8f9' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: '#e5e7eb' }}>Target Specific Views</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {existingImages.length === 0 && !hasPanorama && (
              <div style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>
                No segment images available. Upload photos first.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {existingImages.map((img, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', overflow: 'hidden', border: activeImageIndex === idx ? '1px solid rgba(124, 58, 237, 0.5)' : '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s', boxShadow: activeImageIndex === idx ? '0 0 20px rgba(124, 58, 237, 0.15)' : 'none' }}>
                  <div style={{ position: 'relative', height: '160px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => { setActiveImageIndex(activeImageIndex === idx ? null : idx); setImagePrompt(''); setImageRef(null); }}>
                    <img src={img.url} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }} onMouseOver={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'} alt={`Segment ${idx + 1}`} />
                    
                    {/* Dark gradient overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)', pointerEvents: 'none' }} />

                    {/* Highly stylized badge */}
                    {img.originalUrl && (
                      <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(217,70,239,0.9)', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px', boxShadow: '0 2px 10px rgba(217,70,239,0.4)', border: '1px solid rgba(255,255,255,0.2)' }}>
                        AI MODIFIED
                      </span>
                    )}
                    
                    <div style={{ position: 'absolute', bottom: 12, left: 12, color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                      View {idx + 1}
                    </div>

                    <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      {img.originalUrl && (
                        <button 
                          onClick={() => handleRevert(idx)}
                          disabled={isProcessing}
                          style={{ background: 'rgba(30, 30, 40, 0.8)', backdropFilter: 'blur(4px)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                          title="Revert to original"
                          onMouseOver={e=>e.currentTarget.style.background='rgba(245, 158, 11, 0.2)'}
                          onMouseOut={e=>e.currentTarget.style.background='rgba(30, 30, 40, 0.8)'}
                        >
                          <Undo2 size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => { setActiveImageIndex(activeImageIndex === idx ? null : idx); setImagePrompt(''); setImageRef(null); }}
                        style={{ background: activeImageIndex === idx ? 'var(--violet)' : 'rgba(30, 30, 40, 0.8)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                        title="Edit this view"
                      >
                        <Wand2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {activeImageIndex === idx && (
                    <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <textarea 
                        value={imagePrompt} onChange={e => setImagePrompt(e.target.value)}
                        placeholder="e.g. Add a sleek modern sofa..."
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginBottom: '12px', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', outline: 'none', transition: 'border 0.2s' }}
                        onFocus={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        disabled={isProcessing} rows={2}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="file" ref={imageFileInputRef} onChange={handleImageFile} accept="image/*" style={{ display: 'none' }} />
                          <button onClick={() => !isProcessing && imageFileInputRef.current?.click()} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <Paperclip size={12} /> Ref
                          </button>
                          {imageRef && <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 500 }}>Attached</span>}
                        </div>
                        <button 
                          onClick={() => submitPrompt(imagePrompt, imageRef, img.url, idx)}
                          disabled={isProcessing || !imagePrompt.trim()}
                          style={{ padding: '6px 14px', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.8), rgba(56, 189, 248, 0.8))', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: (isProcessing || !imagePrompt.trim()) ? 'not-allowed' : 'pointer', opacity: (isProcessing || !imagePrompt.trim()) ? 0.5 : 1, transition: 'transform 0.2s' }}
                        >
                          <Sparkles size={12} /> Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {existingImages.length > 0 && (
              <div style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.4))', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', marginTop: '16px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 60%)', pointerEvents: 'none' }} />
                <h4 style={{ marginBottom: '8px', fontSize: '1.1rem', fontWeight: 700, color: '#f3f4f6' }}>Finalize Modifications</h4>
                <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px auto' }}>Combine your freshly edited individual segments back into a seamless 360° panoramic view.</p>
                <button 
                  onClick={handleStitch} 
                  disabled={isProcessing} 
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 28px', background: 'linear-gradient(to right, #10b981, #059669)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '0.95rem', fontWeight: 600, gap: '8px', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.5 : 1, boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)', transition: 'transform 0.2s', position: 'relative', zIndex: 2 }}
                >
                  <RefreshCw size={16} /> Re-Stitch Panorama
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

