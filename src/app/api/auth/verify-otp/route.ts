import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

function hashCode(code: string) {
  const secret = process.env.OTP_HASH_SECRET;
  if (secret) {
    return crypto.createHmac('sha256', secret).update(code).digest('hex');
  }
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email;
    const code = body?.code;
    if (!email || !code) return NextResponse.json({ error: 'missing fields' }, { status: 400 });

    const supabase = await createClient();
    const now = new Date().toISOString();
    const code_hash = hashCode(code);

    const { data, error } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('code_hash', code_hash)
      .eq('used', false)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: 'invalid or expired code' }, { status: 400 });
    }

    const otpRow = data[0];
    const { error: updErr } = await supabase.from('email_otps').update({ used: true }).eq('id', otpRow.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
