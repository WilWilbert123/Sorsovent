import { NextResponse } from "next/server";
import { getSystemSettings, getSystemSettingsFromSupabase } from "@/lib/admin/settings";

export async function GET() {
  try {
    const settings = await getSystemSettingsFromSupabase();
    // Return only public-facing platform settings
    return NextResponse.json({
      success: true,
      data: {
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        welcomeMessage: settings.welcomeMessage,
        announcementActive: settings.announcementActive,
        announcementMessage: settings.announcementMessage,
        announcementType: settings.announcementType,
        allowPublicEventCreation: settings.allowPublicEventCreation,
        allowUserRegistration: settings.allowUserRegistration,
        maintenanceMode: settings.maintenanceMode,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (err) {
    const fallback = getSystemSettings();
    return NextResponse.json({
      success: true,
      data: fallback,
    });
  }
}
