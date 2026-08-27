import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from './supabase'
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
  if (shop.owner_name) {
    doc.text(shop.owner_name, MARGIN, y)
    y += 14
  }
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
      `${item.product_name_snapshot} · ${item.variant_label_snapshot}`,
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

export function downloadPdf(doc: jsPDF, filename: string): void {
  doc.save(filename)
}

/**
 * Uploads the PDF keyed by the bill's UUID (not its human-readable bill_number)
 * so public URLs aren't sequentially guessable: every historical bill would
 * otherwise be trivially enumerable via INV-0001.pdf, INV-0002.pdf, etc.
 */
export async function uploadBillPdf(doc: jsPDF, billId: string): Promise<string> {
  const blob = doc.output('blob')
  const path = `${billId}.pdf`
  const { error } = await supabase.storage
    .from('bills')
    .upload(path, blob, { contentType: 'application/pdf', upsert: true })
  if (error) throw error

  const { data } = supabase.storage.from('bills').getPublicUrl(path)
  return data.publicUrl
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

const SHARE_TIMEOUT_MS = 15000

export function canShareLink(): boolean {
  return 'share' in navigator
}

export async function shareLink(url: string, title: string): Promise<void> {
  await Promise.race([
    navigator.share({ url, title }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Share timed out')), SHARE_TIMEOUT_MS)),
  ])
}
