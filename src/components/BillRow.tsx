import type { Bill } from '../types/db'
import Card from './ui/Card'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function BillRow({ bill, onClick }: { bill: Bill; onClick: () => void }) {
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-semibold">{bill.bill_number}</span>
            <span className="text-xs text-ink/70">{formatDate(bill.created_at)}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-ink/70">
            {bill.customer_name || 'Walk-in customer'}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">₹{bill.total.toFixed(2)}</span>
      </button>
    </Card>
  )
}
