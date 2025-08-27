// C:\Users\vizir\halal-marriage\src\components\ui\sonner.tsx
import React from "react"

/**
 * No-op Sonner shim: disables all toast popups app-wide while keeping the API.
 * Leave your existing imports as:
 *   import { toast } from "@/components/ui/sonner";
 *   import { Toaster } from "@/components/ui/sonner";
 * This file ensures those calls render nothing and do nothing.
 */

type ToastFn = (..._args: any[]) => void

export const toast: {
  success: ToastFn
  error: ToastFn
  info: ToastFn
  warning: ToastFn
  message: ToastFn
  dismiss: ToastFn
} = {
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
  message: () => {},
  dismiss: () => {},
}

// Render nothing so no popup UI appears
export const Toaster: React.FC = () => null

export default toast
