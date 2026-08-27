import { ArrowLeft, IndianRupee, Zap } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BillRow from '../components/BillRow'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ErrorBanner from '../components/ui/ErrorBanner'
import StickyFooter from '../components/ui/StickyFooter'
import TextField from '../components/ui/TextField'
import { useCustomerDetail, useRecordPayment } from '../lib/queries/customers'
import { useToast } from '../lib/toastContext'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: detail, isLoading } = useCustomerDetail(id)
  const recordPayment = useRecordPayment()
  const toast = useToast()

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function closePaymentForm() {
    setPaymentOpen(false)
    setError(null)
  }

  function handleQuickSettle() {
    if (!id || balance <= 0) return
    recordPayment.mutate(
      { customerId: id, amount: balance, note: 'Full settlement' },
      {
        onSuccess: () => toast('Balance settled', 'success'),
        onError: (err) => toast(err.message, 'error'),
      },
    )
  }

  function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amountNum = Number(amount)
    if (amount === '' || Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid payment amount.')
      return
    }
    if (!id) return

    recordPayment.mutate(
      { customerId: id, amount: amountNum, note: note.trim() || null },
      {
        onSuccess: () => {
          toast('Payment recorded', 'success')
          setAmount('')
          setNote('')
          setPaymentOpen(false)
        },
        onError: (err) => setError(err.message),
      },
    )
  }

  if (isLoading || !detail) {
    return <div className="px-4 py-6 text-sm text-ink/70">Loading…</div>
  }

  const { customer, bills, payments, balance } = detail

  return (
    <div className="px-4 py-6 pb-28">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          aria-label="Back"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-heading text-xl font-semibold">{customer.name}</h1>
      </div>

      {(customer.phone || customer.address) && (
        <div className="mt-1 flex flex-col gap-0.5 text-xs text-ink/70">
          {customer.phone && <p>{customer.phone}</p>}
          {customer.address && <p>{customer.address}</p>}
        </div>
      )}

      <Card className="torn-edge mt-4 p-5 pb-8">
        <p className="text-sm text-ink/70">Balance due</p>
        <p
          className={`mt-1 font-display text-4xl font-semibold tabular-nums ${
            balance > 0 ? 'text-chili' : ''
          }`}
        >
          ₹{balance.toFixed(2)}
        </p>
      </Card>

      {paymentOpen && (
        <Card className="mt-4 p-4">
          <form onSubmit={handleRecordPayment} className="flex flex-col gap-3">
            <TextField
              label="Amount ₹"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
            <TextField
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Cash, UPI, etc."
            />
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth type="button" onClick={closePaymentForm}>
                Cancel
              </Button>
              <Button fullWidth type="submit" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-6">
        <h2 className="mb-2 font-heading text-sm font-semibold">Bills</h2>
        {bills.length === 0 ? (
          <p className="text-sm text-ink/70">No bills for this customer yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bills.map((bill) => (
              <BillRow key={bill.id} bill={bill} onClick={() => navigate(`/history/${bill.id}`)} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 font-heading text-sm font-semibold">Payments</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-ink/70">No payments recorded yet.</p>
        ) : (
          <Card className="flex flex-col divide-y divide-border overflow-hidden">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="text-sm">{payment.note || 'Payment'}</p>
                  <p className="text-xs text-ink/70">{formatDate(payment.created_at)}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  ₹{payment.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>

      <StickyFooter>
        <Button
          variant="secondary"
          flex1
          disabled={balance <= 0 || recordPayment.isPending}
          onClick={handleQuickSettle}
        >
          <Zap className="h-4 w-4" />
          Settle full balance
        </Button>
        <Button flex1 onClick={() => (paymentOpen ? closePaymentForm() : setPaymentOpen(true))}>
          <IndianRupee className="h-4 w-4" />
          Record payment
        </Button>
      </StickyFooter>
    </div>
  )
}
