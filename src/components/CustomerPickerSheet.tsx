import { AnimatePresence, motion } from 'framer-motion'
import { Search, UserPlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCreateCustomer, useCustomers, type CustomerWithBalance } from '../lib/queries/customers'
import Button from './ui/Button'
import ErrorBanner from './ui/ErrorBanner'
import TextField from './ui/TextField'

interface CustomerPickerSheetProps {
  open: boolean
  onClose: () => void
  onSelect: (customer: CustomerWithBalance) => void
}

export default function CustomerPickerSheet({ open, onClose, onSelect }: CustomerPickerSheetProps) {
  const { data: customers, isLoading } = useCustomers()
  const createCustomer = useCreateCustomer()

  const [search, setSearch] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return customers ?? []
    return (customers ?? []).filter(
      (c) => c.name.toLowerCase().includes(term) || (c.phone ?? '').includes(term),
    )
  }, [customers, search])

  function reset() {
    setSearch('')
    setAddingNew(false)
    setNewName('')
    setNewPhone('')
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleCreate() {
    setError(null)
    if (!newName.trim()) {
      setError('Give the customer a name.')
      return
    }
    createCustomer.mutate(
      { name: newName.trim(), phone: newPhone.trim() || null, address: null },
      {
        onSuccess: (customer) => {
          reset()
          onSelect(customer as CustomerWithBalance)
        },
        onError: (err) => setError(err.message),
      },
    )
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-[480px] flex-col bg-paper"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <h1 className="font-heading text-lg font-semibold">
              {addingNew ? 'New customer' : 'Choose customer'}
            </h1>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="-mr-2 ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {addingNew ? (
              <div className="flex flex-col gap-3">
                <TextField
                  label="Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Customer name"
                  autoFocus
                />
                <TextField
                  label="Phone (optional)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  placeholder="98765 43210"
                />
                {error && <ErrorBanner>{error}</ErrorBanner>}
                <Button fullWidth size="lg" disabled={createCustomer.isPending} onClick={handleCreate}>
                  {createCustomer.isPending ? 'Adding…' : 'Add & select'}
                </Button>
                <Button variant="secondary" fullWidth onClick={() => setAddingNew(false)}>
                  Back to search
                </Button>
              </div>
            ) : (
              <>
                <div className="flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3">
                  <Search className="h-4 w-4 shrink-0 text-ink/40" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or phone"
                    autoFocus
                    className="w-full bg-transparent text-base outline-none placeholder:text-ink/40"
                  />
                </div>

                <Button variant="outline" fullWidth className="mt-3" onClick={() => setAddingNew(true)}>
                  <UserPlus className="h-4 w-4" />
                  Add new customer
                </Button>

                {isLoading && <p className="mt-6 text-center text-sm text-ink/70">Loading…</p>}

                {!isLoading && matches.length === 0 && (
                  <p className="mt-6 text-center text-sm text-ink/70">
                    {search ? `No customer matches "${search}".` : 'No customers yet.'}
                  </p>
                )}

                {matches.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2">
                    {matches.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          reset()
                          onSelect(c)
                        }}
                        className="flex min-h-11 items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-left"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          {c.phone && <p className="text-xs text-ink/70">{c.phone}</p>}
                        </div>
                        {c.balance > 0 && (
                          <span className="shrink-0 text-xs font-medium tabular-nums text-chili">
                            ₹{c.balance.toFixed(2)} due
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
