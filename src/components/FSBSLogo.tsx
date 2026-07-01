import React from 'react';

interface FSBSLogoProps {
  className?: string;
}

export const FSBSLogo: React.FC<FSBSLogoProps> = ({ className = 'h-16' }) => {
  return (
    <div className={`flex items-center gap-4 select-none ${className}`} id="fsbs_logo">
      {/* Skewed Frame Logo SVG */}
      <svg
        viewBox="0 0 160 120"
        className="h-full w-auto filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
        fill="currentColor"
      >
        {/* Skewed background / frame */}
        <g stroke="#0E0A08" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="miter">
          {/* Top-right corner section */}
          <path d="M 65 14 L 115 14 L 142 104 L 122 104" />
          {/* Bottom-left corner section */}
          <path d="M 85 114 L 35 114 L 8 24 L 28 24" />
        </g>
        
        {/* Bold FS letters */}
        <text
          x="72"
          y="78"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="56"
          fill="#0E0A08"
          textAnchor="middle"
          letterSpacing="-1.5"
          transform="skewX(-16)"
        >
          FS
        </text>
      </svg>
      
      {/* Business School Text */}
      <div className="flex flex-col text-left leading-[1.1] text-brand-text">
        <span className="font-sans font-light tracking-wide text-lg sm:text-xl">Business</span>
        <span className="font-sans font-semibold tracking-normal text-lg sm:text-xl">School</span>
      </div>
    </div>
  );
};
