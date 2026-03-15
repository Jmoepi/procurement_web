import type { Profile, Tenant, UserRole } from "@/types";
import { hasAdminAccess } from "@/lib/roles";
import type { User } from "@supabase/supabase-js";

type WorkspaceMembershipRow = {
  tenant_id: string;
  role: UserRole;
  tenant?: Tenant | null;
};

type ProfileRow = Omit<Profile, "tenant"> & { tenant?: Tenant | null };

export type WorkspaceContext = {
  user: User;
  userId: string;
  tenantId: string;
  role: UserRole;
  hasAdminAccess: boolean;
  profile: Profile | null;
};

export async function getCurrentWorkspaceContext(supabase: any): Promise<WorkspaceContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [profileResult, membershipResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, tenant_id, role, full_name, avatar_url, created_at, updated_at, tenant:tenants(*)")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("tenant_memberships")
      .select("tenant_id, role, tenant:tenants(*)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = (profileResult.data ?? null) as ProfileRow | null;
  const membership = (membershipResult.data ?? null) as WorkspaceMembershipRow | null;
  const tenantId = membership?.tenant_id ?? profile?.tenant_id ?? "";
  const role = membership?.role ?? profile?.role ?? "member";
  const tenant = membership?.tenant ?? profile?.tenant ?? undefined;

  if (!profile && !tenantId) {
    return null;
  }

  const normalizedProfile: Profile | null = profile
    ? {
        ...profile,
        tenant_id: tenantId || profile.tenant_id,
        role,
        tenant,
      }
    : {
        id: user.id,
        tenant_id: tenantId,
        role,
        full_name: user.user_metadata?.full_name ?? "",
        avatar_url: user.user_metadata?.avatar_url ?? "",
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
        tenant,
      };

  return {
    user,
    userId: user.id,
    tenantId,
    role,
    hasAdminAccess: hasAdminAccess(role),
    profile: normalizedProfile,
  };
}
