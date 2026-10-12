import { createClient } from "@/lib/supabase/server";
import { AdminReportsManager } from "@/components/admin/admin-reports-manager";

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return <AdminReportsManager initialReports={reports || []} />;
}
