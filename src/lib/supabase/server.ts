
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseServerConfig,
  getSupabaseServiceRoleConfig,
} from "@/lib/supabase/config";

export const createClient = async () => {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseServerConfig();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component without permission to set cookies.
            // Fine if you refresh sessions in middleware.
          }
        },
      },
    }
  );
};

// Service-role client (uses service role key). Use carefully and only on trusted server code.
export const createServiceClient = () => {
  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
};
