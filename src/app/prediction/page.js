'use client';

import { Suspense, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Autocomplete, Marker, Polygon } from '@react-google-maps/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Search, Loader2, TrendingUp, Building2, Activity } from 'lucide-react';

const libraries = ['places'];
const mapContainerStyle = { width: '100%', height: '100vh' };
const defaultCenter = { lat: 11.0168, lng: 76.9558 };

const getBoundingBox = (lat, lng) => {
  const dLat = 0.00225;
  const dLng = 0.00225 / Math.cos(lat * Math.PI / 180);
  return [
    { lat: lat + dLat, lng: lng - dLng },
    { lat: lat + dLat, lng: lng + dLng },
    { lat: lat - dLat, lng: lng + dLng },
    { lat: lat - dLat, lng: lng - dLng }
  ];
};

function PredictionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const worldId = searchParams.get('worldId');

  const [map, setMap] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [pin, setPin] = useState(null);
  const [placeName, setPlaceName] = useState('Selected Location');
  const [loading, setLoading] = useState(false);
  const [predictionData, setPredictionData] = useState(null);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const onLoad = useCallback(function callback(map) { setMap(map); }, []);
  const onUnmount = useCallback(function callback(map) { setMap(null); }, []);

  const onMapClick = useCallback((e) => {
    setPin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    setPlaceName('Pinned Location');
    setPredictionData(null);
  }, []);

  const onAutocompleteLoad = (autocompleteObj) => { setAutocomplete(autocompleteObj); };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const newCenter = { lat, lng };
        map.panTo(newCenter);
        map.setZoom(16);
        setPin(newCenter);
        setPlaceName(place.name || place.formatted_address || 'Selected Location');
        setPredictionData(null);
      }
    }
  };

  const handleGenerate = async () => {
    if (!pin) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/prediction/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pin.lat, lng: pin.lng, worldId, placeName })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate prediction');
      
      setPredictionData(data);
    } catch (err) {
      console.error(err);
      alert('Error generating prediction: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar Controls */}
      <div style={{ width: '400px', height: '100%', backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', padding: '24px', zIndex: 10, boxShadow: '4px 0 24px rgba(0,0,0,0.5)', overflowY: 'auto' }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '32px', padding: 0 }}>
          <ArrowLeft size={16} /> Back to Editor
        </button>

        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>Decade 2.0 Engine</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>
          Extract 10-year time series from Google Earth Engine, analyze urban sprawl, and generate an interconnected 3D prediction of this neighborhood for 2036.
        </p>

        {isLoaded && !predictionData ? (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Search Location
            </label>
            <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Enter a place name..." style={{ width: '100%', padding: '12px 12px 12px 36px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
            </Autocomplete>
          </div>
        ) : null}

        {!predictionData && (
          <div style={{ flex: 1 }}>
             {!pin && <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Click on the map to select the exact location footprint.</p>}
             {pin && (
               <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                 <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>Analysis Zone Selected</h3>
                 <p style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Lat: {pin.lat.toFixed(6)} | Lng: {pin.lng.toFixed(6)}</p>
                 <p style={{ fontSize: '12px', color: 'var(--violet)', marginTop: '8px', fontWeight: 'bold' }}>500m bounding box active</p>
               </div>
             )}
          </div>
        )}

        {predictionData && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} /> Prediction Complete
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Growth Confidence: {(predictionData.confidence * 100).toFixed(1)}%</p>
            </div>

            {/* Comprehensive Summary */}
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={14} /> Past 10 Years (2016-2026)
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.5', marginBottom: '16px' }}>
                {predictionData.summary.past}
              </p>

              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--violet)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} /> Next 10 Years (2026-2036)
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                {predictionData.summary.future}
              </p>
            </div>

            <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>Predicted World Created</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Successfully generated a new predicted world with <strong style={{ color: 'white' }}>{predictionData.nodesAdded} immersive nodes</strong> representing the futuristic streets, hospitals, and infrastructure of {placeName}.
              </p>
            </div>
            
            <button
              onClick={() => predictionData.predictedWorldId ? router.push(`/worlds/${predictionData.predictedWorldId}`) : router.back()}
              style={{ width: '100%', padding: '14px', backgroundColor: 'white', color: 'black', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}
            >
              Open Predicted World
            </button>
          </div>
        )}

        {!predictionData && (
          <button
            onClick={handleGenerate}
            disabled={!pin || loading}
            style={{ width: '100%', padding: '14px', backgroundColor: (!pin || loading) ? 'var(--bg-primary)' : 'white', color: (!pin || loading) ? 'var(--text-muted)' : 'black', border: `1px solid ${(!pin || loading) ? 'var(--border-subtle)' : 'black'}`, borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: (!pin || loading) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '24px' }}
          >
            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing GEE Neural Nets...</> : "Generate 2036 Future World"}
          </button>
        )}
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {isLoaded ? (
          <GoogleMap mapContainerStyle={mapContainerStyle} center={defaultCenter} zoom={13} onLoad={onLoad} onUnmount={onUnmount} onClick={onMapClick} options={{ mapTypeId: 'hybrid', disableDefaultUI: true, zoomControl: true }}>
            {pin && (
              <>
                <Marker position={pin} />
                <Polygon paths={getBoundingBox(pin.lat, pin.lng)} options={{ fillColor: '#7c3aed', fillOpacity: 0.2, strokeColor: '#7c3aed', strokeOpacity: 0.8, strokeWeight: 2 }} />
              </>
            )}
          </GoogleMap>
        ) : (
           <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
             <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
           </div>
        )}
      </div>
    </div>
  );
}

export default function PredictionPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading prediction...</div>}>
      <PredictionInner />
    </Suspense>
  );
}
