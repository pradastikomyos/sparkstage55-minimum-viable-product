import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

interface FlipTextProps {
  children: string;
  className?: string;
}

export function FlipText({ children, className }: FlipTextProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <span className={cn('inline-flex', className)} aria-label={children}>
      {children.split('').map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          aria-hidden="true"
          className="inline-block"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          animate={reduceMotion ? undefined : {
            rotateX: hoveredIndex === index ? 360 : 0,
            y: hoveredIndex === index ? -8 : 0,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {char === ' ' ? '\u00a0' : char}
        </motion.span>
      ))}
    </span>
  );
}
