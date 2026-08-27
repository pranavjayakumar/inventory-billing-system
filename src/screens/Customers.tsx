import { Plus, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ErrorBanner from '../components/ui/ErrorBanner'
import TextField from '../components/ui/TextField'
import { useCreateCustomer, useCustomers } from '../lib/queries/customers'
import { FAB_CLASSNAME } from '../lib/ui'
import { useToast } from '../lib/toastContext'

export default function Customers() {
  const { data: customers, isLoading, isError } = useCustomers()
  const createCustomer = useCreateCustomer()
  const toast = useToast()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const hasAnyCustomers = (customers?.length ?? 0) > 0

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (customers ?? [])
      .filter((c) => showAll || c.balance > 0)
      .filter(
        (c) =>
          !term ||
          c.name.toLowerCase().includes(term) ||
          (c.phone ?? '').toLowerCase().includes(term),
      )
      .sort((a, b) => b.balance - a.balance)
  }, [customers, search, showAll])

  function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!name.trim()) {
      setFormError('Give the customer a name.')
      return
    }

    createCustomer.mutate(
      { name: name.trim(), phone: phone.trim() || null, address: address.trim() || null },
      {
        onSuccess: () => {
          toast('Customer added', 'success')
          setName('')
          setPhone('')
          setAddress('')
          setAddOpen(false)
        },
        onError: (err) => setFormError(err.message),
      },
    )
  }

  function closeAddForm() {
    setAddOpen(false)
    setFormError(null)
  }

  return (
    <div className="px-4 py-6 pb-40">
      <h1 className="font-heading text-xl font-semibold">Customers</h1>

      {addOpen && (
        <Card className="mt-4 p-4">
          <form onSubmit={handleAddCustomer} className="flex flex-col gap-3">
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
            />
            <TextField
              label="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              placeholder="98765 43210"
            />
            <TextField
              label="Address (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
            />
            {formError && <ErrorBanner>{formError}</ErrorBanner>}
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth type="button" onClick={closeAddForm}>
                Cancel
              </Button>
              <Button fullWidth type="submit" disabled={createCustomer.isPending}>
                {createCustomer.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {hasAnyCustomers && (
        <>
          <div className="mt-4 flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3">
            <Search className="h-4 w-4 shrink-0 text-ink/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone"
              className="w-full bg-transparent text-base outline-none placeholder:text-ink/40"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium ${
                !showAll ? 'bg-turmeric text-surface' : 'border border-border bg-surface text-ink/70'
              }`}
            >
              With balance due
            </button>
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium ${
                showAll ? 'bg-turmeric text-surface' : 'border border-border bg-surface text-ink/70'
              }`}
            >
              All
            </button>
          </div>
        </>
      )}

      {isLoading && (
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-border/40" />
          ))}
        </div>
      )}

      {isError && (
        <div className="mt-6">
          <ErrorBanner>Couldn't load customers. Pull to refresh.</ErrorBanner>
        </div>
      )}

      {!isLoading && !isError && !hasAnyCustomers && (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add your first customer to start tracking credit."
          action={
            <Button className="mt-2" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add customer
            </Button>
          }
        />
      )}

      {!isLoading && !isError && hasAnyCustomers && filtered.length === 0 && search.trim() === '' && (
        <EmptyState
          icon={Users}
          title="Nobody owes you anything"
          description='Switch to "All" to see every customer, including settled ones.'
        />
      )}

      {!isLoading && !isError && hasAnyCustomers && filtered.length === 0 && search.trim() !== '' && (
        <p className="mt-6 text-center text-sm text-ink/70">No customers match "{search}".</p>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {filtered.map((customer) => (
            <Card key={customer.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => navigate(`/customers/${customer.id}`)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm font-semibold">{customer.name}</p>
                  {customer.phone && <p className="mt-0.5 text-xs text-ink/70">{customer.phone}</p>}
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    customer.balance > 0 ? 'text-chili' : ''
                  }`}
                >
                  ₹{customer.balance.toFixed(2)}
                </span>
              </button>
            </Card>
          ))}
        </div>
      )}

      {hasAnyCustomers &&
        !addOpen &&
        createPortal(
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label="Add customer"
            className={`fixed bottom-24 z-10 ${FAB_CLASSNAME}`}
            style={{ right: 'max(1rem, calc((100vw - 480px) / 2 + 1rem))' }}
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>,
          document.body,
        )}
    </div>
  )
}
