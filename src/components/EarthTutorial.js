'use client';
import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, MapPin, Sparkles, Leaf, Eye, MessageSquare, Lightbulb } from 'lucide-react';

const STEPS = [
  {
    icon: <Lightbulb size={20} />,
    title: 'Welcome to Earth Lens 2036 🌍',
    desc: 'In 45 seconds, see your street in a +2°C world — then see how to save it. No geo-degree needed. We guide every tap.',
    tip: 'Judges: click “Try Delhi in 1 Click” if you’re in a hurry (10s demo).',
    color: '#10b981'
  },
  {
    icon: <MapPin size={20} />,
    title: '1 — Plant your 500m probe',
    desc: 'Search any city or click the satellite map. A violet box = your 500m eco-scan zone. We pull 10 years of NDVI (green), NDBI (concrete), LST (heat).',
    tip: 'Try: “Lodhi Garden, Delhi” or “Marina Beach, Chennai” for dramatic heat/flood contrast.',
    color: '#06b6d4'
  },
  {
    icon: <Sparkles size={20} />,
    title: '2 — Simulate Earth Cost',
    desc: 'Hit “Simulate Earth Cost 2036”. GEE scans → Gemini builds dystopia vs green future report + charts. ~60-90s (we show satellite % so you don’t leave).',
    tip: 'Behind: real GEE S2 + MODIS when creds exist, smart simulated fallback otherwise.',
    color: '#f59e0b'
  },
  {
    icon: <Eye size={20} />,
    title: '3 — Walk the 360° Twin',
    desc: '6 nodes appear: Heat Dome, Vanishing Green, Flood Basin, Smog, Water Stress + Regenerated Oasis (hope). Click “Enter Earth Twin 2036” and walk each panorama. Drag to look around!',
    tip: 'Pro: use the Before/After slider to drag dystopia ↔ hope.',
    color: '#8b5cf6'
  },
  {
    icon: <MessageSquare size={20} />,
    title: '4 — Ask Earth Agent for fixes',
    desc: 'Go to Chat or Voice. Ask “Cool this heat dome 2°C?” — agent quantifies: Miyawaki -2.4°C, cool roofs -3.1°C, lake revival -60% flood, with tons CO₂ math.',
    tip: 'Example prompts pre-filled in chat — one tap to test.',
    color: '#10b981'
  },
];

export default function EarthTutorial({ storageKey='terraplot-earth-tutorial-v1', autoOpen=true }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(()=>{
    if (!autoOpen) return;
    const seen = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : '1';
    if (!seen) setOpen(true);
  }, [autoOpen, storageKey]);

  const dismiss = (remember=true) => {
    if (remember) localStorage.setItem(storageKey, '1');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={()=>{ setStep(0); setOpen(true); }}
        title="Show Earth Lens tutorial"
        style={{ position:'fixed', bottom:20, right:20, zIndex:90, background:'var(--bg-secondary)', border:'1px solid var(--border-subtle)', borderRadius:'999px', padding:'10px 14px', display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', fontWeight:700, color:'var(--text-secondary)', boxShadow:'var(--shadow-lg)', cursor:'pointer' }}
      >
        <span style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>?</span>
        Guide
      </button>
    );
  }

  const s = STEPS[step];
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div onClick={()=>dismiss(true)} style={{ position:'absolute', inset:0, background:'rgba(7,7,15,0.72)', backdropFilter:'blur(6px)' }} />
      <div style={{ position:'relative', width:'100%', maxWidth:560, background:'var(--bg-secondary)', border:'1px solid var(--border-subtle)', borderRadius:'20px', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.45)' }}>
        <div style={{ height:4, background:'var(--bg-tertiary)' }}>
          <div style={{ height:'100%', width:`${((step+1)/STEPS.length)*100}%`, background:`linear-gradient(90deg, ${s.color}, #06b6d4)`, transition:'width 300ms ease' }} />
        </div>
        <button onClick={()=>dismiss(true)} style={{ position:'absolute', top:12, right:12, width:32, height:32, borderRadius:'50%', background:'var(--bg-card)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-secondary)' }}><X size={16} /></button>

        <div style={{ padding:'24px 24px 18px', display:'flex', gap:'14px' }}>
          <div style={{ width:44, height:44, borderRadius:'12px', background:`${s.color}18`, border:`1px solid ${s.color}33`, display:'flex', alignItems:'center', justifyContent:'center', color:s.color, flexShrink:0 }}>{s.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'11px', fontWeight:800, letterSpacing:'0.7px', color:s.color, marginBottom:4 }}>STEP {step+1} / {STEPS.length} • 30 SEC TOUR</div>
            <h3 style={{ fontSize:'18px', fontWeight:900, color:'var(--text-primary)', marginBottom:8 }}>{s.title}</h3>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:1.6 }}>{s.desc}</p>
            <div style={{ marginTop:12, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.18)', borderRadius:'10px', padding:'10px 12px', display:'flex', gap:'8px' }}>
              <span style={{ color:'#10b981', fontSize:'12px', marginTop:1 }}>💡</span>
              <span style={{ fontSize:'12px', color:'var(--text-secondary)', lineHeight:1.5 }}>{s.tip}</span>
            </div>
          </div>
        </div>

        <div style={{ padding:'0 24px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:6 }}>
            {STEPS.map((_,i)=>(
              <button key={i} onClick={()=>setStep(i)} style={{ width: step===i?22:8, height:8, borderRadius:'999px', background: step===i? s.color : 'var(--border-medium)', border:'none', cursor:'pointer', transition:'all 200ms' }} />
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>dismiss(true)} style={{ padding:'9px 14px', borderRadius:'10px', border:'1px solid var(--border-subtle)', background:'transparent', color:'var(--text-secondary)', fontWeight:700, cursor:'pointer' }}>Skip</button>
            {step>0 && (
              <button onClick={()=>setStep(s=>Math.max(0,s-1))} style={{ padding:'9px 12px', borderRadius:'10px', border:'1px solid var(--border-subtle)', background:'var(--bg-card)', color:'var(--text-primary)', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}><ChevronLeft size={16} /> Back</button>
            )}
            {step < STEPS.length-1 ? (
              <button onClick={()=>setStep(s=>Math.min(STEPS.length-1,s+1))} style={{ padding:'9px 16px', borderRadius:'10px', border:'none', background:s.color, color:'#fff', fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>Next <ChevronRight size={16} /></button>
            ) : (
              <button onClick={()=>dismiss(true)} style={{ padding:'9px 16px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontWeight:800, cursor:'pointer' }}>🌍 Start Exploring</button>
            )}
          </div>
        </div>

        {step===0 && (
          <div style={{ margin:'0 24px 20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { k:'No login needed', v:'Landing / is public' },
              { k:'1-Click Demo', v:'Delhi preset for judges' },
              { k:'~60s build', v:'Satellite % shown' },
              { k:'Walk 360°', v:'Hope node is central' },
            ].map(x=>(
              <div key={x.k} style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:10, padding:'10px', textAlign:'center' }}>
                <div style={{ fontSize:'11px', fontWeight:800, color:'var(--text-primary)' }}>{x.k}</div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{x.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
