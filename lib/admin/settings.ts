import fs from "fs";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export interface SystemSettings {
  platformName: string;
  supportEmail: string;
  welcomeMessage: string;
  allowPublicEventCreation: boolean;
  allowUserRegistration: boolean;
  maintenanceMode: boolean;
  announcementActive: boolean;
  announcementMessage: string;
  announcementType: "info" | "warning" | "success";
  autoSuspendThreshold: number;
  themeAccent: string;
  updatedAt: string;
}

const SETTINGS_FILE_PATH = path.join(process.cwd(), "data", "system_settings.json");

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  platformName: "Sorsovent",
  supportEmail: "support@sorsovent.com",
  welcomeMessage: "Discover and host community events in Sorsogon",
  allowPublicEventCreation: true,
  allowUserRegistration: true,
  maintenanceMode: false,
  announcementActive: false,
  announcementMessage: "Welcome to Sorsovent! Explore upcoming community events.",
  announcementType: "info",
  autoSuspendThreshold: 5,
  themeAccent: "emerald",
  updatedAt: new Date().toISOString(),
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Synchronous local read for ultra-fast server rendering and middleware checks
 */
export function getSystemSettings(): SystemSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const raw = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SYSTEM_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error("Error reading cached system settings:", err);
  }
  return DEFAULT_SYSTEM_SETTINGS;
}

/**
 * Async fetch directly from Supabase (system_settings table or audit_logs fallback)
 */
export async function getSystemSettingsFromSupabase(): Promise<SystemSettings> {
  const supabase = getAdminClient();
  if (supabase) {
    try {
      // 1. Try dedicated system_settings table
      const { data: directData, error: directError } = await supabase
        .from("system_settings")
        .select("settings")
        .eq("id", "current")
        .maybeSingle();

      if (!directError && directData?.settings) {
        const merged = { ...DEFAULT_SYSTEM_SETTINGS, ...directData.settings };
        // Sync local cache
        saveLocalCache(merged);
        return merged;
      }

      // 2. Fallback to audit_logs stored setting
      const { data: auditData, error: auditError } = await supabase
        .from("audit_logs")
        .select("metadata")
        .eq("action", "SYSTEM_SETTINGS_UPDATE")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!auditError && auditData?.metadata) {
        const merged = { ...DEFAULT_SYSTEM_SETTINGS, ...(auditData.metadata as object) };
        saveLocalCache(merged);
        return merged;
      }
    } catch (err) {
      console.error("Error fetching settings from Supabase:", err);
    }
  }

  return getSystemSettings();
}

function saveLocalCache(settings: SystemSettings) {
  try {
    const dir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing local settings cache:", err);
  }
}

/**
 * Persists settings to:
 * 1. Supabase system_settings table (if available)
 * 2. Supabase audit_logs (enabling Supabase Realtime broadcast)
 * 3. Local filesystem cache (ensuring immediate synchronous availability)
 */
export async function saveSystemSettings(
  settings: Partial<SystemSettings>,
  actorId?: string | null
): Promise<SystemSettings> {
  const current = getSystemSettings();
  const updated: SystemSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save local filesystem cache immediately
  saveLocalCache(updated);

  // 2. Persist to Supabase
  const supabase = getAdminClient();
  if (supabase) {
    try {
      // Attempt upsert to system_settings table if it exists
      await supabase.from("system_settings").upsert(
        {
          id: "current",
          settings: updated,
          updated_at: updated.updatedAt,
        },
        { onConflict: "id" }
      );
    } catch (e) {
      // Table may not have been migrated yet; ignore
    }

    try {
      // Insert into audit_logs table (guaranteed table in Supabase, triggers realtime)
      await supabase.from("audit_logs").insert({
        actor_id: actorId || null,
        action: "SYSTEM_SETTINGS_UPDATE",
        target_type: "system",
        metadata: updated,
      });
    } catch (e) {
      console.error("Failed to log settings to Supabase audit_logs:", e);
    }
  }

  return updated;
}
