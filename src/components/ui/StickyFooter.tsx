import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Docked action bar, portaled to escape any animated-transform ancestor
 * (route PageTransition) so `fixed` positions relative to the viewport.
 * Sits directly above BottomNav.
 */
export default function StickyFooter({ children }: { children: ReactNode }) {
  return createPortal(
    <div
      className="fixed inset-x-0 z-5 mx-auto flex w-full max-w-[480px] gap-2 border-t border-border bg-surface px-4 py-3 pb-5"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
    >
      {children}
    </div>,
    document.body,
  )
}
