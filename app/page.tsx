"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  CalendarDays,
  Calendar,
  Users,
  Compass,
  ArrowRight,
  Radio,
  ChevronRight,
  Clock,
  Star,
  Trees,
  Waves,
  Coffee,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function Home() {
  // Prevent any document-level bounce or scrollview on mobile
  useEffect(() => {
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyHeight = document.body.style.height;
    const originalBodyDisplay = document.body.style.display;
    const originalBodyFlexDirection = document.body.style.flexDirection;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100dvh";
    document.body.style.display = "flex";
    document.body.style.flexDirection = "column";

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.height = originalBodyHeight;
      document.body.style.display = originalBodyDisplay;
      document.body.style.flexDirection = originalBodyFlexDirection;
    };
  }, []);

  return (
    <div className="flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col bg-background text-foreground relative select-none touch-none overscroll-none">
      {/* Ambient background glows - optimized for 60/120fps smooth performance on mobile webviews */}
      <div className="hidden sm:block absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[360px] bg-primary/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="hidden sm:block absolute top-12 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="hidden sm:block absolute bottom-12 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-[110px] pointer-events-none -z-10" />
      <div className="sm:hidden absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.07)_0%,transparent_60%)] pointer-events-none -z-10" />
      <div className="sm:hidden absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(168,85,247,0.07)_0%,transparent_60%)] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--background)_80%)] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b818_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="shrink-0 h-14 sm:h-16 w-full border-b border-border/50 bg-background/70 backdrop-blur-md z-30">
        <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/minglelogo.png"
              alt="Mingle"
              className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-bold text-lg sm:text-xl tracking-tight">MINGLE</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-foreground bg-muted/60 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/explore"
              className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/map"
              className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Map
            </Link>
            <Link
              href="/events"
              className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Events
            </Link>
            <Link
              href="/places"
              className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Places
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle variant="icon" />
            <Link href="/auth/login">
              <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm font-semibold px-3 sm:px-4 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 hover:from-orange-600 hover:via-rose-600 hover:to-pink-600 text-white border-0 shadow-md shadow-rose-500/25 transition-all cursor-pointer">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Single-Screen Arena */}
      <main className="flex-1 relative w-full max-w-7xl mx-auto flex items-center justify-center px-2 xs:px-4 sm:px-6 overflow-hidden">
        {/* Floating Card 1: Top Left (Create Events) */}
        <Link
          href="/events"
          className="absolute top-5 xs:top-6 sm:top-7 lg:top-8 left-2 xs:left-3 sm:left-4 lg:left-8 xl:left-14 w-[176px] xs:w-[190px] sm:w-52 md:w-56 lg:w-60 h-[182px] xs:h-[198px] sm:h-54 md:h-58 lg:h-62 p-3 xs:p-3.5 sm:p-4 md:p-4 lg:p-5 rounded-2xl lg:rounded-3xl border border-white/20 dark:border-white/10 ring-1 ring-blue-500/30 shadow-[0_4px_24px_-4px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_32px_-4px_rgba(59,130,246,0.45)] hover:scale-105 active:scale-95 transition-all duration-300 flex flex-col justify-between group cursor-pointer z-20 animate-float-1 overflow-hidden"
        >
          {/* Background Event Celebration Image */}
          <img
            src="/hero/events.jpg"
            alt="Create Events"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          {/* Protective Dark Gradient Overlay with Blue Tint */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-blue-950/30 group-hover:via-black/45 transition-colors" />

          {/* Card Content Overlay */}
          <div className="relative z-10 h-full flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <div className="p-1.5 sm:p-2 rounded-xl bg-blue-500/35 text-white border border-blue-400/40 backdrop-blur-xs group-hover:scale-110 transition-transform">
                <CalendarDays className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-blue-200" />
              </div>
              <span className="text-[10px] xs:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-950/70 text-blue-200 backdrop-blur-xs border border-blue-400/40 inline-flex items-center gap-1 shadow-2xs">
                <Calendar className="h-3 w-3 text-blue-300" />
                Events
              </span>
            </div>

            <div className="space-y-1 sm:space-y-1.5 my-auto">
              <h3 className="font-bold text-sm xs:text-base sm:text-lg text-white group-hover:text-blue-200 transition-colors leading-tight truncate drop-shadow-md">
                Create Events
              </h3>
              <p className="hidden md:block text-[11px] lg:text-xs text-white/85 leading-snug drop-shadow-xs">
                Host gatherings & invite the community.
              </p>
              {/* Micro preview tag */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/45 backdrop-blur-xs text-[10px] xs:text-[11px] text-white/95 font-medium border border-white/15 max-w-full">
                <Clock className="h-3 w-3 text-blue-300 shrink-0" />
                <span className="truncate">Oct 18 · Festival</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] xs:text-xs font-semibold text-blue-300 group-hover:text-white pt-2 border-t border-white/15 transition-colors drop-shadow-xs">
              <span>Explore list</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform text-blue-300" />
            </div>
          </div>
        </Link>

        {/* Floating Card 2: Top Right (Discover Places) - Staggered lower for dynamic non-aligned float */}
        <Link
          href="/places"
          className="absolute top-8 xs:top-9 sm:top-11 lg:top-12 right-2 xs:right-3 sm:right-4 lg:right-8 xl:right-14 w-[176px] xs:w-[190px] sm:w-52 md:w-56 lg:w-60 h-[182px] xs:h-[198px] sm:h-54 md:h-58 lg:h-62 p-3 xs:p-3.5 sm:p-4 md:p-4 lg:p-5 rounded-2xl lg:rounded-3xl border border-white/20 dark:border-white/10 ring-1 ring-emerald-500/30 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_32px_-4px_rgba(16,185,129,0.45)] hover:scale-105 active:scale-95 transition-all duration-300 flex flex-col justify-between group cursor-pointer z-20 animate-float-2 overflow-hidden"
        >
          {/* Background Discover Places Image */}
          <img
            src="/hero/places.jpg"
            alt="Discover Places"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          {/* Protective Dark Gradient Overlay with Emerald Tint */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-emerald-950/30 group-hover:via-black/45 transition-colors" />

          {/* Card Content Overlay */}
          <div className="relative z-10 h-full flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/35 text-white border border-emerald-400/40 backdrop-blur-xs group-hover:scale-110 transition-transform">
                <Compass className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-emerald-200" />
              </div>
              <span className="text-[10px] xs:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/70 text-emerald-200 backdrop-blur-xs border border-emerald-400/40 inline-flex items-center gap-1 shadow-2xs">
                <Compass className="h-3 w-3 text-emerald-300" />
                Trending
              </span>
            </div>

            <div className="space-y-1 sm:space-y-1.5 my-auto">
              <h3 className="font-bold text-sm xs:text-base sm:text-lg text-white group-hover:text-emerald-200 transition-colors leading-tight truncate drop-shadow-md">
                Discover Places
              </h3>
              <p className="hidden md:block text-[11px] lg:text-xs text-white/85 leading-snug drop-shadow-xs">
                Bulusan, Gubat, Matnog & hidden spots.
              </p>
              {/* Micro preview tag */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/45 backdrop-blur-xs text-[10px] xs:text-[11px] text-white/95 font-medium border border-white/15 max-w-full">
                <Star className="h-3 w-3 fill-amber-300 text-amber-300 shrink-0" />
                <span className="truncate">14 Towns & Spots</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] xs:text-xs font-semibold text-emerald-300 group-hover:text-white pt-2 border-t border-white/15 transition-colors drop-shadow-xs">
              <span>Browse spots</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform text-emerald-300" />
            </div>
          </div>
        </Link>

        {/* Floating Card 3: Bottom Left (Meet People) - Staggered higher for dynamic non-aligned float */}
        <Link
          href="/explore"
          className="absolute bottom-5 xs:bottom-6 sm:bottom-8 lg:bottom-11 left-2 xs:left-3 sm:left-4 lg:left-6 xl:left-10 w-[176px] xs:w-[190px] sm:w-52 md:w-56 lg:w-60 h-[182px] xs:h-[198px] sm:h-54 md:h-58 lg:h-62 p-3 xs:p-3.5 sm:p-4 md:p-4 lg:p-5 rounded-2xl lg:rounded-3xl border border-white/20 dark:border-white/10 ring-1 ring-purple-500/30 shadow-[0_4px_24px_-4px_rgba(168,85,247,0.3)] hover:shadow-[0_8px_32px_-4px_rgba(168,85,247,0.45)] hover:scale-105 active:scale-95 transition-all duration-300 flex flex-col justify-between group cursor-pointer z-20 animate-float-3 overflow-hidden"
        >
          {/* Background Community Friends Image */}
          <img
            src="/hero/people.jpg"
            alt="Meet People"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          {/* Protective Dark Gradient Overlay with Purple Tint */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-purple-950/30 group-hover:via-black/45 transition-colors" />

          {/* Card Content Overlay */}
          <div className="relative z-10 h-full flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <div className="p-1.5 sm:p-2 rounded-xl bg-purple-500/35 text-white border border-purple-400/40 backdrop-blur-xs group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-purple-200" />
              </div>
              <span className="text-[10px] xs:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-950/70 text-purple-200 backdrop-blur-xs border border-purple-400/40 flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Circles
              </span>
            </div>

            <div className="space-y-1 sm:space-y-1.5 my-auto">
              <h3 className="font-bold text-sm xs:text-base sm:text-lg text-white group-hover:text-purple-200 transition-colors leading-tight truncate drop-shadow-md">
                Meet People
              </h3>
              <p className="hidden md:block text-[11px] lg:text-xs text-white/85 leading-snug drop-shadow-xs">
                Connect with locals in active group chats.
              </p>
              {/* Micro preview avatar stack */}
              <div className="flex items-center gap-1.5 max-w-full">
                <div className="flex -space-x-1 shrink-0">
                  <span className="inline-flex h-4 w-4 sm:h-4.5 sm:w-4.5 items-center justify-center rounded-full bg-blue-500 text-[8px] sm:text-[9px] font-bold text-white ring-1 ring-white/50">
                    S
                  </span>
                  <span className="inline-flex h-4 w-4 sm:h-4.5 sm:w-4.5 items-center justify-center rounded-full bg-purple-500 text-[8px] sm:text-[9px] font-bold text-white ring-1 ring-white/50">
                    M
                  </span>
                  <span className="inline-flex h-4 w-4 sm:h-4.5 sm:w-4.5 items-center justify-center rounded-full bg-emerald-500 text-[8px] sm:text-[9px] font-bold text-white ring-1 ring-white/50">
                    R
                  </span>
                </div>
                <span className="text-[10px] xs:text-[11px] text-white/95 font-medium truncate drop-shadow-xs">+30 Chats</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] xs:text-xs font-semibold text-purple-300 group-hover:text-white pt-2 border-t border-white/15 transition-colors drop-shadow-xs">
              <span>Join chats</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform text-purple-300" />
            </div>
          </div>
        </Link>

        {/* Floating Card 4: Bottom Right (Live Map Radar) */}
        <Link
          href="/map"
          className="absolute bottom-4 xs:bottom-5 sm:bottom-6 lg:bottom-8 right-2 xs:right-3 sm:right-4 lg:right-6 xl:right-10 w-[176px] xs:w-[190px] sm:w-52 md:w-56 lg:w-60 h-[182px] xs:h-[198px] sm:h-54 md:h-58 lg:h-62 p-3 xs:p-3.5 sm:p-4 md:p-4 lg:p-5 rounded-2xl lg:rounded-3xl border border-white/20 dark:border-white/10 ring-1 ring-amber-500/30 shadow-[0_4px_24px_-4px_rgba(245,158,11,0.3)] hover:shadow-[0_8px_32px_-4px_rgba(245,158,11,0.45)] hover:scale-105 active:scale-95 transition-all duration-300 flex flex-col justify-between group cursor-pointer z-20 animate-float-4 overflow-hidden"
        >
          {/* Background Live Map Radar Image */}
          <img
            src="/hero/map.jpg"
            alt="Live Map Radar"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          {/* Protective Dark Gradient Overlay with Amber Tint */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-amber-950/30 group-hover:via-black/45 transition-colors" />

          {/* Card Content Overlay */}
          <div className="relative z-10 h-full flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/35 text-white border border-amber-400/40 backdrop-blur-xs group-hover:scale-110 transition-transform">
                <Radio className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-amber-200" />
              </div>
              <span className="text-[10px] xs:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-950/70 text-amber-200 backdrop-blur-xs border border-amber-400/40 inline-flex items-center gap-1 shadow-2xs">
                <Navigation className="h-3 w-3 text-amber-300" />
                Radar
              </span>
            </div>

            <div className="space-y-1 sm:space-y-1.5 my-auto">
              <h3 className="font-bold text-sm xs:text-base sm:text-lg text-white group-hover:text-amber-200 transition-colors leading-tight truncate drop-shadow-md">
                Live Map
              </h3>
              <p className="hidden md:block text-[11px] lg:text-xs text-white/85 leading-snug drop-shadow-xs">
                Real-time pins and location check-ins.
              </p>
              {/* Micro preview radar indicator */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/45 backdrop-blur-xs text-[10px] xs:text-[11px] text-white/95 font-medium border border-white/15 max-w-full">
                <MapPin className="h-3 w-3 text-amber-300 shrink-0" />
                <span className="truncate">Live Pins</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] xs:text-xs font-semibold text-amber-300 group-hover:text-white pt-2 border-t border-white/15 transition-colors drop-shadow-xs">
              <span>Open radar</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform text-amber-300" />
            </div>
          </div>
        </Link>

        {/* Center Hero Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-[290px] xs:max-w-[320px] sm:max-w-xl lg:max-w-2xl px-2 sm:px-2 py-1 sm:py-2">
          {/* Badge with clean pulsing live indicator */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1 sm:py-1 rounded-full text-[11px] xs:text-xs sm:text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-2 sm:mb-4 shadow-xs">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-rose-500" />
            </span>
            <span>Welcome to Sorsogon</span>
          </div>

          {/* Headline - balanced two-line flow */}
          <h1 className="text-2xl xs:text-[28px] sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] mb-2 sm:mb-3 max-w-xl">
            Discover what&apos;s happening{" "}
            <span className="whitespace-nowrap bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 bg-clip-text text-transparent">
              around you.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs xs:text-sm sm:text-base lg:text-lg text-muted-foreground max-w-[270px] xs:max-w-sm sm:max-w-lg mb-3.5 sm:mb-6 leading-normal sm:leading-relaxed">
            Events. People. Places. Community.
            <br className="hidden sm:inline" /> All connected by location in Sorsogon.
          </p>

          {/* CTA Buttons - Side by Side on Mobile & Desktop */}
          <div className="flex flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto max-w-[290px] xs:max-w-[320px] sm:max-w-none">
            <Link href="/explore" className="flex-1 sm:flex-none">
              <Button
                size="sm"
                className="w-full sm:w-auto px-4 sm:px-6 h-9 xs:h-10 sm:h-11 text-xs xs:text-sm font-semibold bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 hover:from-orange-600 hover:via-rose-600 hover:to-pink-600 text-white border-0 shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/35 transition-all group cursor-pointer"
              >
                <span>Explore Events</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/map" className="flex-1 sm:flex-none">
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto px-4 sm:px-6 h-9 xs:h-10 sm:h-11 text-xs xs:text-sm font-medium bg-background/80 backdrop-blur-xs hover:bg-muted/60 transition-all cursor-pointer"
              >
                <MapPin className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500" />
                <span>Open Map</span>
              </Button>
            </Link>
          </div>

          {/* Popular Categories Quick Pill Bar (Desktop only, hidden on mobile for clean look) */}
          <div className="hidden sm:flex items-center gap-1.5 mt-4 sm:mt-5 max-w-full justify-center text-xs py-0.5">
            <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground mr-0.5 shrink-0">Popular:</span>
            <Link
              href="/events"
              className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-card/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 text-[10px] sm:text-[11px] font-medium transition-all hover:scale-105 shadow-xs shrink-0"
            >
              <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-500" />
              <span>Festivals</span>
            </Link>
            <Link
              href="/places?category=eco"
              className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-card/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 text-[10px] sm:text-[11px] font-medium transition-all hover:scale-105 shadow-xs shrink-0"
            >
              <Trees className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500" />
              <span>Eco Parks</span>
            </Link>
            <Link
              href="/places?category=beaches"
              className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-card/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 text-[10px] sm:text-[11px] font-medium transition-all hover:scale-105 shadow-xs shrink-0"
            >
              <Waves className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-cyan-500" />
              <span>Beaches</span>
            </Link>
            <Link
              href="/places?category=cafes"
              className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-card/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 text-[10px] sm:text-[11px] font-medium transition-all hover:scale-105 shadow-xs shrink-0"
            >
              <Coffee className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" />
              <span>Cafes</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Slim Single-Screen Footer */}
      <footer className="shrink-0 h-8 sm:h-10 w-full border-t border-border/40 bg-background/50 backdrop-blur-xs z-20 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>&copy; {new Date().getFullYear()} Mingle. All rights reserved.</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span>Sorsogon, Philippines</span>
            <span>&bull;</span>
            <span className="text-primary font-medium">Location-Based Community</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
