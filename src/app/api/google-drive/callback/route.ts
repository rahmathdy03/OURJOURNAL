import { NextRequest, NextResponse } from "next/server";

import {
  ensureThesisDriveFolders,
  googleDriveOAuthConfig,
  saveGoogleDriveConnection,
} from "@/lib/google-drive";
import { requireModule } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appUrl(path: string) {
  const origin = new URL(googleDriveOAuthConfig().redirectUri).origin;
  return new URL(path, origin);
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set("oj_drive_oauth_state", "", { path: "/", maxAge: 0 });
  response.cookies.set("oj_drive_oauth_verifier", "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const { supabase, userId } = await requireModule("academic");
  const url = request.nextUrl;
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const expectedState = request.cookies.get("oj_drive_oauth_state")?.value;
  const verifier = request.cookies.get("oj_drive_oauth_verifier")?.value;

  if (error) {
    return clearOAuthCookies(NextResponse.redirect(appUrl(`/academic/thesis?tab=file&error=${encodeURIComponent(`Google Drive: ${error}`)}`)));
  }
  if (!state || !expectedState || state !== expectedState || !code || !verifier) {
    return clearOAuthCookies(NextResponse.redirect(appUrl("/academic/thesis?tab=file&error=OAuth%20Google%20Drive%20tidak%20valid.")));
  }

  try {
    const config = googleDriveOAuthConfig();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) throw new Error("Google tidak mengembalikan access token.");

    const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const userInfo = await userInfoResponse.json();
    if (!userInfoResponse.ok) throw new Error("Gagal membaca akun Google.");

    await saveGoogleDriveConnection({
      userId,
      googleEmail: String(userInfo.email || ""),
      accessToken: String(token.access_token),
      refreshToken: String(token.refresh_token || ""),
      expiresIn: Number(token.expires_in || 3600),
    });

    const folders = await ensureThesisDriveFolders(userId, String(token.access_token));
    await supabase
      .from("thesis_workspaces")
      .upsert({ user_id: userId, drive_folder_url: folders.folderUrl }, { onConflict: "user_id" });

    return clearOAuthCookies(NextResponse.redirect(appUrl("/academic/thesis?tab=file&saved=drive-connected")));
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Gagal menghubungkan Google Drive.";
    return clearOAuthCookies(NextResponse.redirect(appUrl(`/academic/thesis?tab=file&error=${encodeURIComponent(message)}`)));
  }
}
