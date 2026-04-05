'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function PanoramaViewer({ imageUrl, width = '100%', height = '100%' }) {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current || !imageUrl) return;

    const container = mountRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create sphere with equirectangular texture
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // Invert to render inside

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      imageUrl,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        setLoading(false);
      },
      undefined,
      (error) => {
        console.error('Failed to load panorama texture:', error);
        setLoading(false);
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
      animationFrameRef.current = requestAnimationFrame(animate);

      phi = THREE.MathUtils.degToRad(90 - lat);
      theta = THREE.MathUtils.degToRad(lon);

      const target = new THREE.Vector3(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(target);
      renderer.render(scene, camera);
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
      cancelAnimationFrame(animationFrameRef.current);
      container.removeEventListener('mousedown', onPointerDown);
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('touchstart', onPointerDown);
      container.removeEventListener('touchmove', onPointerMove);
      container.removeEventListener('touchend', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [imageUrl]);

  return (
    <div ref={mountRef} className="viewer-container" style={{ width, height, cursor: 'grab' }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 5,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading panorama...</p>
          </div>
        </div>
      )}
    </div>
  );
}
