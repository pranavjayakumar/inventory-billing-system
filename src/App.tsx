import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import AddProductFab from './components/AddProductFab'
import BottomNav from './components/BottomNav'
import PageTransition from './components/PageTransition'
import History from './screens/History'
import Home from './screens/Home'
import NewBill from './screens/NewBill'
import ProductForm from './screens/ProductForm'
import Products from './screens/Products'
import Settings from './screens/Settings'

const queryClient = new QueryClient()

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <Home />
            </PageTransition>
          }
        />
        <Route
          path="/products"
          element={
            <PageTransition>
              <Products />
            </PageTransition>
          }
        />
        <Route
          path="/products/new"
          element={
            <PageTransition>
              <ProductForm />
            </PageTransition>
          }
        />
        <Route
          path="/products/:id/edit"
          element={
            <PageTransition>
              <ProductForm />
            </PageTransition>
          }
        />
        <Route
          path="/bill/new"
          element={
            <PageTransition>
              <NewBill />
            </PageTransition>
          }
        />
        <Route
          path="/history"
          element={
            <PageTransition>
              <History />
            </PageTransition>
          }
        />
        <Route
          path="/settings"
          element={
            <PageTransition>
              <Settings />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="relative mx-auto min-h-screen max-w-[480px] bg-paper pb-20">
          <AnimatedRoutes />
          <AddProductFab />
          <BottomNav />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
