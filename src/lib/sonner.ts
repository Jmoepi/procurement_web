"use client"

import type { ReactNode } from "react"

import type { ToastActionElement } from "@/components/ui/toast"
import { dismissToast, toast as showToast } from "@/hooks/use-toast"

type ToastPayload = {
  title?: ReactNode
  description?: ReactNode
  action?: ToastActionElement
  duration?: number
}

type ToastCall = string | ToastPayload

type ToastFn = {
  (message: ToastCall, options?: Omit<ToastPayload, "title">): ReturnType<
    typeof showToast
  >
  success: (
    message: string,
    options?: Omit<ToastPayload, "title">
  ) => ReturnType<typeof showToast>
  error: (
    message: string,
    options?: Omit<ToastPayload, "title">
  ) => ReturnType<typeof showToast>
  dismiss: (toastId?: string) => void
}

function dispatchToast(
  message: ToastCall,
  options?: Omit<ToastPayload, "title">,
  variant?: "default" | "success" | "destructive"
) {
  if (typeof message === "string") {
    return showToast({
      title: message,
      description: options?.description,
      action: options?.action,
      duration: options?.duration,
      variant,
    })
  }

  return showToast({
    ...message,
    variant,
  })
}

const toast = Object.assign(
  (message: ToastCall, options?: Omit<ToastPayload, "title">) =>
    dispatchToast(message, options),
  {
    success: (message: string, options?: Omit<ToastPayload, "title">) =>
      dispatchToast(message, options, "success"),
    error: (message: string, options?: Omit<ToastPayload, "title">) =>
      dispatchToast(message, options, "destructive"),
    dismiss: dismissToast,
  }
) as ToastFn

export { toast }
