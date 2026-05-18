'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import 'pannellum/build/pannellum.css';

export default function PannellumViewer({ imageUrl, width = '100%', height = '100%', hotspots: hotspotsProp, onHotspotClick }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const hotspots = useMemo(() => hotspotsProp || [], [hotspotsProp]);

  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (typeof window.pannellum !== 'undefined') {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = '/pannellum.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const pannellum = window.pannellum;
    if (!containerRef.current || !imageUrl || !pannellum) return;

    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    // Preload the panorama image so we know exactly when it's ready
    setLoading(true);
    const img = new window.Image();
    let cancelled = false;

    img.onload = () => {
      if (cancelled) return;
      const pannellumHotspots = hotspots.map(hotspot => ({
        pitch: hotspot.pitch || 0,
        yaw: hotspot.yaw || 0,
        type: hotspot.type || 'info',
        text: hotspot.text || '',
        URL: hotspot.url || '',
        sceneId: hotspot.sceneId || '',
        targetPitch: hotspot.targetPitch || 0,
        targetYaw: hotspot.targetYaw || 0,
        clickHandlerFunc: () => {
          if (onHotspotClick) {
            onHotspotClick(hotspot);
          }
        }
      }));

      viewerRef.current = pannellum.viewer(containerRef.current, {
        type: 'equirectangular',
        panorama: img.src,
        autoRotate: -2,
        autoLoad: true,
        compass: true,
        northOffset: 0,
        hotspots: pannellumHotspots,
        sceneFadeIn: 1000,
        minPitch: -85,
        maxPitch: 85,
        minYaw: -180,
        maxYaw: 180,
        hfov: 100,
        pitch: 0,
        yaw: 0,
        loadButton: false,
        showFullscreenCtrl: true,
        showZoomCtrl: true,
        keyboardZoom: true,
        mouseZoom: true,
        draggable: true,
        disableKeyboardCtrl: false,
      });

      setLoading(false);
    };

    img.onerror = () => {
      if (cancelled) return;
      console.error('Failed to load panorama image:', imageUrl);
      setLoading(false);
    };

    img.src = imageUrl;

    return () => {
      cancelled = true;
      img.src = '';
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [imageUrl, hotspots, scriptLoaded]);

  useEffect(() => {
    const pannellum = window.pannellum;
    if (viewerRef.current && hotspots.length > 0 && pannellum) {
      // Remove existing hotspots
      viewerRef.current.removeAllHotSpots();
      
      // Add new hotspots
      hotspots.forEach(hotspot => {
        viewerRef.current.addHotSpot({
          pitch: hotspot.pitch || 0,
          yaw: hotspot.yaw || 0,
          type: hotspot.type || 'info',
          text: hotspot.text || '',
          URL: hotspot.url || '',
          sceneId: hotspot.sceneId || '',
          targetPitch: hotspot.targetPitch || 0,
          targetYaw: hotspot.targetYaw || 0,
          clickHandlerFunc: () => {
            if (onHotspotClick) {
              onHotspotClick(hotspot);
            }
          }
        });
      });
    }
  }, [hotspots, onHotspotClick]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
        className="pannellum-container"
      />
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 5,
          background: 'rgba(0,0,0,0.8)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
            <p style={{ color: 'white', fontSize: '0.85rem' }}>Loading panorama...</p>
          </div>
        </div>
      )}
    </div>
  );
}
