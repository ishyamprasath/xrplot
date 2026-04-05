'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const WorldViewer = dynamic(() => import('@/components/viewer/WorldViewer'), { ssr: false });

export default function WorldPreviewPage() {
  const { worldId } = useParams();
  const router = useRouter();
  const [world, setWorld] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorld = async () => {
      try {
        const res = await fetch(`/api/worlds/${worldId}`);
        if (res.ok) {
          const data = await res.json();
          setWorld(data);
        }
      } catch (err) {
        console.error('Failed to fetch world:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorld();
  }, [worldId]);

  if (loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: '#000',
      }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!world) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)',
      }}>
        <p>World not found</p>
      </div>
    );
  }

  return <WorldViewer world={world} onExit={() => router.push(`/worlds/${worldId}`)} />;
}
