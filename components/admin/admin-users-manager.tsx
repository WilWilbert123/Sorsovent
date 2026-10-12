"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  MoreHorizontal,
  ExternalLink,
  RefreshCw,
  Crown,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface AdminUserItem {
  id: string;
  username: string;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url: string | null;
  created_at: string;
  privacy_settings?: Record<string, any> | null;
  user_roles?: { role: string } | Array<{ role: string }> | null;
}

interface AdminUsersManagerProps {
  initialUsers: AdminUserItem[];
  currentAdminEmail: string;
}

// Helper to reliably extract the role string
export function getUserRole(user: AdminUserItem): string {
  if (!user || !user.user_roles) return "USER";
  if (Array.isArray(user.user_roles)) {
    return user.user_roles[0]?.role || "USER";
  }
  if (typeof user.user_roles === "object") {
    return user.user_roles.role || "USER";
  }
  return "USER";
}

export function AdminUsersManager({ initialUsers, currentAdminEmail }: AdminUsersManagerProps) {
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  // Fetch live users directly from our dedicated API route
  const fetchLiveUsers = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsers(json.data);
        if (showToast) {
          toast.success("User list updated with real-time database state.");
        }
      }
    } catch (err) {
      console.error("Error refreshing users:", err);
      if (showToast) {
        toast.error("Failed to refresh users.");
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Real-time Supabase Subscription
  useEffect(() => {
    const supabase = createClient();

    // 1. Broadcast channel for peer admin updates
    const broadcastChannel = supabase.channel("realtime:admin-users");

    broadcastChannel
      .on("broadcast", { event: "user_role_changed" }, (payload) => {
        const { targetUserId, newRole } = payload.payload;
        if (targetUserId && newRole) {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === targetUserId ? { ...u, user_roles: { role: newRole } } : u
            )
          );
        }
      })
      .on("broadcast", { event: "user_ban_changed" }, (payload) => {
        const { targetUserId, isBanned } = payload.payload;
        if (targetUserId !== undefined) {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === targetUserId
                ? {
                    ...u,
                    privacy_settings: { ...(u.privacy_settings || {}), is_banned: isBanned },
                  }
                : u
            )
          );
        }
      })
      .subscribe();

    // 2. Postgres change listeners for profiles and user_roles
    const dbChannel = supabase
      .channel("public:admin_users:changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchLiveUsers(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => {
        fetchLiveUsers(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
    };
  }, []);

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const displayName = u.display_name || u.full_name || u.username;
      const nameMatch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase());

      const role = getUserRole(u);
      const isBanned = Boolean(u.privacy_settings?.is_banned);

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admins" && (role === "ADMIN" || role === "SUPER_ADMIN" || role === "MODERATOR")) ||
        (roleFilter === "users" && role === "USER" && !isBanned) ||
        (roleFilter === "banned" && isBanned);

      return nameMatch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Statistics
  const stats = useMemo(() => {
    let adminsCount = 0;
    let moderatorsCount = 0;
    let suspendedCount = 0;

    users.forEach((u) => {
      const role = getUserRole(u);
      if (role === "ADMIN" || role === "SUPER_ADMIN") adminsCount++;
      if (role === "MODERATOR") moderatorsCount++;
      if (Boolean(u.privacy_settings?.is_banned)) suspendedCount++;
    });

    return {
      total: users.length,
      admins: adminsCount,
      moderators: moderatorsCount,
      suspended: suspendedCount,
    };
  }, [users]);

  // Handle Role Assignment (Promote to Admin, Make Moderator, Set to User)
  const handleUpdateRole = async (targetUserId: string, newRole: string, targetUsername: string) => {
    startTransition(async () => {
      try {
        // Optimistic update
        setUsers((prev) =>
          prev.map((u) =>
            u.id === targetUserId ? { ...u, user_roles: { role: newRole } } : u
          )
        );

        const res = await fetch("/api/admin/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_user_role",
            payload: { targetUserId, newRole, targetUsername },
          }),
        });

        const data = await res.json();
        if (data.success) {
          toast.success(data.message || `Role updated to ${newRole}`);

          // Broadcast to other admin instances
          const supabase = createClient();
          supabase.channel("realtime:admin-users").send({
            type: "broadcast",
            event: "user_role_changed",
            payload: { targetUserId, newRole },
          });
        } else {
          toast.error(data.error || "Failed to update role");
          fetchLiveUsers(false);
        }
      } catch (err: any) {
        toast.error(err.message || "Network error");
        fetchLiveUsers(false);
      }
    });
  };

  // Handle User Suspension / Restoration
  const handleToggleBan = async (targetUserId: string, currentBanStatus: boolean, targetUsername: string) => {
    const newBanStatus = !currentBanStatus;
    startTransition(async () => {
      try {
        // Optimistic update
        setUsers((prev) =>
          prev.map((u) =>
            u.id === targetUserId
              ? {
                  ...u,
                  privacy_settings: { ...(u.privacy_settings || {}), is_banned: newBanStatus },
                }
              : u
          )
        );

        const res = await fetch("/api/admin/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "toggle_user_ban",
            payload: { targetUserId, isBanned: newBanStatus, targetUsername },
          }),
        });

        const data = await res.json();
        if (data.success) {
          toast.success(data.message);

          // Broadcast to other admin instances
          const supabase = createClient();
          supabase.channel("realtime:admin-users").send({
            type: "broadcast",
            event: "user_ban_changed",
            payload: { targetUserId, isBanned: newBanStatus },
          });
        } else {
          toast.error(data.error || "Failed to toggle status");
          fetchLiveUsers(false);
        }
      } catch (err: any) {
        toast.error(err.message || "Network error");
        fetchLiveUsers(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Users Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time platform profiles, role assignments, and member moderation
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLiveUsers(true)}
          disabled={isRefreshing}
          className="gap-1.5 text-xs h-9 self-start sm:self-auto rounded-full"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3.5">
        <div className="bg-card border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Registered</p>
          <p className="text-lg sm:text-2xl font-bold mt-0.5 text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Administrators</p>
          <p className="text-lg sm:text-2xl font-bold mt-0.5 text-primary">{stats.admins}</p>
        </div>
        <div className="bg-card border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Moderators</p>
          <p className="text-lg sm:text-2xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
            {stats.moderators}
          </p>
        </div>
        <div className="bg-card border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Suspended</p>
          <p className="text-lg sm:text-2xl font-bold mt-0.5 text-destructive">{stats.suspended}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search username or name..."
            className="pl-8 h-8 sm:h-9 text-xs bg-card rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {[
            { id: "all", label: "All Users" },
            { id: "admins", label: "Staff & Admins" },
            { id: "users", label: "Standard Users" },
            { id: "banned", label: "Suspended" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                roleFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="border rounded-xl sm:rounded-2xl bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] sm:text-xs py-2 px-2.5 sm:px-4">Profile</TableHead>
                <TableHead className="text-[11px] sm:text-xs py-2 px-2.5 sm:px-4 hidden md:table-cell">Username</TableHead>
                <TableHead className="text-[11px] sm:text-xs py-2 px-2 sm:px-4">Role</TableHead>
                <TableHead className="text-[11px] sm:text-xs py-2 px-2 sm:px-4">Status</TableHead>
                <TableHead className="text-[11px] sm:text-xs py-2 px-2.5 sm:px-4 hidden lg:table-cell">Joined Date</TableHead>
                <TableHead className="text-[11px] sm:text-xs py-2 px-2 sm:px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <div className="flex flex-col items-center gap-1.5">
                      <Users className="h-7 w-7 opacity-30" />
                      <p className="text-xs sm:text-sm font-medium">No users matched</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const role = getUserRole(user);
                  const isSuperAdmin = role === "SUPER_ADMIN";
                  const isBanned = Boolean(user.privacy_settings?.is_banned);
                  const joinDate = user.created_at ? new Date(user.created_at) : null;
                  const displayName = user.display_name || user.full_name || user.username;

                  return (
                    <TableRow key={user.id} className="hover:bg-muted/40 transition-colors">
                      {/* User Profile */}
                      <TableCell className="py-2.5 px-2.5 sm:px-4">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <Avatar className="h-7 w-7 sm:h-9 sm:w-9 border border-primary/10 shrink-0">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] sm:text-xs font-semibold bg-primary/10 text-primary">
                              {(displayName || "U")[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{displayName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Username (Desktop) */}
                      <TableCell className="text-xs py-2.5 px-2.5 sm:px-4 hidden md:table-cell">
                        <Link
                          href={`/profile/${user.username}`}
                          className="font-medium hover:text-primary transition-colors inline-flex items-center gap-1 group"
                        >
                          @{user.username}
                          <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </TableCell>

                      {/* Role */}
                      <TableCell className="py-2.5 px-2 sm:px-4">
                        {isSuperAdmin ? (
                          <Badge variant="default" className="text-[9px] sm:text-[10px] px-1.5 py-0.5 gap-1 bg-primary text-primary-foreground font-semibold shadow-2xs whitespace-nowrap">
                            <Crown className="h-2.5 w-2.5 text-amber-300" /> Super Admin
                          </Badge>
                        ) : role === "ADMIN" ? (
                          <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0.5 gap-1 border-primary/30 text-primary bg-primary/10 font-medium whitespace-nowrap">
                            <Shield className="h-2.5 w-2.5" /> Admin
                          </Badge>
                        ) : role === "MODERATOR" ? (
                          <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0.5 gap-1 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-medium whitespace-nowrap">
                            <ShieldAlert className="h-2.5 w-2.5" /> Mod
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0.5 text-muted-foreground whitespace-nowrap">
                            User
                          </Badge>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-2.5 px-2 sm:px-4">
                        {isBanned ? (
                          <Badge variant="destructive" className="text-[9px] sm:text-[10px] px-1.5 py-0.5 gap-1 font-medium whitespace-nowrap">
                            <UserX className="h-2.5 w-2.5" /> Suspended
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0.5 gap-1 border-emerald-500/30 text-emerald-600 bg-emerald-500/5 font-medium whitespace-nowrap">
                            <UserCheck className="h-2.5 w-2.5" /> Active
                          </Badge>
                        )}
                      </TableCell>

                      {/* Joined Date (Large screens) */}
                      <TableCell className="text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap py-2.5 px-2.5 sm:px-4 hidden lg:table-cell">
                        {joinDate ? format(joinDate, "MMM d, yyyy") : "—"}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right py-2.5 px-2 sm:px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                            <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                          </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel className="text-xs">User Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => window.open(`/profile/${user.username}`, "_blank")}
                            className="cursor-pointer text-xs"
                          >
                            <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Profile
                          </DropdownMenuItem>

                          {!isSuperAdmin ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs">Assign Role</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(user.id, "ADMIN", user.username)}
                                disabled={isPending || role === "ADMIN"}
                                className="text-xs cursor-pointer font-medium"
                              >
                                <Shield className="mr-2 h-3.5 w-3.5 text-primary" /> Promote to Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(user.id, "MODERATOR", user.username)}
                                disabled={isPending || role === "MODERATOR"}
                                className="text-xs cursor-pointer font-medium"
                              >
                                <ShieldAlert className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Make Moderator
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(user.id, "USER", user.username)}
                                disabled={isPending || role === "USER"}
                                className="text-xs cursor-pointer"
                              >
                                <Users className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Set to User
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleBan(user.id, isBanned, user.username)}
                                disabled={isPending}
                                className={`text-xs cursor-pointer font-medium ${
                                  isBanned ? "text-emerald-600 focus:text-emerald-600" : "text-destructive focus:text-destructive"
                                }`}
                              >
                                {isBanned ? (
                                  <>
                                    <UserCheck className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Restore Account
                                  </>
                                ) : (
                                  <>
                                    <UserX className="mr-2 h-3.5 w-3.5 text-destructive" /> Suspend User
                                  </>
                                )}
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-amber-400" />
                                Protected Super Admin
                              </div>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
