'use client';

import { useEffect, useRef, useState } from 'react';
import 'pannellum/build/pannellum.css';
import pannellum from 'pannellum';

export default function PannellumViewer({ imageUrl, width = '100%', height = '100%', hotspots = [], onHotspotClick }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !imageUrl) return;

    // Clean up previous viewer
    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    // Convert hotspots to Pannellum format
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

    // Initialize Pannellum viewer
    viewerRef.current = pannellum.viewer(containerRef.current, {
      type: 'equirectangular',
      panorama: imageUrl,
      autoRotate: -2, // Auto rotation
      autoLoad: true,
      compass: true,
      northOffset: 0,
      hotspots: pannellumHotspots,
      sceneFadeIn: 1000,
      minPitch: -85,
      maxPitch: 85,
      minYaw: -180,
      maxYaw: 180,
      hfov: 100, // Horizontal field of view
      pitch: 0,
      yaw: 0,
      loadButton: false, // Hide load button
      showFullscreenCtrl: true,
      showZoomCtrl: true,
      keyboardZoom: true,
      mouseZoom: true,
      draggable: true,
      disableKeyboardCtrl: false,
      preview: imageUrl,
      previewTitle: 'Loading...',
      onerror: (err) => {
        console.error('Pannellum error:', err);
        setLoading(false);
      }
    });

    // Handle load event
    const handleLoad = () => {
      setLoading(false);
    };

    // Add event listener for load
    const container = containerRef.current;
    container.addEventListener('load', handleLoad);

    return () => {
      container.removeEventListener('load', handleLoad);
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [imageUrl, hotspots]);

  // Update hotspots when they change
  useEffect(() => {
    if (viewerRef.current && hotspots.length > 0) {
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
          targetYaw: hotspot.targetYaw || 0
        });
      });
    }
  }, [hotspots]);

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
