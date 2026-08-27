import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Docked action bar, portaled to escape any animated-transform ancestor
 * (route PageTransition) so `fixed` positions relative to the viewport.
 *
 * Offset by 6rem (not just BottomNav's 4rem height) to clear the New Bill
 * FAB, which pops up ~1.25rem above the nav bar via `-top-5`. Sitting flush
 * against the nav would visually overlap the FAB and, worse, let it steal
 * taps meant for the footer buttons underneath it.
 */
export default function StickyFooter({ children }: { children: ReactNode }) {
  return createPortal(
    <div
      className="fixed inset-x-0 z-10 mx-auto flex w-full max-w-[480px] gap-2 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg shadow-ink/5"
      style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
    >
      {children}
    </div>,
    document.body,
  )
}
