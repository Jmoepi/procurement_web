import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashCode(code: string) {
  const secret = process.env.OTP_HASH_SECRET;
  if (secret) {
    return crypto.createHmac('sha256', secret).update(code).digest('hex');
  }
  // Fallback to plain SHA256 if no secret provided (less ideal)
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email;
    if (!email) return NextResponse.json({ error: 'missing email' }, { status: 400 });

    const code = genCode();
    const code_hash = hashCode(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    const supabase = await createClient();
    const { error: insertErr } = await supabase.from('email_otps').insert({
      email,
      code_hash,
      expires_at: expiresAt,
    });

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    // send via SendGrid if configured
    try {
      const sendgridKey = process.env.SENDGRID_API_KEY;
      const fromEmail = process.env.SENDGRID_FROM_EMAIL;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL ?? '';

      if (sendgridKey && fromEmail) {
        const payload = {
          personalizations: [{ to: [{ email }], subject: `Your verification code` }],
          from: { email: fromEmail },
          content: [
            {
              type: 'text/plain',
              value: `Your verification code is: ${code}. It expires in 15 minutes.`,
            },
          ],
        };

        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch (e) {
      console.error('OTP email send error', e);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
