"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/lib/sonner"
import { authenticatedJsonFetch } from "@/lib/authenticated-fetch"

interface DigestQueueActionProps {
  hasActiveDigest: boolean
  isAdmin: boolean
}

type QueueDigestResponse = {
  digest: {
    id: string
    status: string
  }
  message: string
}

export function DigestQueueAction({ hasActiveDigest, isAdmin }: DigestQueueActionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleQueueDigest = async () => {
    setLoading(true)

    try {
      const data = await authenticatedJsonFetch<QueueDigestResponse>("/api/digests", {
        method: "POST",
      })

      toast.success("Digest queued", {
        description: data.message,
      })
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to queue digest"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <Button
        onClick={handleQueueDigest}
        disabled={loading || hasActiveDigest || !isAdmin}
        className="min-w-[180px]"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {!isAdmin
          ? "Admin access required"
          : hasActiveDigest
            ? "Digest in progress"
            : "Queue digest now"}
      </Button>
      <p className="text-xs text-muted-foreground">
        {!isAdmin
          ? "Only workspace admins can queue or resend digest runs."
          : hasActiveDigest
          ? "Wait for the current queued run to finish before triggering another."
          : "Use this to send a manual run immediately with the current digest window."}
      </p>
    </div>
  )
}
