'use client';

function MiniLine({ data, color='#10b981', yMin, yMax, height=56 }) {
  if (!data || data.length < 2) return <div style={{ height, background:'var(--bg-tertiary)', borderRadius:8 }} />;
  const w = 200, h = height, pad = 6;
  const min = yMin ?? Math.min(...data);
  const max = yMax ?? Math.max(...data);
  const range = (max - min) || 1;
  const pts = data.map((v,i)=>{
    const x = pad + (i/(data.length-1))*(w-pad*2);
    const y = h - pad - ((v-min)/range)*(h-pad*2);
    return `${x},${y}`;
  }).join(' ');
  const last = data[data.length-1];
  const first = data[0];
  const delta = last - first;
  const deltaStr = (delta>=0?'+':'')+delta.toFixed(3);
  return (
    <div style={{ position:'relative' }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display:'block', width:'100%', height }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((v,i)=>{
          const x = pad + (i/(data.length-1))*(w-pad*2);
          const y = h - pad - ((v-min)/range)*(h-pad*2);
          return <circle key={i} cx={x} cy={y} r={i===0||i===data.length-1?3:0} fill={color} />;
        })}
      </svg>
      <span style={{ position:'absolute', top:2, right:4, fontSize:'10px', fontWeight:800, color, background:'var(--bg-card)', padding:'2px 6px', borderRadius:'20px', border:`1px solid ${color}22` }}>{deltaStr}</span>
    </div>
  );
}

function BarPair({ label, past, future, hope, unit='', colorPast='#6b7280', colorFuture='#ef4444', colorHope='#10b981' }) {
  const max = Math.max(past, future, hope||0) * 1.15 || 1;
  const bar = (v,c) => (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{ width:'100%', height:56, background:'var(--bg-tertiary)', borderRadius:8, display:'flex', alignItems:'flex-end', padding:4, gap:2 }}>
        <div style={{ flex:1, height:`${(v/max)*100}%`, background:c, borderRadius:6, minHeight:4 }} />
      </div>
      <span style={{ fontSize:'10px', fontWeight:800, color:c }}>{v}{unit}</span>
    </div>
  );
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:'10px 10px 8px' }}>
      <div style={{ fontSize:'10px', fontWeight:800, letterSpacing:'0.6px', color:'var(--text-muted)', textAlign:'center', marginBottom:6 }}>{label}</div>
      <div style={{ display:'flex', gap:6, alignItems:'flex-end' }}>
        {bar(past, colorPast)}
        {bar(future, colorFuture)}
        {hope!==undefined && bar(hope, colorHope)}
      </div>
      <div style={{ display:'flex', justifyContent:'space-around', fontSize:'8px', color:'var(--text-muted)', marginTop:4, fontWeight:700 }}>
        <span>2016</span><span>2036 D</span>{hope!==undefined && <span style={{ color:'#10b981' }}>2036 H</span>}
      </div>
    </div>
  );
}

export default function EarthCharts({ simulation, ecoReport }) {
  if (!simulation) return null;
  const { ndbiTrend, ndviTrend, lstTrend, greenCover, waterStress, urbanDensity, geeSource } = simulation;
  const past = ecoReport?.pastDecade;
  const future = ecoReport?.futureDecade;
  const hope = ecoReport?.greenFuture;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h4 style={{ fontSize:'12px', fontWeight:900, letterSpacing:'0.6px', color:'var(--text-primary)' }}>📡 SATELLITE TRAJECTORIES (10Y)</h4>
        <span style={{ fontSize:'10px', fontWeight:800, padding:'4px 8px', borderRadius:'20px', background: geeSource==='GEE_REAL'?'rgba(16,185,129,0.12)':'rgba(245,158,11,0.12)', color: geeSource==='GEE_REAL'?'#10b981':'#f59e0b', border:`1px solid ${geeSource==='GEE_REAL'?'rgba(16,185,129,0.2)':'rgba(245,158,11,0.2)'}` }}>
          {geeSource==='GEE_REAL'?'🛰️ GEE REAL':'🧪 SIMULATED'} • 500m probe
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:10 }}>
          <div style={{ fontSize:'10px', fontWeight:800, color:'#10b981', letterSpacing:'0.6px' }}>NDVI — Green</div>
          <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:6 }}>{ndviTrend?.[0]?.toFixed(3)} → {ndviTrend?.slice(-1)[0]?.toFixed(3)} • falling = loss</div>
          <MiniLine data={ndviTrend} color="#10b981" yMin={0.1} yMax={0.7} />
        </div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:10 }}>
          <div style={{ fontSize:'10px', fontWeight:800, color:'#3b82f6', letterSpacing:'0.6px' }}>NDBI — Concrete</div>
          <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:6 }}>{ndbiTrend?.[0]?.toFixed(3)} → {ndbiTrend?.slice(-1)[0]?.toFixed(3)} • rising = sprawl</div>
          <MiniLine data={ndbiTrend} color="#3b82f6" yMin={0} yMax={0.6} />
        </div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:10 }}>
          <div style={{ fontSize:'10px', fontWeight:800, color:'#ef4444', letterSpacing:'0.6px' }}>LST — Heat °C</div>
          <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:6 }}>{lstTrend?.[0]?.toFixed(1)}°C → {lstTrend?.slice(-1)[0]?.toFixed(1)}°C • rising = dome</div>
          <MiniLine data={lstTrend} color="#ef4444" />
        </div>
      </div>

      {past && future && (
        <>
          <h4 style={{ fontSize:'12px', fontWeight:900, letterSpacing:'0.6px', color:'var(--text-primary)', marginTop:4 }}>⚖️ DYSTOPIA vs HOPE — WHAT ONE CHOICE SAVES</h4>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            <BarPair label="Green km²" past={past.greenCoverKm2} future={future.greenCoverKm2} hope={hope?.greenCoverKm2} />
            <BarPair label="Temp °C" past={past.avgTempC} future={future.avgTempC} hope={hope?.avgTempC} colorPast="#6b7280" colorFuture="#ef4444" colorHope="#10b981" />
            <BarPair label="AQI" past={past.airQualityIndex} future={future.airQualityIndex} hope={hope?.airQualityIndex} colorPast="#6b7280" colorFuture="#f59e0b" colorHope="#10b981" />
            <BarPair label="Trees k" past={past.treeCount} future={future.treeCount} hope={hope?.treeCount} colorPast="#6b7280" colorFuture="#ef4444" colorHope="#10b981" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { k:'Green Cover', v: greenCover+'%', sub:'NDVI-derived', c:'#10b981' },
              { k:'Urban Density', v: urbanDensity+'%', sub:'NDBI-derived', c:'#3b82f6' },
              { k:'Water Stress', v: waterStress+'/100', sub:'Aquifer risk', c:'#06b6d4' },
            ].map(s=>(
              <div key={s.k} style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:'10px', textAlign:'center' }}>
                <div style={{ fontSize:'10px', fontWeight:800, color:'var(--text-muted)', letterSpacing:'0.6px' }}>{s.k}</div>
                <div style={{ fontSize:'18px', fontWeight:900, color:s.c }}>{s.v}</div>
                <div style={{ fontSize:'10px', color:'var(--text-muted)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
