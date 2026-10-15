import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createInAppNotification, removeInAppNotification } from "@/lib/notifications/service";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Please log in to follow members" },
        { status: 401 }
      );
    }

    if (user.id === targetUserId) {
      return NextResponse.json(
        { success: false, error: "You cannot follow yourself" },
        { status: 400 }
      );
    }

    const adminSupabase = getServiceRoleSupabase();

    // Verify target user exists
    const { data: targetProfile } = await adminSupabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("id", targetUserId)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    // Check if already following
    const { data: existingFollow } = await adminSupabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();

    let isFollowing = false;

    if (existingFollow) {
      // Unfollow
      const { error: deleteError } = await adminSupabase
        .from("follows")
        .delete()
        .eq("id", existingFollow.id);

      if (deleteError) {
        throw deleteError;
      }

      isFollowing = false;

      // Remove in-app notification
      try {
        await removeInAppNotification({
          userId: targetUserId,
          actorId: user.id,
          type: "follow",
        });
      } catch (err) {
        console.warn("Could not remove follow notification:", err);
      }
    } else {
      // Follow
      const { error: insertError } = await adminSupabase
        .from("follows")
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
        });

      if (insertError) {
        throw insertError;
      }

      isFollowing = true;

      // Notify the followed user
      try {
        const { data: actorProfile } = await adminSupabase
          .from("profiles")
          .select("username, display_name")
          .eq("id", user.id)
          .maybeSingle();

        const followerName =
          actorProfile?.display_name ||
          actorProfile?.username ||
          "A member";

        await createInAppNotification({
          userId: targetUserId,
          actorId: user.id,
          type: "follow",
          customTitle: "New Follower! 👤",
          customText: `${followerName} started following you.`,
        });
      } catch (notifErr) {
        console.warn("Could not send follow notification:", notifErr);
      }
    }

    // Get updated follower count
    const { count: followerCount } = await adminSupabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", targetUserId);

    return NextResponse.json({
      success: true,
      isFollowing,
      followerCount: followerCount || 0,
      message: isFollowing ? "Following" : "Unfollowed",
    });
  } catch (error: any) {
    console.error("Follow toggle error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update follow status" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminSupabase = getServiceRoleSupabase();

    let isFollowing = false;
    if (user) {
      const { data: existing } = await adminSupabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();
      isFollowing = Boolean(existing);
    }

    const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
      adminSupabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", targetUserId),
      adminSupabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", targetUserId),
    ]);

    return NextResponse.json({
      success: true,
      isFollowing,
      followerCount: followerCount || 0,
      followingCount: followingCount || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get follow status" },
      { status: 500 }
    );
  }
}
