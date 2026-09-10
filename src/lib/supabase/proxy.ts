import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/api/whatsapp") ||
    path.startsWith("/api/cron/kebab-stock-alert") ||
    path.startsWith("/auth") ||
    path === "/manifest.webmanifest" ||
    path === "/sw.js";

  if (!user && !isPublic) {
    const next = request.nextUrl.clone();
    next.pathname = "/login";
    next.search = "";
    next.searchParams.set(
      "next",
      `${path}${request.nextUrl.search}`
    );
    return NextResponse.redirect(next);
  }

  if (user && path === "/login") {
    const next = request.nextUrl.clone();
    next.pathname = safeNextPath(request.nextUrl.searchParams.get("next"));
    next.search = "";
    return NextResponse.redirect(next);
  }

  return response;
}
