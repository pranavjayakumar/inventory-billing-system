import { Minus, Plus } from 'lucide-react'

export default function QuantityStepper({
  value,
  onChange,
  min = 0,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease quantity"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper text-ink transition-transform active:scale-90"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-medium tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper text-ink transition-transform active:scale-90"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
