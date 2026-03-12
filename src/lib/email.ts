type SendEmailOptions = {
  to: string
  subject: string
  text: string
  html?: string
}

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY
  const from =
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    "Procurement Radar <noreply@procurementradar.co.za>"

  return { apiKey, from }
}

export async function sendTransactionalEmail({
  to,
  subject,
  text,
  html,
}: SendEmailOptions) {
  const { apiKey, from } = getEmailConfig()

  if (!apiKey || !from) {
    return false
  }

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

  return true
}
