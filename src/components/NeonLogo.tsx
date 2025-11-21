import React from 'react';

export const NeonLogo = () => {
  return (
    <div className="neon-logo-container" style={{ position: 'relative', padding: '10px' }}>
      <svg width="200" height="60" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Glow Filter */}
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur3" />
            <feMerge>
              <feMergeNode in="blur3" />
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Text Group */}
        <g style={{ fontFamily: '"Tilt Neon", sans-serif', fontWeight: 'bold', fontSize: '40px' }}>
          {/* Base "Off" Tube Layer */}
          <text x="10" y="45" fill="none" stroke="#2a0a4a" strokeWidth="4" strokeLinecap="round">
            Voxelito
          </text>

          {/* Lit "On" Layer with Flicker */}
          <text
            x="10"
            y="45"
            fill="#e0ccff"
            stroke="#b388ff"
            strokeWidth="2"
            className="neon-text-flicker"
            style={{ filter: 'url(#neon-glow)' }}
          >
            Voxelito
          </text>

          {/* Defective Letter "i" (flickers more) */}
           <text
            x="10"
            y="45"
            fill="#e0ccff"
            stroke="#b388ff"
            strokeWidth="2"
            className="neon-text-glitch"
            style={{ filter: 'url(#neon-glow)', clipPath: 'inset(0 52% 0 44%)' }} // Approximate clip for 'i'
          >
            Voxelito
          </text>
        </g>
      </svg>
    </div>
  );
};
