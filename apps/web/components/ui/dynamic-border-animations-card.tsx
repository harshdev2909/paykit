"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DynamicBorderAnimationsCardProps {
  children: React.ReactNode;
  className?: string;
}

export function DynamicBorderAnimationsCard({ children, className }: DynamicBorderAnimationsCardProps) {
  return (
    <motion.div
      className={cn(
        "relative rounded-xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm",
        "overflow-hidden shadow-lg",
        className
      )}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      <motion.div
        className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-primary/10 to-transparent"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
