// src/components/SplashScreen.tsx
// Shows while the app initializes — masks load time, doesn't add to it.
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number; // minimum ms to show (default 1800)
}

export default function SplashScreen({ onComplete, minDuration = 1800 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'logo' | 'text' | 'exit'>('logo');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text'), 600);
    const t2 = setTimeout(() => setPhase('exit'), minDuration - 400);
    const t3 = setTimeout(() => onComplete(), minDuration);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete, minDuration]);

  return (
    <AnimatePresence>
      {phase !== 'exit' ? null : null}
      <motion.div
        key="splash"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="fixed inset-0 z-99999 flex items-center justify-center bg-slate-900 overflow-hidden"
      >
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            transition={{ duration: 1.5 }}
            className="absolute -bottom-32 -left-32 w-125 h-125 rounded-full bg-blue-600 blur-[150px]"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            transition={{ duration: 1.5, delay: 0.3 }}
            className="absolute -top-20 -right-20 w-100 h-100 rounded-full bg-teal-500 blur-[130px]"
          />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src="/logo.svg"
              alt="Colourplus"
              className="h-20 w-auto"
            />
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: phase === 'text' || phase === 'exit' ? 1 : 0, y: phase === 'text' || phase === 'exit' ? 0 : 8 }}
            transition={{ duration: 0.5 }}
            className="mt-5 text-sm font-medium text-slate-400 tracking-wide"
          >
            Screen Printing Management System
          </motion.p>

          {/* Loading bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 w-48 h-0.5 rounded-full bg-slate-800 overflow-hidden"
          >
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: (minDuration - 400) / 1000, ease: 'easeInOut' }}
              className="h-full rounded-full bg-linear-to-r from-blue-500 to-teal-400"
            />
          </motion.div>
        </div>

        {/* Bottom text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-8 text-[11px] text-slate-600"
        >
          Colour Plus Printing Systems (Pvt) Ltd
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}