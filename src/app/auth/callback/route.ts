import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseServerConfig } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const origin = url.origin;

  if (!code) return NextResponse.redirect(`${origin}/auth/login`);

  const cookieStore = await cookies();
  const { url: supabaseUrl, anonKey } = getSupabaseServerConfig();

  const supabase = createServerClient(
    supabaseUrl,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
  }

  const redirectPath = next && next.startsWith("/") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${redirectPath}`);
}
