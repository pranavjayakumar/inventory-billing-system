import { Receipt, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BillRow from '../components/BillRow'
import EmptyState from '../components/EmptyState'
import { useBills } from '../lib/queries/bills'

export default function History() {
  const { data: bills, isLoading, isError } = useBills()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return bills ?? []
    return (bills ?? []).filter(
      (b) =>
        b.bill_number.toLowerCase().includes(term) ||
        (b.customer_name ?? '').toLowerCase().includes(term),
    )
  }, [bills, search])

  const hasAnyBills = (bills?.length ?? 0) > 0

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-xl font-semibold">History</h1>

      {hasAnyBills && (
        <div className="mt-4 flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <Search className="h-4 w-4 shrink-0 text-ink/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or bill number"
            className="w-full bg-transparent text-base outline-none placeholder:text-ink/40"
          />
        </div>
      )}

      {isLoading && (
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-border/40" />
          ))}
        </div>
      )}

      {isError && <p className="mt-6 text-sm text-chili">Couldn't load bills. Pull to refresh.</p>}

      {!isLoading && !isError && !hasAnyBills && (
        <EmptyState
          icon={Receipt}
          title="No bills yet"
          description="Bills you generate will show up here."
        />
      )}

      {!isLoading && !isError && hasAnyBills && filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-ink/70">No bills match "{search}".</p>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {filtered.map((bill) => (
            <BillRow key={bill.id} bill={bill} onClick={() => navigate(`/history/${bill.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
