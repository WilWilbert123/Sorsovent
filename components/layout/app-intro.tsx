"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// In-memory singleton persists across all SPA client-side navigations
let hasIntroShownInMemory = false;

export function AppIntro() {
  const pathname = usePathname();
  // ONLY allow intro on root landing page ("/")
  // Never show on /auth/login, /places, /events, etc.
  const isRootPath = pathname === "/";

  const [visible, setVisible] = useState(() => {
    if (!isRootPath) return false;
    if (hasIntroShownInMemory) return false;

    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem("mingle_intro_shown") === "true") {
          return false;
        }
        const lastShown = localStorage.getItem("mingle_intro_last_shown");
        if (lastShown && Date.now() - Number(lastShown) < 20 * 60 * 1000) {
          return false;
        }
      } catch {}
    }
    return true;
  });

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isRootPath || !visible) return;

    try {
      if (
        hasIntroShownInMemory ||
        sessionStorage.getItem("mingle_intro_shown") === "true" ||
        (localStorage.getItem("mingle_intro_last_shown") &&
          Date.now() - Number(localStorage.getItem("mingle_intro_last_shown")) < 20 * 60 * 1000)
      ) {
        setVisible(false);
        return;
      }

      // MARK AS SHOWN IMMEDIATELY so any quick click or navigation won't replay it
      hasIntroShownInMemory = true;
      sessionStorage.setItem("mingle_intro_shown", "true");
      localStorage.setItem("mingle_intro_last_shown", Date.now().toString());
      document.cookie = "mingle_intro_shown=true; path=/; max-age=1200";
    } catch {}

    const timer = setTimeout(() => {
      try {
        document.documentElement.classList.add("intro-hidden");
      } catch {}
      setVisible(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, [isRootPath, visible]);

  if (!isRootPath || !visible) return null;

  const handleDismiss = () => {
    setDismissed(true);
    hasIntroShownInMemory = true;
    try {
      sessionStorage.setItem("mingle_intro_shown", "true");
      localStorage.setItem("mingle_intro_last_shown", Date.now().toString());
      document.documentElement.classList.add("intro-hidden");
    } catch {}
  };

  const handleAnimationEnd = () => {
    hasIntroShownInMemory = true;
    try {
      document.documentElement.classList.add("intro-hidden");
    } catch {}
    setVisible(false);
  };

  return (
    <div
      id="mingle-app-intro"
      onClick={handleDismiss}
      onAnimationEnd={handleAnimationEnd}
      className="fixed inset-0 z-[999999] bg-white flex flex-col items-center justify-center cursor-pointer select-none"
      style={{
        WebkitTapHighlightColor: "transparent",
        animation: dismissed
          ? "intro-fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards"
          : "intro-fade-out 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards",
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
