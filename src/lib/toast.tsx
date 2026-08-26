import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ToastContext, type ToastTone } from './toastContext'

interface ToastMessage {
  id: string
  text: string
  tone: ToastTone
}

const TOAST_DURATION_MS = 2500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const toast = useCallback((text: string, tone: ToastTone = 'default') => {
    const id = crypto.randomUUID()
    setMessages((prev) => [...prev, { id, text, tone }])
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
          <AnimatePresence>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ y: -24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -24, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className={`pointer-events-auto w-full max-w-[400px] rounded-xl px-4 py-3 text-center text-sm font-medium shadow-lg ${
                  m.tone === 'success'
                    ? 'bg-cardamom text-surface'
                    : m.tone === 'error'
                      ? 'bg-chili text-surface'
                      : 'bg-ink text-surface'
                }`}
              >
                {m.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
