"use client";

import { motion } from "framer-motion";

const paths = [
  "M0 120 Q300 80 600 120 T1200 120 V180 H0 Z",
  "M0 240 Q400 200 800 240 T1600 240 V300 H0 Z",
  "M0 360 Q350 320 700 360 T1400 360 V420 H0 Z",
  "M0 480 Q450 440 900 480 T1800 480 V540 H0 Z",
];

export function BackgroundPaths({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ""}`}>
      <svg className="absolute w-full h-full opacity-[0.15]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.55 0.2 250)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="oklch(0.65 0.15 280)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {paths.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="url(#path-gradient)"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>
    </div>
  );
}
