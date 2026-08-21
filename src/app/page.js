'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

function EarthLanding() {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', position:'relative', overflow:'hidden' }}>
      <div className="animated-bg" />
      <nav style={{ position:'relative', zIndex:2, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 32px', maxWidth:'1200px', margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'22px', fontWeight:900, background:'linear-gradient(135deg,#10b981,#059669)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>🌍 TerraPlot</span>
          <span style={{ fontSize:'10px', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', padding:'3px 8px', borderRadius:'20px', fontWeight:800, letterSpacing:'0.6px' }}>EARTH LENS 2036</span>
        </div>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <span style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.5px' }}>AI 4 EARTH HACKATHON</span>
          <Link href="/sign-in" className="btn btn-ghost" style={{ padding:'8px 16px', fontSize:'13px' }}>Sign In</Link>
          <Link href="/prediction" className="btn btn-primary" style={{ padding:'10px 18px', fontSize:'13px', background:'linear-gradient(135deg,#10b981,#059669)' }}>Try Earth Lens →</Link>
        </div>
      </nav>

      <section style={{ position:'relative', zIndex:2, maxWidth:'1200px', margin:'0 auto', padding:'48px 32px 32px', display:'grid', gridTemplateColumns:'1.15fr 0.85fr', gap:'40px', alignItems:'center' }}>
        <div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', padding:'6px 12px', borderRadius:'999px', fontSize:'11px', fontWeight:800, color:'#10b981', letterSpacing:'0.6px', marginBottom:'18px' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#10b981', display:'inline-block', animation:'pulse 2s infinite' }} /> GATEWAYGS × AEI • AI 4 EARTH • LIVE
          </div>
          <h1 style={{ fontSize:'48px', fontWeight:900, lineHeight:'0.95', marginBottom:'16px', color:'var(--text-primary)' }}>
            See your street<br />
            in a <span style={{ background:'linear-gradient(135deg,#10b981,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>+2°C world.</span>
          </h1>
          <p style={{ fontSize:'16px', color:'var(--text-secondary)', lineHeight:1.6, marginBottom:'22px', maxWidth:'560px' }}>
            Drop a pin anywhere on Earth. <strong style={{color:'var(--text-primary)'}}>GEE satellites</strong> scan NDVI/NDBI/LST for 10 years, <strong style={{color:'var(--text-primary)'}}>Gemini</strong> predicts <span style={{color:'#ef4444', fontWeight:700}}>dystopia</span> vs <span style={{color:'#10b981', fontWeight:700}}>green future</span>, and AI builds a <strong style={{color:'var(--text-primary)'}}>walkable 360° Earth Twin</strong> you can feel.
          </p>
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'18px' }}>
            <Link href="/prediction" className="btn btn-primary btn-lg" style={{ background:'linear-gradient(135deg,#10b981,#059669)', boxShadow:'0 8px 24px rgba(16,185,129,0.35)' }}>🌍 Launch Earth Lens 2036</Link>
            <Link href="/sign-in" className="btn btn-secondary btn-lg">View Dashboard</Link>
          </div>
          <div style={{ display:'flex', gap:'18px', flexWrap:'wrap', fontSize:'12px', color:'var(--text-muted)' }}>
            <span>✓ No credit card • Free with Gemini</span>
            <span>✓ Any city globally • 500m eco-scan</span>
            <span>✓ 6 immersive 360° futures</span>
          </div>
          <div style={{ marginTop:'22px', display:'flex', gap:'12px', flexWrap:'wrap' }}>
            {[
              { k:'NDVI', v:'-41% green', c:'#ef4444' },
              { k:'LST', v:'+2.8°C heat', c:'#f59e0b' },
              { k:'AQI', v:'168 smog', c:'#ef4444' },
              { k:'HOPE', v:'-2.4°C with Miyawaki', c:'#10b981' },
            ].map(s=>(
              <div key={s.k} style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:'12px', padding:'10px 14px', minWidth:'120px' }}>
                <div style={{ fontSize:'10px', fontWeight:800, letterSpacing:'0.7px', color:'var(--text-muted)' }}>{s.k}</div>
                <div style={{ fontSize:'13px', fontWeight:800, color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position:'relative' }}>
          <div style={{ background:'var(--bg-secondary)', border:'1px solid var(--border-subtle)', borderRadius:'20px', padding:'16px', boxShadow:'var(--shadow-lg)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <span style={{ fontSize:'11px', fontWeight:800, letterSpacing:'0.7px', color:'var(--text-muted)' }}>EARTH TWIN PREVIEW — DELHI 2036</span>
              <span style={{ fontSize:'10px', background:'#10b981', color:'#fff', padding:'4px 8px', borderRadius:'20px', fontWeight:800 }}>LIVE SIMULATION</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
              {[
                { t:'Heat Dome', d:'44°C surface', c:'#ef4444', e:'+3.1°C' },
                { t:'Vanishing Green', d:'Barren canopy', c:'#f59e0b', e:'-41% trees' },
                { t:'Flood Basin', d:'0.8m monsoon', c:'#3b82f6', e:'+60% flood' },
                { t:'Smog Corridor', d:'PM2.5 x2.3', c:'#6b7280', e:'AQI 168' },
                { t:'Water Stress', d:'-12m aquifer', c:'#06b6d4', e:'Dry borewells' },
                { t:'Regenerated Oasis', d:'3x biodiversity', c:'#10b981', e:'HOPE ✓' },
              ].map(n=>(
                <div key={n.t} style={{ background: n.t==='Regenerated Oasis'?'rgba(16,185,129,0.08)':'var(--bg-card)', border:`1px solid ${n.t==='Regenerated Oasis'?'rgba(16,185,129,0.25)':'var(--border-subtle)'}`, borderRadius:'12px', padding:'10px', borderLeft:`3px solid ${n.c}` }}>
                  <div style={{ fontSize:'11px', fontWeight:800, color:'var(--text-primary)' }}>{n.t}</div>
                  <div style={{ fontSize:'11px', color:'var(--text-secondary)' }}>{n.d}</div>
                  <div style={{ fontSize:'10px', fontWeight:800, color:n.c, marginTop:'4px' }}>{n.e}</div>
                </div>
              ))}
            </div>
            <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'12px', padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:'11px', fontWeight:800, color:'#10b981' }}>Green Future fixes cool 2.4°C</div>
                <div style={{ fontSize:'11px', color:'var(--text-secondary)' }}>Miyawaki + cool roofs + lake revival</div>
              </div>
              <Link href="/prediction" style={{ background:'#10b981', color:'#fff', padding:'8px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:800, textDecoration:'none' }}>Enter 360° →</Link>
            </div>
          </div>
          <div style={{ position:'absolute', top:-12, right:-12, background:'var(--bg-secondary)', border:'1px solid var(--border-subtle)', borderRadius:'12px', padding:'8px 10px', fontSize:'11px', fontWeight:700, color:'var(--text-secondary)', boxShadow:'var(--shadow-md)' }}>
            📡 GEE • NDVI + NDBI + LST • Gemini
          </div>
        </div>
      </section>

      <section style={{ position:'relative', zIndex:2, maxWidth:'1200px', margin:'0 auto', padding:'8px 32px 48px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px' }}>
        {[
          { icon:'🛰️', title:'Satellite-Grounded', desc:'Real GEE time-series drives math, not vibes. NDBI up = NDVI down = LST up.' },
          { icon:'🎨', title:'Feel, Don’t Just Chart', desc:'6 photorealistic 360° panoramas make heat/flood/smog visceral — walk the future.' },
          { icon:'🌱', title:'Quantified Hope', desc:'Every dystopia paired with fix & math: “cools 2.3°C, saves 420t CO₂”.' },
        ].map(f=>(
          <div key={f.title} style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:'16px', padding:'18px' }}>
            <div style={{ fontSize:'22px', marginBottom:'8px' }}>{f.icon}</div>
            <div style={{ fontSize:'14px', fontWeight:800, color:'var(--text-primary)', marginBottom:'6px' }}>{f.title}</div>
            <div style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:1.5 }}>{f.desc}</div>
          </div>
        ))}
      </section>

      <footer style={{ position:'relative', zIndex:2, borderTop:'1px solid var(--border-subtle)', padding:'18px 32px', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'12px', maxWidth:'1200px', margin:'0 auto', fontSize:'12px', color:'var(--text-muted)' }}>
        <span>© 2026 TerraPlot • Built for GatewayGS × AEI AI 4 Earth Hackathon • Branch <code>earth-hackathon</code></span>
        <span style={{ display:'flex', gap:'12px' }}><Link href="/prediction" style={{ color:'var(--text-secondary)' }}>Launch</Link><a href="https://github.com/ishyamprasath/xrplot" style={{ color:'var(--text-secondary)' }}>GitHub</a></span>
      </footer>
    </div>
  );
}

export default function HomePage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && userId) {
      router.replace('/dashboard');
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded) {
    return (
      <div className="chat-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (userId) {
    return (
      <div className="chat-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return <EarthLanding />;
}
