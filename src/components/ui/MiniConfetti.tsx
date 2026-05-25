import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface MiniConfettiProps {
  onComplete?: () => void;
}

export const MiniConfetti: React.FC<MiniConfettiProps> = ({ onComplete }) => {
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setShouldAnimate(false);
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      onComplete?.();
    }, 1000); // Remove after animation

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!shouldAnimate) return null;

  // Tiny dots for a subtle burst
  const particles = Array.from({ length: 6 }).map((_, i) => {
    const angle = (i / 6) * Math.PI * 2;
    const distance = 25; // How far they travel
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      color: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'][i % 5]
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: p.color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: 1, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};
