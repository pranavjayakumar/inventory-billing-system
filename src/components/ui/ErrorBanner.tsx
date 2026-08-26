import { AlertCircle } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export default function ErrorBanner({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ref.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' })
  }, [children])

  return (
    <div
      ref={ref}
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-chili/30 bg-chili/10 px-3 py-2.5 text-sm font-medium text-chili"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
