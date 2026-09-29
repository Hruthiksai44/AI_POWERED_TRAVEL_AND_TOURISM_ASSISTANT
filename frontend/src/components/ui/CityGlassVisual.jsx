import React from 'react';

const accents = [
  'rgba(99, 102, 241, 0.12)',
  'rgba(16, 185, 129, 0.12)',
  'rgba(244, 63, 94, 0.12)',
  'rgba(245, 158, 11, 0.12)',
  'rgba(6, 182, 212, 0.12)',
  'rgba(217, 70, 239, 0.12)',
];

export default function CityGlassVisual({ city, index, className = "h-44" }) {
  const accent = accents[index % accents.length];

  return (
    <div
      className={`city-glass-visual flex items-center justify-center relative overflow-hidden shrink-0 rounded-t-2xl ${className}`}
      style={{ '--city-accent': accent }}
    >
      <span 
        className="font-black text-[var(--color-text-primary)] opacity-80 uppercase text-center break-words w-full px-4 select-none tracking-widest drop-shadow-sm group-hover:scale-[1.01] transition-transform duration-300"
        style={{ fontSize: "clamp(1.5rem, 6vw, 2.5rem)", lineHeight: 1.1 }}
      >
        {city.name}
      </span>
    </div>
  );
}
