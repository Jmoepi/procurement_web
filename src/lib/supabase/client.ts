
import { createBrowserClient } from "@supabase/ssr";

// Try common env var names for browser usage. Some deployments use different names.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL_OVERRIDE || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    const msg = `Supabase client not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.`;
    // In browser environments we prefer a console warning then throw so stack is clearer.
    // Throwing here prevents calling code from attempting API calls with undefined config.
    throw new Error(msg);
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
};
