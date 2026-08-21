'use client';

import { Suspense, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Autocomplete, Marker, Polygon } from '@react-google-maps/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Search, Loader2, TrendingUp, Leaf, Activity, Thermometer, Droplets, Wind } from 'lucide-react';
import EarthCharts from '@/components/EarthCharts';

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
      if (!res.ok) throw new Error(data.details || data.error || 'Failed to generate prediction');
      
      setPredictionData(data);
    } catch (err) {
      console.error(err);
      alert('Error generating Earth prediction: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prediction-container" style={{ display: 'flex', width: '100%', height: 'calc(100vh - 65px)', backgroundColor: 'var(--bg-primary)' }}>
      <div className="prediction-sidebar" style={{ width: '420px', minWidth: '420px', height: '100%', backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', padding: '24px', zIndex: 10, boxShadow: 'var(--shadow-lg)', overflowY: 'auto' }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          <ArrowLeft size={16} /> Back to Editor
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
          <span style={{ background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', padding:'4px 8px', borderRadius:'6px', fontSize:'10px', fontWeight:900, letterSpacing:'0.8px' }}>AI 4 EARTH</span>
          <span style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:700 }}>HACKATHON ENTRY</span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '6px', color: 'var(--text-primary)', lineHeight:1.1 }}>
          🌍 EARTH LENS <span style={{ color:'#10b981' }}>2036</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px', lineHeight:1.5 }}>
          See your street in a <strong style={{color:'var(--text-primary)'}}>+2°C world</strong>. GEE satellites track NDVI/NDBI/LST for 10 years, Gemini predicts dystopia vs green future, AI panoramas make it <em>feel</em> real.
        </p>

        {isLoaded && !predictionData ? (
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Search Any Location on Earth
            </label>
            <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Try: Delhi, Chennai, Kochi..." style={{ width: '100%', padding: '12px 12px 12px 36px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
            </Autocomplete>
          </div>
        ) : null}

        {!predictionData && (
          <div style={{ flex: 1 }}>
             {!pin && <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>📍 Click on the satellite map to plant your Earth probe. 500m zone will be eco-scanned.</p>}
             {pin && (
               <div style={{ padding: '14px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.3)' }}>
                 <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#10b981', display:'flex', alignItems:'center', gap:'6px' }}><Leaf size={14}/> Probe Planted — Eco-Scan Ready</h3>
                 <p style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Lat: {pin.lat.toFixed(6)} | Lng: {pin.lng.toFixed(6)}</p>
                 <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>NDVI + NDBI + LST time-series • 500m bounding box • {placeName}</p>
               </div>
             )}
          </div>
        )}

        {predictionData && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '14px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Leaf size={18} /> Earth Twin Created
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Eco-Confidence: {(predictionData.confidence * 100).toFixed(1)}% • {predictionData.nodesAdded} immersive eco-nodes</p>
              {predictionData.summary?.simulation && (
                <p style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'6px', fontFamily:'monospace' }}>
                  NDVI {predictionData.summary.simulation.ndviTrend?.[0]?.toFixed(2)}→{predictionData.summary.simulation.ndviTrend?.slice(-1)[0]?.toFixed(2)} • LST +{(predictionData.summary.simulation.lstTrend.slice(-1)[0]-predictionData.summary.simulation.lstTrend[0]).toFixed(1)}°C • Green {predictionData.summary.simulation.greenCover}%
                </p>
              )}
            </div>

            <div style={{ padding: '14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} /> Past 10 Years (2016-2026)
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5', marginBottom: '14px' }}>
                {predictionData.summary.past}
              </p>
              <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#ef4444', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Thermometer size={14} /> Dystopia 2036 — If We Do Nothing
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5', marginBottom: '14px', background:'rgba(239,68,68,0.06)', padding:'8px', borderRadius:'6px', borderLeft:'3px solid #ef4444' }}>
                {predictionData.summary.dystopia || predictionData.summary.future}
              </p>
              <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Leaf size={14} /> Green Future 2036 — If We Act Now
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5', background:'rgba(16,185,129,0.08)', padding:'8px', borderRadius:'6px', borderLeft:'3px solid #10b981' }}>
                {predictionData.summary.hope || 'Miyawaki forests, cool roofs & lake revival cool 2.2°C, save tons of CO₂, cut floods by 60%.'}
              </p>
            </div>

            {predictionData.summary?.simulation && (
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <EarthCharts simulation={predictionData.summary.simulation} ecoReport={predictionData.summary.ecoReport} />
              </div>
            )}

            {predictionData.summary?.insights?.length > 0 && (
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>AI Climate Insights</h4>
                {predictionData.summary.insights.map((ins,i)=>(
                  <p key={i} style={{ fontSize:'12px', color:'var(--text-secondary)', marginBottom:'6px', display:'flex', gap:'6px' }}><span style={{color:'#10b981'}}>•</span> <span>{ins}</span></p>
                ))}
                {predictionData.summary.interventions?.length >0 && (
                  <div style={{ marginTop:'10px', padding:'8px', background:'rgba(16,185,129,0.06)', borderRadius:'6px' }}>
                    <p style={{ fontSize:'11px', fontWeight:800, color:'#10b981', marginBottom:'4px' }}>🛠️ AI Recommended Fixes:</p>
                    {predictionData.summary.interventions.map((iv,i)=>(<p key={i} style={{ fontSize:'12px', color:'var(--text-primary)' }}>→ {iv}</p>))}
                  </div>
                )}
              </div>
            )}

            <div style={{ padding: '14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '6px' }}>🌿 {predictionData.nodesAdded} Eco-Worlds Generated</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Walk through in 360°: <strong>Heat Dome, Vanishing Green, Flood Basin, Smog Corridor, Water Stress, + Regenerated Oasis (Hope)</strong> — each is a photorealistic panorama of {placeName}'s 2036.
              </p>
            </div>
            
            <button
              onClick={() => predictionData.predictedWorldId ? router.push(`/worlds/${predictionData.predictedWorldId}`) : router.back()}
              style={{ width: '100%', padding: '14px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}
            >
              <Leaf size={16}/> Enter Earth Twin 2036 →
            </button>
          </div>
        )}

        {!predictionData && (
          <button
            onClick={handleGenerate}
            disabled={!pin || loading}
            style={{ width: '100%', padding: '14px', backgroundColor: (!pin || loading) ? 'var(--bg-primary)' : '#10b981', color: (!pin || loading) ? 'var(--text-muted)' : '#fff', border: `1px solid ${(!pin || loading) ? 'var(--border-subtle)' : '#10b981'}`, borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: (!pin || loading) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px' }}
          >
            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Scanning NDVI/LST • Building Twin...</> : "🌍 Simulate Earth Cost 2036"}
          </button>
        )}
      </div>

      <div className="prediction-map" style={{ flex: 1, position: 'relative' }}>
        {isLoaded ? (
          <GoogleMap mapContainerStyle={mapContainerStyle} center={defaultCenter} zoom={13} onLoad={onLoad} onUnmount={onUnmount} onClick={onMapClick} options={{ mapTypeId: 'hybrid', disableDefaultUI: true, zoomControl: true }}>
            {pin && (
              <>
                <Marker position={pin} />
                <Polygon paths={getBoundingBox(pin.lat, pin.lng)} options={{ fillColor: '#10b981', fillOpacity: 0.18, strokeColor: '#10b981', strokeOpacity: 0.9, strokeWeight: 2 }} />
              </>
            )}
          </GoogleMap>
        ) : (
           <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
             <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
           </div>
        )}
      </div>
    </div>
  );
}

export default function PredictionPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading Earth Lens...</div>}>
      <PredictionInner />
    </Suspense>
  );
}
