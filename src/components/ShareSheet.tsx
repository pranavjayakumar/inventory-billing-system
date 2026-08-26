import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Download, Share2, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { canShareLink, copyToClipboard, shareLink } from '../lib/pdf'

interface ShareSheetProps {
  open: boolean
  onClose: () => void
  title: string
  onDownload: () => void
  /** Uploads the PDF (if not already) and resolves its public URL. */
  getLink: () => Promise<string>
}

type ActionStatus = 'idle' | 'working' | 'done' | 'error'

export default function ShareSheet({ open, onClose, title, onDownload, getLink }: ShareSheetProps) {
  const [cachedLink, setCachedLink] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<ActionStatus>('idle')
  const [shareStatus, setShareStatus] = useState<ActionStatus>('idle')

  async function resolveLink() {
    if (cachedLink) return cachedLink
    const url = await getLink()
    setCachedLink(url)
    return url
  }

  async function handleCopy() {
    setCopyStatus('working')
    try {
      const url = await resolveLink()
      await copyToClipboard(url)
      setCopyStatus('done')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      setCopyStatus('error')
    }
  }

  async function handleShare() {
    setShareStatus('working')
    try {
      const url = await resolveLink()
      await shareLink(url, title)
      setShareStatus('idle')
    } catch {
      setShareStatus('error')
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="w-full max-w-[480px] rounded-t-2xl bg-surface p-2 pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex flex-col gap-0.5 p-1">
              <SheetAction icon={Download} label="Download PDF" onClick={onDownload} />
              <SheetAction
                icon={copyStatus === 'done' ? Check : Copy}
                label={
                  copyStatus === 'done'
                    ? 'Link copied'
                    : copyStatus === 'working'
                      ? 'Copying…'
                      : 'Copy link'
                }
                onClick={handleCopy}
                disabled={copyStatus === 'working'}
                tone={copyStatus === 'done' ? 'success' : copyStatus === 'error' ? 'error' : 'default'}
              />
              {canShareLink() && (
                <SheetAction
                  icon={Share2}
                  label={shareStatus === 'working' ? 'Sharing…' : 'Share'}
                  onClick={handleShare}
                  disabled={shareStatus === 'working'}
                  tone={shareStatus === 'error' ? 'error' : 'default'}
                />
              )}
            </div>
            {(copyStatus === 'error' || shareStatus === 'error') && (
              <p className="px-4 pb-2 text-xs text-chili">Something went wrong. Try again.</p>
            )}
            <div className="border-t border-border p-1 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-ink/60"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function SheetAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = 'default',
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: 'default' | 'success' | 'error'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium disabled:opacity-50 ${
        tone === 'success' ? 'text-cardamom' : tone === 'error' ? 'text-chili' : 'text-ink'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  )
}
