import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config"

const UnsubscribeTokenSchema = z.string().uuid()

type SubscriptionLookup = {
  id: string
  tenant_id: string
  email: string
  is_active: boolean
}

function getSupabaseAdmin() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig()

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

function maskEmail(email: string) {
  const [localPart, domain = ""] = email.split("@")

  if (!localPart) {
    return email
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? "*"}*@${domain}`
  }

  return `${localPart[0]}${"*".repeat(Math.max(localPart.length - 2, 1))}${localPart.at(-1)}@${domain}`
}

export type UnsubscribeResult =
  | {
      status: "unsubscribed" | "already_unsubscribed"
      email: string
      maskedEmail: string
      tenantName: string | null
    }
  | { status: "invalid_token" }

export function parseUnsubscribeToken(token: unknown) {
  const parsed = UnsubscribeTokenSchema.safeParse(token)
  return parsed.success ? parsed.data : null
}

export async function unsubscribeByToken(token: string): Promise<UnsubscribeResult> {
  const supabase = getSupabaseAdmin()

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("id, tenant_id, email, is_active")
    .eq("unsubscribe_token", token)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to look up subscription: ${error.message}`)
  }

  const row = subscription as SubscriptionLookup | null
  if (!row) {
    return { status: "invalid_token" }
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", row.tenant_id)
    .maybeSingle()

  if (tenantError) {
    throw new Error(`Failed to load tenant: ${tenantError.message}`)
  }

  const tenantName = typeof tenant?.name === "string" ? tenant.name : null

  if (!row.is_active) {
    return {
      status: "already_unsubscribed",
      email: row.email,
      maskedEmail: maskEmail(row.email),
      tenantName,
    }
  }

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)

  if (updateError) {
    throw new Error(`Failed to unsubscribe recipient: ${updateError.message}`)
  }

  return {
    status: "unsubscribed",
    email: row.email,
    maskedEmail: maskEmail(row.email),
    tenantName,
  }
}
