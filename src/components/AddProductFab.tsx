import { Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProducts } from '../lib/queries/products'
import { FAB_CLASSNAME } from '../lib/ui'

export default function AddProductFab() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: products } = useProducts()

  if (location.pathname !== '/products' || !products || products.length === 0) {
    return null
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/products/new')}
      aria-label="Add product"
      className={`fixed bottom-24 z-10 ${FAB_CLASSNAME}`}
      style={{ right: 'max(1rem, calc((100vw - 480px) / 2 + 1rem))' }}
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
    </button>
  )
}
