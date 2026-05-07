'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const WorldCanvas = dynamic(() => import('@/components/canvas/WorldCanvas'), { ssr: false });

export default function WorldEditorPage() {
  const { worldId } = useParams();
  const router = useRouter();
  const [world, setWorld] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const fetchWorld = useCallback(async () => {
    try {
      const res = await fetch(`/api/worlds/${worldId}`);
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setWorld(data);
        } catch (jsonErr) {
          console.error('Invalid JSON response:', text.substring(0, 200));
          console.error('JSON parse error:', jsonErr);
          router.push('/dashboard');
        }
      } else {
        console.error('API response not OK:', res.status, res.statusText);
        const text = await res.text();
        console.error('Response body:', text.substring(0, 200));
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Failed to fetch world:', err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [worldId, router]);

  useEffect(() => {
    fetchWorld();
  }, [fetchWorld]);

  const saveWorld = useCallback(async (updatedData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/worlds/${worldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setWorld(data);
          setLastSaved(new Date());
        } catch (jsonErr) {
          console.error('Invalid JSON response on save:', text.substring(0, 200));
          console.error('JSON parse error:', jsonErr);
        }
      } else {
        console.error('Save API response not OK:', res.status, res.statusText);
        const text = await res.text();
        console.error('Save response body:', text.substring(0, 200));
      }
    } catch (err) {
      console.error('Failed to save world:', err);
    } finally {
      setSaving(false);
    }
  }, [worldId]);

  if (loading) {
    return (
      <div className="canvas-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!world) {
    return (
      <div className="canvas-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p>World not found</p>
      </div>
    );
  }

  return (
    <WorldCanvas
      world={world}
      onSave={saveWorld}
      saving={saving}
      lastSaved={lastSaved}
      onBack={() => router.push('/dashboard')}
      onPreview={() => router.push(`/worlds/${worldId}/preview`)}
      onRefresh={fetchWorld}
    />
  );
}
