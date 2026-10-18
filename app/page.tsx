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
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[360px] bg-primary/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-12 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-12 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-[110px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--background)_80%)] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b818_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="shrink-0 h-14 sm:h-16 w-full border-b border-border/50 bg-background/70 backdrop-blur-md z-30">
        <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <MapPin className="h-5 w-5" />
            </div>
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
              <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm shadow-xs font-semibold px-3 sm:px-4">
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
          className="absolute top-1.5 xs:top-2 sm:top-5 lg:top-7 left-1.5 xs:left-2 sm:left-4 lg:left-8 xl:left-14 aspect-square w-[124px] xs:w-[138px] sm:w-44 md:w-52 lg:w-56 h-[124px] xs:h-[138px] sm:h-44 md:h-52 lg:h-56 p-2 xs:p-2.5 sm:p-3.5 md:p-4 lg:p-5 rounded-2xl lg:rounded-3xl border border-white/25 dark:border-white/15 shadow-md md:shadow-[0_10px_35px_-8px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group cursor-pointer z-20 animate-float-1 overflow-hidden"
        >
          {/* Background Event Celebration Image */}
          <img
            src="/hero/events.jpg"
            alt="Create Events"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          {/* Protective Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/35 group-hover:via-black/40 transition-colors" />

          {/* Card Content Overlay */}
          <div className="relative z-10 h-full flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-blue-500/25 text-blue-200 border border-blue-400/30 backdrop-blur-md group-hover:scale-110 transition-transform">
                <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              </div>
              <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/25 inline-flex items-center gap-1 shadow-2xs">
                <Calendar className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-blue-300" />
                Events
              </span>
            </div>

            <div className="space-y-0.5 sm:space-y-1.5 my-auto">
              <h3 className="font-bold text-[11px] xs:text-xs sm:text-sm md:text-base text-white group-hover:text-blue-300 transition-colors leading-tight truncate drop-shadow-md">
                Create Events
              </h3>
              <p className="hidden md:block text-[11px] lg:text-xs text-white/85 leading-snug drop-shadow-xs">
                Host gatherings & invite the community.
              </p>
              {/* Micro preview tag */}
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-[8px] xs:text-[9px] sm:text-[10px] text-white font-medium max-w-full border border-white/15">
                <Clock className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-blue-300 shrink-0" />
                <span className="truncate">Oct 18 · Festival</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] xs:text-[10px] sm:text-[11px] font-semibold text-blue-300 group-hover:text-white pt-1 sm:pt-2 border-t border-white/20 transition-colors drop-shadow-xs">
              <span>Explore list</span>
              <ChevronRight className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 group-hover:translate-x-1 transition-transform text-blue-300" />
            </div>
          </div>
        </Link>

        {/* Floating Card 2: Top Right (Discover Places) */}
        <Link
          href="/places"
          className="absolute top-1.5 xs:top-2 sm:top-5 lg:top-7 right-1.5 xs:right-2 sm:right-4 lg:right-8 xl:right-14 aspect-square w-[124px] xs:w-[138px] sm:w-44 md:w-52 lg:w-56 h-[124px] xs:h-[138px] sm:h-44 md:h-52 lg:h-56 p-2 xs:p-2.5 sm:p-3.5 md:p-4 lg:p-5 rounded-2xl lg:rounded-3xl border border-white/25 dark:border-white/15 shadow-md md:shadow-[0_10px_35px_-8px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group cursor-pointer z-20 animate-float-2 overflow-hidden"
        >
          {/* Background Discover Places Image */}
          <img
            src="/hero/places.jpg"
            alt="Discover Places"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          {/* Protective Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/35 group-hover:via-black/40 transition-colors" />

          {/* Card Content Overlay */}
          <div className="relative z-10 h-full flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 backdrop-blur-md group-hover:scale-110 transition-transform">
                <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              </div>
              <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/25 inline-flex items-center gap-1 shadow-2xs">
                <Compass className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-emerald-300" />
                Trending
              </span>
            </div>

            <div className="space-y-0.5 sm:space-y-1.5 my-auto">
              <h3 className="font-bold text-[11px] xs:text-xs sm:text-sm md:text-base text-white group-hover:text-emerald-300 transition-colors leading-tight truncate drop-shadow-md">
                Discover Places
              </h3>
              <p className="hidden md:block text-[11px] lg:text-xs text-white/85 leading-snug drop-shadow-xs">
                Bulusan, Gubat, Matnog & hidden spots.
              </p>
              {/* Micro preview tag */}
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-[8px] xs:text-[9px] sm:text-[10px] text-white font-medium max-w-full border border-white/15">
                <Star className="h-2 w-2 sm:h-2.5 sm:w-2.5 fill-amber-300 text-amber-300 shrink-0" />
                <span className="truncate">14 Towns</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] xs:text-[10px] sm:text-[11px] font-semibold text-emerald-300 group-hover:text-white pt-1 sm:pt-2 border-t border-white/20 transition-colors drop-shadow-xs">
              <span>Browse spots</span>
              <ChevronRight className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 group-hover:translate-x-1 transition-transform text-emerald-300" />
            </div>
          </div>
        </Link>

        {/* Floating Card 3: Bottom Left (Meet People) */}
        <Link
          href="/explore"
          className="absolute bottom-1.5 xs:bottom-2 sm:bottom-5 lg:bottom-10 left-1.5 xs:left-2 sm:left-4 lg:left-6 xl:left-10 aspect-square w-[124px] xs:w-[138px] sm:w-44 md:w-52 lg:w-56 h-[124px] xs:h-[138px] sm:h-44 md:h-52 lg:h-56 p-2 xs:p-2.5 sm:p-3.5 md:p-4 lg:p-5 rounded-2xl lg:rounded-3xl border border-white/25 dark:border-white/15 shadow-md md:shadow-[0_10px_35px_-8px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group cursor-pointer z-20 animate-float-3 overflow-hidden"
        >
          {/* Background Community Friends Image */}
          <img
            src="/hero/people.jpg"
            alt="Meet People"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          {/* Protective Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/35 group-hover:via-black/40 transition-colors" />

          {/* Card Content Overlay */}
          <div className="relative z-10 h-full flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-purple-500/25 text-purple-200 border border-purple-400/30 backdrop-blur-md group-hover:scale-110 transition-transform">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              </div>
              <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/25 flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Circles
              </span>
            </div>

            <div className="space-y-0.5 sm:space-y-1.5 my-auto">
              <h3 className="font-bold text-[11px] xs:text-xs sm:text-sm md:text-base text-white group-hover:text-purple-300 transition-colors leading-tight truncate drop-shadow-md">
                Meet People
              </h3>
              <p className="hidden md:block text-[11px] lg:text-xs text-white/85 leading-snug drop-shadow-xs">
                Connect with locals in active group chats.
              </p>
              {/* Micro preview avatar stack */}
              <div className="flex items-center gap-1.5 max-w-full">
                <div className="flex -space-x-1 shrink-0">
                  <span className="inline-flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-blue-500 text-[7px] sm:text-[8px] font-bold text-white ring-1 ring-white/50">
                    S
                  </span>
                  <span className="inline-flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-purple-500 text-[7px] sm:text-[8px] font-bold text-white ring-1 ring-white/50">
                    M
                  </span>
                  <span className="inline-flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-emerald-500 text-[7px] sm:text-[8px] font-bold text-white ring-1 ring-white/50">
                    R
                  </span>
                </div>
                <span className="text-[8px] xs:text-[9px] sm:text-[10px] text-white/90 font-medium truncate drop-shadow-xs">+30 chats</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] xs:text-[10px] sm:text-[11px] font-semibold text-purple-300 group-hover:text-white pt-1 sm:pt-2 border-t border-white/20 transition-colors drop-shadow-xs">
              <span>Join chats</span>
              <ChevronRight className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 group-hover:translate-x-1 transition-transform text-purple-300" />
            </div>
          </div>
        </Link>

        {/* Floating Card 4: Bottom Right (Live Map Radar) */}
        <Link
          href="/map"
          className="absolute bottom-1.5 xs:bottom-2 sm:bottom-5 lg:bottom-10 right-1.5 xs:right-2 sm:right-4 lg:right-6 xl:right-10 aspect-square w-[124px] xs:w-[138px] sm:w-44 md:w-52 lg:w-56 h-[124px] xs:h-[138px] sm:h-44 md:h-52 lg:h-56 p-2 xs:p-2.5 sm:p-3.5 md:p-4 lg:p-5 rounded-2xl lg:rounded-3xl border border-white/25 dark:border-white/15 shadow-md md:shadow-[0_10px_35px_-8px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group cursor-pointer z-20 animate-float-4 overflow-hidden"
        >
          {/* Background Live Map Radar Image */}
          <img
            src="/hero/map.jpg"
            alt="Live Map Radar"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          {/* Protective Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/35 group-hover:via-black/40 transition-colors" />

          {/* Card Content Overlay */}
          <div className="relative z-10 h-full flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-amber-500/25 text-amber-200 border border-amber-400/30 backdrop-blur-md group-hover:scale-110 transition-transform">
                <Radio className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              </div>
              <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/25 inline-flex items-center gap-1 shadow-2xs">
                <Navigation className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-amber-300" />
                Radar
              </span>
            </div>

            <div className="space-y-0.5 sm:space-y-1.5 my-auto">
              <h3 className="font-bold text-[11px] xs:text-xs sm:text-sm md:text-base text-white group-hover:text-amber-300 transition-colors leading-tight truncate drop-shadow-md">
                Live Map
              </h3>
              <p className="hidden md:block text-[11px] lg:text-xs text-white/85 leading-snug drop-shadow-xs">
                Real-time pins and location check-ins.
              </p>
              {/* Micro preview radar indicator */}
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-[8px] xs:text-[9px] sm:text-[10px] text-white font-medium max-w-full border border-white/15">
                <MapPin className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-amber-300 shrink-0" />
                <span className="truncate">Radar</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] xs:text-[10px] sm:text-[11px] font-semibold text-amber-300 group-hover:text-white pt-1 sm:pt-2 border-t border-white/20 transition-colors drop-shadow-xs">
              <span>Open radar</span>
              <ChevronRight className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 group-hover:translate-x-1 transition-transform text-amber-300" />
            </div>
          </div>
        </Link>

        {/* Center Hero Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-[260px] xs:max-w-xs sm:max-w-xl lg:max-w-2xl px-1 sm:px-2 py-0.5 sm:py-2">
          {/* Badge with clean pulsing live indicator */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full text-[10px] xs:text-[11px] sm:text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-1.5 sm:mb-5 shadow-xs animate-in fade-in slide-in-from-top-3 duration-500">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-primary" />
            </span>
            <span>Welcome to Sorsogon</span>
          </div>

          {/* Headline - balanced two-line flow */}
          <h1 className="text-xl xs:text-2xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] mb-1.5 sm:mb-4 max-w-xl">
            Discover what&apos;s happening{" "}
            <span className="whitespace-nowrap bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
              around you.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-[11px] xs:text-xs sm:text-base lg:text-lg text-muted-foreground max-w-[240px] xs:max-w-sm sm:max-w-lg mb-2.5 sm:mb-7 leading-snug sm:leading-relaxed">
            Events. People. Places. Community.
            <br className="hidden sm:inline" /> All connected by location in Sorsogon.
          </p>

          {/* CTA Buttons - Side by Side on Mobile & Desktop */}
          <div className="flex flex-row items-center gap-1.5 sm:gap-3 w-full sm:w-auto max-w-[250px] xs:max-w-[270px] sm:max-w-none">
            <Link href="/explore" className="flex-1 sm:flex-none">
              <Button
                size="sm"
                className="w-full sm:w-auto px-2.5 xs:px-3.5 sm:px-6 h-8 xs:h-9 sm:h-11 text-[11px] xs:text-xs sm:text-sm font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all group cursor-pointer"
              >
                <span>Explore Events</span>
                <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/map" className="flex-1 sm:flex-none">
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto px-2.5 xs:px-3.5 sm:px-6 h-8 xs:h-9 sm:h-11 text-[11px] xs:text-xs sm:text-sm font-medium bg-background/80 backdrop-blur-xs hover:bg-muted/60 transition-all cursor-pointer"
              >
                <MapPin className="mr-1 h-3 w-3 sm:h-4 sm:w-4 text-primary" />
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
