'use client';

import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';

export default function SwapButton({ onSwapClick, disabled = false }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onSwapClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 48,
        height: 48,
        background: '#ffffff',
        border: '2px solid #000000',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
        transform: isHovered && !disabled ? 'scale(1.05)' : 'scale(1)',
        zIndex: 1000,
      }}
      title={disabled ? 'Select two nodes to swap' : 'Swap nodes'}
    >
      <ArrowLeftRight 
        size={24} 
        color="#000000"
        style={{
          transform: 'rotate(90deg)', // Make it a horizontal swap icon
        }}
      />
    </button>
  );
}
