import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

function genToken() {
  try {
    if (typeof randomUUID === "function") return randomUUID();
  } catch (e) {
    // ignore
  }
  return randomBytes(16).toString("hex");
}

async function getAuthUser(supabase: any) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  return userId ?? null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email ?? null;
    const role = body?.role ?? "member";
    const expiresAt = body?.expiresAt ?? null;

    if (role !== "admin" && role !== "member") {
      return NextResponse.json({ error: "invalid role" }, { status: 400 });
    }

    const supabase = await createClient();
    const userId = await getAuthUser(supabase);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Fetch profile to ensure user is admin and get tenant_id
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", userId)
      .single();

    if (profileErr || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const tenantId = profile.tenant_id;

    const token = genToken();

    const insert = await supabase.from("invites").insert({
      token,
      email,
      role,
      created_by: userId,
      tenant_id: tenantId,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    }).select().single();

    if (insert.error) {
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }

    // Attempt to send an email if configured (SENDGRID)
    let email_sent = false;
    try {
      const inviteUrlBase = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL ?? "";
      const inviteLink = inviteUrlBase ? `${inviteUrlBase.replace(/\/$/,"")}/auth/signup?invite=${token}` : null;

      const sendgridKey = process.env.SENDGRID_API_KEY;
      const fromEmail = process.env.SENDGRID_FROM_EMAIL;

      if (sendgridKey && fromEmail && email && inviteLink) {
        const payload = {
          personalizations: [
            {
              to: [{ email }],
              subject: `You're invited to join Procurement Radar`,
            },
          ],
          from: { email: fromEmail },
          content: [
            {
              type: 'text/plain',
              value: `You have been invited to join Procurement Radar. Use this link to sign up:\n\n${inviteLink}\n\nIf you did not expect this, ignore this email.`,
            },
          ],
        };

        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        email_sent = true;
      }
    } catch (e) {
      // Non-fatal: email failure doesn't block invite creation
      console.error('Invite email error', e);
    }

    return NextResponse.json({ invite: insert.data, email_sent }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const userId = await getAuthUser(supabase);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", userId)
      .single();

    if (profileErr || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const tenantId = profile.tenant_id;

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const per_page = Math.min(100, Math.max(5, parseInt(url.searchParams.get('per_page') || '10')));
    const q = (url.searchParams.get('q') || '').trim();

    let builder: any = supabase
      .from('invites')
      .select('id, token, email, role, used, expires_at, created_at, revoked_by, revoked_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (q) {
      // search token or email
      builder = builder.or(`token.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    const { data: invites, error, count } = await builder.range(from, to);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ invites, meta: { page, per_page, total: count || 0 } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const id = body?.id ?? null;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    const supabase = await createClient();
    const userId = await getAuthUser(supabase);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", userId)
      .single();

    if (profileErr || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const tenantId = profile.tenant_id;

    // Ensure invite belongs to this tenant
    const { data: existing, error: getErr } = await supabase
      .from('invites')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (getErr || !existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // mark used and set revoked audit fields
    const { error: updErr } = await supabase
      .from('invites')
      .update({ used: true, revoked_by: userId, revoked_at: new Date().toISOString() })
      .eq('id', id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
