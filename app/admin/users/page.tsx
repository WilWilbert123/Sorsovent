import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, UserX, Shield } from "lucide-react";
import { format } from "date-fns";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("profiles")
    .select(`
      id, username, full_name, avatar_url, created_at, is_banned,
      user_roles (role)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm">Manage platform users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users by name or username..." className="pl-9 max-w-sm" />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user: any) => {
              const role = user.user_roles?.[0]?.role || "USER";
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                        {((user.full_name || user.username || "U")[0]).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{user.full_name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">@{user.username}</TableCell>
                  <TableCell>
                    <Badge
                      variant={role === "SUPER_ADMIN" ? "default" : role === "ADMIN" || role === "MODERATOR" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {role === "SUPER_ADMIN" && <Shield className="h-3 w-3 mr-1" />}
                      {role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <Badge variant="destructive" className="text-xs">Banned</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/profile/${user.username}`}>
                        <Button variant="ghost" size="sm" className="text-xs">View</Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
