import { motion } from 'framer-motion'
import { Home, Package, Plus, Receipt, Settings, type LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

const leftTabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/products', label: 'Products', icon: Package },
]

const rightTabs = [
  { to: '/history', label: 'History', icon: Receipt },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex h-16 items-center justify-between px-2">
        {leftTabs.map((tab) => (
          <NavItem key={tab.to} {...tab} active={location.pathname === tab.to} />
        ))}

        <NavLink
          to="/bill/new"
          className="relative -top-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-turmeric text-surface shadow-lg shadow-turmeric/30 transition-transform active:scale-95"
          aria-label="New bill"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </NavLink>

        {rightTabs.map((tab) => (
          <NavItem key={tab.to} {...tab} active={location.pathname === tab.to} />
        ))}
      </div>
    </nav>
  )
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string
  label: string
  icon: LucideIcon
  active: boolean
}) {
  return (
    <NavLink
      to={to}
      className="relative flex h-11 w-16 flex-col items-center justify-center gap-0.5 text-[11px]"
    >
      {active && (
        <motion.span
          layoutId="nav-indicator"
          className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-turmeric"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <Icon className="h-5 w-5" strokeWidth={2} color={active ? '#D9A441' : '#21261F99'} />
      <span className={active ? 'font-medium text-ink' : 'text-ink/60'}>{label}</span>
    </NavLink>
  )
}
