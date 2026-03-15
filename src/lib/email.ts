type SendEmailOptions = {
  to: string
  subject: string
  text: string
  html?: string
}

export type EmailDeliveryResult = {
  delivered: boolean
  provider: "resend" | "console"
  reason?: string
}

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY
  const from =
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    "Procurement Radar <noreply@procurementradar.co.za>"

  return { apiKey, from }
}

function getEmailTransportMode() {
  const mode = (process.env.EMAIL_TRANSPORT || "auto").trim().toLowerCase()

  if (mode === "console" || mode === "log") {
    return "console"
  }

  if (mode === "resend") {
    return "resend"
  }

  return "auto"
}

function shouldAllowConsoleFallback() {
  const mode = getEmailTransportMode()
  return mode === "console" || (mode === "auto" && process.env.NODE_ENV !== "production")
}

function logConsoleEmail({
  to,
  subject,
  text,
  reason,
}: SendEmailOptions & { reason: string }) {
  console.info(
    [
      "[email:console-fallback]",
      `reason=${reason}`,
      `to=${to}`,
      `subject=${subject}`,
      `text=${text}`,
    ].join(" ")
  )
}

export async function sendTransactionalEmail({
  to,
  subject,
  text,
  html,
}: SendEmailOptions): Promise<EmailDeliveryResult> {
  const { apiKey, from } = getEmailConfig()
  const allowConsoleFallback = shouldAllowConsoleFallback()

  if (!apiKey || !from) {
    if (allowConsoleFallback) {
      const reason = "email provider not configured"
      logConsoleEmail({ to, subject, text, html, reason })
      return {
        delivered: false,
        provider: "console",
        reason,
      }
    }

    throw new Error("Email provider not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.")
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        ...(html ? { html } : {}),
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Resend email failed (${response.status}): ${body}`)
    }
  } catch (error) {
    if (allowConsoleFallback) {
      const reason =
        error instanceof Error ? error.message : "unknown email transport error"
      logConsoleEmail({ to, subject, text, html, reason })
      return {
        delivered: false,
        provider: "console",
        reason,
      }
    }

    throw error
  }

  return {
    delivered: true,
    provider: "resend",
  }
}
