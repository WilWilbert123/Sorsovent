import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminAuditLogsManager } from "@/components/admin/admin-audit-logs-manager";

export default async function AdminAuditLogsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/mingle/login");

  return <AdminAuditLogsManager />;
}
