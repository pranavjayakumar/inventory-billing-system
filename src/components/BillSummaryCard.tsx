import type { BillWithItems } from '../lib/queries/bills'
import Card from './ui/Card'

export default function BillSummaryCard({ bill }: { bill: BillWithItems }) {
  return (
    <Card className="w-full p-4 text-left">
      <ul className="flex flex-col gap-1.5">
        {bill.bill_items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-ink/70">
              {item.product_name_snapshot} ({item.variant_label_snapshot}) × {item.quantity}
            </span>
            <span className="shrink-0 tabular-nums">₹{item.subtotal.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
        <div className="flex items-center justify-between text-ink/70">
          <span>Subtotal</span>
          <span className="tabular-nums">₹{bill.subtotal.toFixed(2)}</span>
        </div>
        {bill.discount > 0 && (
          <div className="flex items-center justify-between text-chili">
            <span>Discount</span>
            <span className="tabular-nums">−₹{bill.discount.toFixed(2)}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
