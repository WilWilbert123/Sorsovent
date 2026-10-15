import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSystemSettingsFromSupabase } from "@/lib/admin/settings";
import { AdminSettingsManager } from "@/components/admin/admin-settings-manager";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/mingle/login");

  // Fetch live settings persisted in Supabase
  const settings = await getSystemSettingsFromSupabase();

  return <AdminSettingsManager initialSettings={settings} />;
}
