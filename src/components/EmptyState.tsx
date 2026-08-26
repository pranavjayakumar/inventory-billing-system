import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-border/50">
        <Icon className="h-6 w-6 text-ink/70" strokeWidth={1.75} />
      </div>
      <div>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-ink/70">{description}</p>
      </div>
      {action}
    </div>
  )
}
