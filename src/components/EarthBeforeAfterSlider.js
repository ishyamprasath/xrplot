'use client';
import { useState } from 'react';

export default function EarthBeforeAfterSlider({ dystopiaUrl, hopeUrl, label='Dystopia vs Hope' }) {
  const [pos, setPos] = useState(50);
  return (
    <div style={{ position:'relative', width:'100%', aspectRatio:'2/1', borderRadius:'16px', overflow:'hidden', border:'1px solid var(--border-subtle)', background:'var(--bg-tertiary)' }}>
      <img src={hopeUrl || dystopiaUrl || ''} alt="hope" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
      <div style={{ position:'absolute', inset:0, width:`${pos}%`, overflow:'hidden', borderRight:'3px solid #fff', boxShadow:'2px 0 12px rgba(0,0,0,0.4)' }}>
        <img src={dystopiaUrl || hopeUrl || ''} alt="dystopia" style={{ width:'200%', maxWidth:'none', height:'100%', objectFit:'cover' }} />
        <span style={{ position:'absolute', top:10, left:10, background:'rgba(239,68,68,0.92)', color:'#fff', padding:'4px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:800 }}>DYSTOPIA 2036</span>
      </div>
      <span style={{ position:'absolute', top:10, right:10, background:'rgba(16,185,129,0.92)', color:'#fff', padding:'4px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:800 }}>GREEN FUTURE 2036</span>
      <input type="range" min={5} max={95} value={pos} onChange={e=>setPos(Number(e.target.value))} style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', width:'60%', accentColor:'#10b981' }} />
      <div style={{ position:'absolute', bottom:14, left:10, fontSize:'10px', color:'#fff', background:'rgba(0,0,0,0.45)', padding:'4px 8px', borderRadius:'20px' }}>{label} — drag to compare</div>
    </div>
  );
}
