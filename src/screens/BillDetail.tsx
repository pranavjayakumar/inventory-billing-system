import { ArrowLeft, Share2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BillSummaryCard from '../components/BillSummaryCard'
import ShareSheet from '../components/ShareSheet'
import Button from '../components/ui/Button'
import { downloadPdf, generateBillPdf, uploadBillPdf } from '../lib/pdf'
import { useBillDetails } from '../lib/queries/bills'
import { useShopSettings } from '../lib/queries/shopSettings'

export default function BillDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: bill, isLoading, isError } = useBillDetails(id)
  const { data: shopSettings } = useShopSettings()
  const [shareSheetOpen, setShareSheetOpen] = useState(false)

  function buildDoc() {
    if (!bill || !shopSettings) throw new Error('Bill not ready yet.')
    return generateBillPdf(bill, bill.bill_items, shopSettings)
  }

  function handleDownload() {
    downloadPdf(buildDoc(), `${bill!.bill_number}.pdf`)
  }

  async function handleGetLink() {
    return uploadBillPdf(buildDoc(), bill!.id)
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/history')}
          aria-label="Back"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-heading text-xl font-semibold">Bill details</h1>
      </div>

      {isLoading && (
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-border/40" />
      )}

      {isError && <p className="mt-6 text-sm text-chili">Couldn't load this bill.</p>}

      {bill && (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className="font-heading text-lg font-semibold">{bill.bill_number}</p>
            <p className="text-sm text-ink/70">
              {new Date(bill.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              {bill.customer_name ? ` · ${bill.customer_name}` : ''}
              {bill.customer_phone ? ` · ${bill.customer_phone}` : ''}
            </p>
          </div>

          <BillSummaryCard bill={bill} />

          <p className="font-display text-4xl font-semibold tabular-nums">
            ₹{bill.total.toFixed(2)}
          </p>

          <Button
            variant="secondary"
            fullWidth
            disabled={!shopSettings}
            onClick={() => setShareSheetOpen(true)}
          >
            <Share2 className="h-4 w-4" />
            Share bill
          </Button>

          <ShareSheet
            open={shareSheetOpen}
            onClose={() => setShareSheetOpen(false)}
            title={bill.bill_number}
            onDownload={handleDownload}
            getLink={handleGetLink}
          />
        </div>
      )}
    </div>
  )
}
