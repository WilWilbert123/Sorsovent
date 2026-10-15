import { MapPin, ArrowLeft, Calendar, Compass, Users } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col bg-background text-foreground relative select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-primary/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b814_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none -z-10" />

      {/* Auth Navigation Header */}
      <header className="shrink-0 h-13 sm:h-14 border-b border-border/50 bg-background/70 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between z-20">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
          <div className="h-3.5 w-px bg-border/60 hidden sm:block" />
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight">MINGLE</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle variant="icon" />
        </div>
      </header>

      {/* Auth Main Arena */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto lg:overflow-hidden">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center my-auto">
          {/* Left Branded Showcase Panel (Desktop view) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-4 pr-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 mb-2.5 shadow-xs">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                <span>Sorsogon Community Hub</span>
              </div>
              <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                Your gateway to{" "}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                  local happenings.
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Connect with the people, events, and scenic places that make Sorsogon special.
              </p>
            </div>

            {/* Feature preview cards */}
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-card/60 border border-border/60 backdrop-blur-md flex items-center gap-3 shadow-xs">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-foreground truncate">Local Events & Fiestas</h4>
                  <p className="text-[10px] text-muted-foreground truncate">Town festivals, surf meets & gatherings</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-card/60 border border-border/60 backdrop-blur-md flex items-center gap-3 shadow-xs">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Compass className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-foreground truncate">14 Municipalities Mapped</h4>
                  <p className="text-[10px] text-muted-foreground truncate">Bulusan Lake, Paguriran & local spots</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-card/60 border border-border/60 backdrop-blur-md flex items-center gap-3 shadow-xs">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-foreground truncate">Community Chat Circles</h4>
                  <p className="text-[10px] text-muted-foreground truncate">Meet locals sharing common passions</p>
                </div>
              </div>
            </div>

            {/* Bottom active network badge */}
            <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
              <div className="flex -space-x-1.5 overflow-hidden">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white ring-1 ring-background">
                  WG
                </span>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold text-white ring-1 ring-background">
                  RA
                </span>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white ring-1 ring-background">
                  MV
                </span>
              </div>
              <span>Active community network across Sorsogon</span>
            </div>
          </div>

          {/* Right Column: Form Container */}
          <div className="col-span-1 lg:col-span-6 w-full flex flex-col items-center justify-center">
            {/* Small Mobile-only Feature Pills */}
            <div className="flex lg:hidden items-center justify-center gap-1.5 mb-2.5 text-[10px] text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card/80 border border-border/60">
                <Calendar className="h-2.5 w-2.5 text-blue-500" />
                <span>Events</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card/80 border border-border/60">
                <Compass className="h-2.5 w-2.5 text-emerald-500" />
                <span>14 Towns</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card/80 border border-border/60">
                <Users className="h-2.5 w-2.5 text-purple-500" />
                <span>Chats</span>
              </span>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
