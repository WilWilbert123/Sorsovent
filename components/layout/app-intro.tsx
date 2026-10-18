"use client";

import { useEffect, useState } from "react";

export function AppIntro() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Auto-dismiss smoothly after 1.3s
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 1300);

    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 1750);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Avoid SSR flash
  if (!mounted || !visible) return null;

  return (
    <div
      onClick={() => {
        setFading(true);
        setTimeout(() => setVisible(false), 300);
      }}
      className={`fixed inset-0 z-[999999] bg-white flex flex-col items-center justify-center cursor-pointer select-none transition-opacity duration-400 ease-out ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div className="flex flex-col items-center justify-center p-6 text-center transform-gpu">
        {/* Soft glowing ambient circle */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-orange-400/15 via-rose-400/20 to-pink-500/15 blur-2xl animate-pulse pointer-events-none" />
          
          {/* Logo with smooth entry and micro-float */}
          <img
            src="/minglelogo.png"
            alt="Mingle Logo"
            className="h-24 w-auto sm:h-32 object-contain relative z-10 drop-shadow-sm transition-transform duration-700 ease-out hover:scale-105"
            style={{
              animation: "intro-pop 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          />
        </div>

        {/* Brand Text */}
        <div className="mt-5 space-y-1">
          <h1 className="font-extrabold text-2xl sm:text-3xl tracking-[0.2em] text-slate-900 font-sans">
            MINGLE
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-[0.25em] uppercase">
            Sorsogon Community
          </p>
        </div>

        {/* Minimal loading indicator bar */}
        <div className="mt-8 w-28 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 rounded-full"
            style={{
              animation: "intro-bar 1.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
            }}
          />
        </div>
      </div>
    </div>
  );
}
