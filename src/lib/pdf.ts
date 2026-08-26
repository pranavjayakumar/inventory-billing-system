import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Bill, BillItem, ShopSettings } from '../types/db'

const MARGIN = 40
const PAGE_RIGHT = 555

function docWithLastAutoTable(doc: jsPDF) {
  return doc as unknown as { lastAutoTable: { finalY: number } }
}

export function generateBillPdf(bill: Bill, items: BillItem[], shop: ShopSettings): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let y = 50

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(shop.shop_name, MARGIN, y)
  y += 22

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90)
  if (shop.address) {
    doc.text(shop.address, MARGIN, y)
    y += 14
  }
  if (shop.phone) {
    doc.text(`Phone: ${shop.phone}`, MARGIN, y)
    y += 14
  }
  doc.setTextColor(0)

  y += 10
  doc.setDrawColor(220)
  doc.line(MARGIN, y, PAGE_RIGHT, y)
  y += 24

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(bill.bill_number, MARGIN, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const dateStr = new Date(bill.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  doc.text(dateStr, PAGE_RIGHT, y, { align: 'right' })
  y += 18

  if (bill.customer_name || bill.customer_phone) {
    const parts = [bill.customer_name, bill.customer_phone].filter(Boolean)
    doc.text(parts.join(' · '), MARGIN, y)
    y += 18
  }

  y += 6

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Qty', 'Rate', 'Amount']],
    body: items.map((item) => [
      `${item.product_name_snapshot} — ${item.variant_label_snapshot}`,
      String(item.quantity),
      item.unit_price_snapshot.toFixed(2),
      item.subtotal.toFixed(2),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [217, 164, 65], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 8 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left: MARGIN, right: MARGIN },
  })

  let totalsY = docWithLastAutoTable(doc).lastAutoTable.finalY + 24

  doc.setFontSize(10)
  doc.text('Subtotal', 460, totalsY, { align: 'right' })
  doc.text(bill.subtotal.toFixed(2), PAGE_RIGHT, totalsY, { align: 'right' })

  if (bill.discount > 0) {
    totalsY += 16
    doc.text('Discount', 460, totalsY, { align: 'right' })
    doc.text(`-${bill.discount.toFixed(2)}`, PAGE_RIGHT, totalsY, { align: 'right' })
  }

  totalsY += 22
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Total', 460, totalsY, { align: 'right' })
  doc.text(`₹${bill.total.toFixed(2)}`, PAGE_RIGHT, totalsY, { align: 'right' })

  totalsY += 40
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(140)
  doc.text('Thank you for shopping with us!', MARGIN, totalsY)

  return doc
}

const SHARE_TIMEOUT_MS = 15000

export function canSharePdfFiles(): boolean {
  return !!navigator.canShare?.({ files: [new File([], 'test.pdf', { type: 'application/pdf' })] })
}

export async function shareOrDownloadPdf(doc: jsPDF, filename: string): Promise<'shared' | 'downloaded'> {
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (canSharePdfFiles()) {
    try {
      await Promise.race([
        navigator.share({ files: [file], title: filename }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Share timed out')), SHARE_TIMEOUT_MS),
        ),
      ])
      return 'shared'
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'shared'
      }
      // fall through to download on timeout or any other share failure
    }
  }

  doc.save(filename)
  return 'downloaded'
}
