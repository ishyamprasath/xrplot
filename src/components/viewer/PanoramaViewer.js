'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Generate a procedural gradient texture as fallback so the user never sees a black screen
function createFallbackTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d');

  // Create a pleasant sky-like gradient
  const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, '#0f172a');
  grd.addColorStop(0.4, '#1e293b');
  grd.addColorStop(0.6, '#334155');
  grd.addColorStop(1, '#0f172a');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add some subtle grid lines to suggest a "virtual space"
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 64) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  // Add centered error text
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Panorama Unavailable', canvas.width / 2, canvas.height / 2 - 30);
  ctx.font = '28px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('Image failed to load or is still processing', canvas.width / 2, canvas.height / 2 + 30);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

export default function PanoramaViewer({ imageUrl, hotspots = [], onHotspotClick, width = '100%', height = '100%' }) {
  const mountRef = useRef(null);
  const hotspotsContainerRef = useRef(null);
  const hotspotsRef = useRef(hotspots);
  useEffect(() => { hotspotsRef.current = hotspots; }, [hotspots]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!mountRef.current || !imageUrl) return;

    const container = mountRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x07070f, 1);
    container.appendChild(renderer.domElement);

    // Create sphere
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    let sphere = null;

    // Load texture directly
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    let animationFrameId;

    textureLoader.load(
      imageUrl,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const material = new THREE.MeshBasicMaterial({ map: texture });
        sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        setLoading(false);
        setError(false);
      },
      undefined,
      (error) => {
        console.error('Failed to load panorama texture:', error);
        // Add fallback sphere so user never sees pure black
        const fallbackTexture = createFallbackTexture();
        const fallbackMaterial = new THREE.MeshBasicMaterial({ map: fallbackTexture });
        sphere = new THREE.Mesh(geometry, fallbackMaterial);
        scene.add(sphere);
        setLoading(false);
        setError(true);
      }
    );

    // Mouse/touch controls
    let isPointerDown = false;
    let pointerX = 0;
    let pointerY = 0;
    let lon = 0;
    let lat = 0;
    let phi = 0;
    let theta = 0;

    const onPointerDown = (e) => {
      isPointerDown = true;
      pointerX = e.clientX || e.touches?.[0]?.clientX;
      pointerY = e.clientY || e.touches?.[0]?.clientY;
    };

    const onPointerMove = (e) => {
      if (!isPointerDown) return;
      const clientX = e.clientX || e.touches?.[0]?.clientX;
      const clientY = e.clientY || e.touches?.[0]?.clientY;
      lon += (pointerX - clientX) * 0.2;
      lat += (clientY - pointerY) * 0.2;
      lat = Math.max(-85, Math.min(85, lat));
      pointerX = clientX;
      pointerY = clientY;
    };

    const onPointerUp = () => {
      isPointerDown = false;
    };

    const onWheel = (e) => {
      camera.fov += e.deltaY * 0.05;
      camera.fov = Math.max(30, Math.min(100, camera.fov));
      camera.updateProjectionMatrix();
    };

    container.addEventListener('mousedown', onPointerDown);
    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('mouseup', onPointerUp);
    container.addEventListener('touchstart', onPointerDown);
    container.addEventListener('touchmove', onPointerMove);
    container.addEventListener('touchend', onPointerUp);
    container.addEventListener('wheel', onWheel);

    // Animation loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      phi = THREE.MathUtils.degToRad(90 - lat);
      theta = THREE.MathUtils.degToRad(lon);

      const target = new THREE.Vector3(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(target);
      renderer.render(scene, camera);

      // Render Hotspots (manual DOM update to avoid React thrashing)
      const w = container.clientWidth;
      const h = container.clientHeight;
      const hw = w / 2;
      const hh = h / 2;

      const hotspotData = hotspotsRef.current || [];
      const hotspotDomElements = hotspotsContainerRef.current?.children;

      if (hotspotDomElements && hotspotDomElements.length === hotspotData.length) {
         hotspotData.forEach((hotspot, i) => {
            const el = hotspotDomElements[i];
            const hTheta = hotspot.angle;
            const hPhi = Math.PI / 2;
            
            const vec = new THREE.Vector3(
              400 * Math.sin(hPhi) * Math.cos(hTheta),
              400 * Math.cos(hPhi),
              400 * Math.sin(hPhi) * Math.sin(hTheta)
            );

            vec.project(camera);

            if (vec.z > 1) {
               el.style.display = 'none';
            } else {
               const sx = (vec.x * hw) + hw;
               const sy = -(vec.y * hh) + hh;
               el.style.display = 'flex';
               el.style.transform = `translate(-50%, -50%) translate(${sx}px, ${sy}px)`;
            }
         });
      }
    };
    animate();

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousedown', onPointerDown);
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('touchstart', onPointerDown);
      container.removeEventListener('touchmove', onPointerMove);
      container.removeEventListener('touchend', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      if (sphere) {
        sphere.material?.map?.dispose();
        sphere.material?.dispose();
        sphere.geometry?.dispose();
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [imageUrl]);

  return (
    <div ref={mountRef} className="viewer-container" style={{ width, height, cursor: 'grab', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 5,
          background: '#07070f',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading panorama...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(220, 38, 38, 0.9)', color: 'white',
          padding: '8px 16px', borderRadius: 8, fontSize: '0.8rem',
          zIndex: 20, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          Panorama failed to load. Try re-stitching or check your connection.
        </div>
      )}

      {/* 3D Hotspots Overlays */}
      <div ref={hotspotsContainerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, overflow: 'hidden' }}>
        {hotspots.map((h, i) => (
          <div 
            key={h.id} 
            className="hotspot-3d"
            style={{ 
              position: 'absolute', left: 0, top: 0, 
              pointerEvents: 'auto', cursor: 'pointer',
              display: 'none', flexDirection: 'column', alignItems: 'center', gap: 6,
              transform: 'translate(-50%, -50%)',
              transition: 'opacity 0.2s',
            }}
            onClick={(e) => { e.stopPropagation(); if (onHotspotClick) onHotspotClick(h.id, h.type); }}
          >
            <div style={{ 
               width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', 
               backdropFilter: 'blur(8px)', border: '2px solid white', 
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: 'white', fontWeight: 'bold'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M5 12h14"></path>
                 <path d="m12 5 7 7-7 7"></path>
              </svg>
            </div>
            <div style={{
               background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
               padding: '4px 10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
               fontSize: '0.75rem', fontWeight: 500, color: 'white', whiteSpace: 'nowrap',
               pointerEvents: 'none'
            }}>
               {h.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
