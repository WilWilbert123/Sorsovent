"use client";

import { useEffect, useState } from "react";
import { Info, AlertTriangle, CheckCircle2, X, Wrench, Sparkles, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AnnouncementState {
  active: boolean;
  message: string;
  type: "info" | "warning" | "success";
  maintenanceMode: boolean;
}

export function GlobalAnnouncementBanner({
  initialActive = false,
  initialMessage = "",
  initialType = "info" as "info" | "warning" | "success",
}: {
  initialActive?: boolean;
  initialMessage?: string;
  initialType?: "info" | "warning" | "success";
}) {
  const [announcement, setAnnouncement] = useState<AnnouncementState>({
    active: initialActive,
    message: initialMessage,
    type: initialType,
    maintenanceMode: false,
  });
  const [isDismissed, setIsDismissed] = useState(false);

  const fetchLatestSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.data) {
        setAnnouncement({
          active: !!json.data.announcementActive,
          message: json.data.announcementMessage || "",
          type: json.data.announcementType || "info",
          maintenanceMode: !!json.data.maintenanceMode,
        });
      }
    } catch (e) {
      // Ignore network errors
    }
  };

  useEffect(() => {
    fetchLatestSettings();

    const supabase = createClient();

    // Listen to real-time administrative settings changes
    const channel = supabase
      .channel("realtime-global-announcement-ticker")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
          filter: "action=eq.SYSTEM_SETTINGS_UPDATE",
        },
        (payload: any) => {
          const newSettings = payload?.new?.metadata;
          if (newSettings) {
            setAnnouncement({
              active: !!newSettings.announcementActive,
              message: newSettings.announcementMessage || "",
              type: newSettings.announcementType || "info",
              maintenanceMode: !!newSettings.maintenanceMode,
            });
            setIsDismissed(false);
          } else {
            fetchLatestSettings();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_settings",
        },
        (payload: any) => {
          const newSettings = payload?.new?.settings;
          if (newSettings) {
            setAnnouncement({
              active: !!newSettings.announcementActive,
              message: newSettings.announcementMessage || "",
              type: newSettings.announcementType || "info",
              maintenanceMode: !!newSettings.maintenanceMode,
            });
            setIsDismissed(false);
          } else {
            fetchLatestSettings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toneConfig = {
    info: {
      bar: "bg-blue-950 text-blue-100 border-blue-800/40 dark:bg-blue-950/80 dark:border-blue-700/40",
      tag: "bg-blue-600 text-white",
      pulse: "bg-blue-400",
      icon: <Info className="h-3 w-3" />,
    },
    warning: {
      bar: "bg-amber-950 text-amber-100 border-amber-800/40 dark:bg-amber-950/80 dark:border-amber-700/40",
      tag: "bg-amber-600 text-white",
      pulse: "bg-amber-300",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    success: {
      bar: "bg-emerald-950 text-emerald-100 border-emerald-800/40 dark:bg-emerald-950/80 dark:border-emerald-700/40",
      tag: "bg-emerald-600 text-white",
      pulse: "bg-emerald-300",
      icon: <Sparkles className="h-3 w-3" />,
    },
  }[announcement.type];

  // Repeat message multiple times for a seamless, continuous ticker loop
  const repeatedTickerItems = [
    announcement.message,
    announcement.message,
    announcement.message,
    announcement.message,
  ];

  return (
    <>
      {/* 1. Maintenance Mode Slim Line */}
      {announcement.maintenanceMode && (
        <div
          role="alert"
          className="hidden md:flex relative z-50 h-7 shrink-0 border-b px-3 bg-red-950 text-red-100 border-red-800/50 items-center justify-center text-[11px] font-semibold tracking-wide"
        >
          <div className="flex items-center gap-2 truncate">
            <Wrench className="h-3 w-3 text-red-400 animate-spin shrink-0" />
            <span>SYSTEM MAINTENANCE ACTIVE: Mingle is running scheduled upgrades.</span>
          </div>
        </div>
      )}

      {/* 2. Small Slim Moving Marquee Line */}
      {announcement.active && announcement.message && !isDismissed && (
        <aside
          aria-label="Platform Announcement Ticker"
          className={`hidden md:flex relative z-40 h-7.5 shrink-0 w-full overflow-hidden border-b text-[11px] font-medium items-center select-none shadow-xs transition-all ${toneConfig.bar}`}
        >
          {/* Static Left Badge */}
          <div className="relative z-10 flex items-center gap-1.5 px-3 h-full bg-inherit shrink-0 border-r border-white/10 font-mono tracking-wider font-semibold uppercase text-[10px]">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${toneConfig.pulse}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${toneConfig.pulse}`} />
            </span>
            <span className="hidden sm:inline">BULLETIN</span>
          </div>

          {/* Continuous Moving Text Strip */}
          <div className="relative flex-1 overflow-hidden h-full flex items-center mask-[linear-gradient(to_right,transparent,black_20px,black_calc(100%-30px),transparent)]">
            <div className="animate-ticker-marquee flex items-center cursor-default py-0.5">
              {repeatedTickerItems.map((msg, idx) => (
                <div key={idx} className="flex items-center gap-4 shrink-0 px-6">
                  <span className="tracking-wide">{msg}</span>
                  <span className="opacity-40 text-xs select-none">✦</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={() => setIsDismissed(true)}
            title="Dismiss announcement ticker"
            className="relative z-10 h-full px-2.5 flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors shrink-0 text-white/70 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </aside>
      )}
    </>
  );
}
