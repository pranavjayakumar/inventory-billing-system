import { createContext, useContext } from 'react'

export type ToastTone = 'default' | 'success' | 'error'

export interface ToastContextValue {
  toast: (text: string, tone?: ToastTone) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue['toast'] {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.toast
}
