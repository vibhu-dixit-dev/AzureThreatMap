"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThreeDLandingScene from "@/components/ThreeDLandingScene";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleEnter = () => {
    setIsTransitioning(true);
    // Wait for the camera zoom transition to mostly finish before routing
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500); 
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#020617] text-white flex flex-col items-center justify-center font-outfit">
      {/* 3D Background */}
      <ThreeDLandingScene isTransitioning={isTransitioning} />

      {/* Overlay Content */}
      <div className={`relative z-10 flex flex-col items-center text-center px-4 transition-opacity duration-1000 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Logo / Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md">
            <span className="text-blue-400 text-sm font-medium tracking-wide">Cloud Security Simulator</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-emerald-400 to-indigo-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            AzureThreatMap
          </h1>
          
          {/* Tagline */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 font-light leading-relaxed">
            Visualize Azure Attack Paths Before Attackers Do. Explore your cloud infrastructure blast radius in real-time.
          </p>

          {/* CTA Button */}
          <button 
            onClick={handleEnter}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white transition-all duration-300 ease-in-out border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 hover:border-white/20 backdrop-blur-lg overflow-hidden"
          >
            {/* Hover glow effect */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500/20 via-emerald-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <span className="relative z-10 flex items-center gap-3">
              Enter Platform
              <svg 
                className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </button>
        </motion.div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-8 left-8 w-16 h-16 border-t border-l border-white/10 rounded-tl-xl pointer-events-none opacity-50" />
      <div className="absolute top-8 right-8 w-16 h-16 border-t border-r border-white/10 rounded-tr-xl pointer-events-none opacity-50" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-b border-l border-white/10 rounded-bl-xl pointer-events-none opacity-50" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-b border-r border-white/10 rounded-br-xl pointer-events-none opacity-50" />
    </main>
  );
}
