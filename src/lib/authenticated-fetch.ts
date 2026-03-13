"use client"

import { createClient } from "@/lib/supabase/client"

type ApiEnvelope<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error?: {
        message?: string
      }
      message?: string
    }

export async function authenticatedJsonFetch<T>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  if (!session?.access_token) {
    throw new Error("You are not authenticated.")
  }

  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${session.access_token}`)

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  const raw = await response.text()
  const payload = raw ? (JSON.parse(raw) as ApiEnvelope<T>) : null

  if (!response.ok) {
    const message =
      (payload &&
        "success" in payload &&
        payload.success === false &&
        (payload.error?.message || payload.message)) ||
      `Request failed with status ${response.status}`

    throw new Error(message)
  }

  if (!payload || !("success" in payload) || payload.success !== true) {
    throw new Error("Unexpected API response.")
  }

  return payload.data
}
