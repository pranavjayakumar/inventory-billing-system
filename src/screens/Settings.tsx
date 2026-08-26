import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import { useShopSettings, useUpdateShopSettings } from '../lib/queries/shopSettings'
import { useToast } from '../lib/toastContext'

export default function Settings() {
  const { data: shopSettings, isLoading } = useShopSettings()
  const updateShopSettings = useUpdateShopSettings()
  const toast = useToast()

  const [shopName, setShopName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shopSettings) return
    setShopName(shopSettings.shop_name)
    setAddress(shopSettings.address ?? '')
    setPhone(shopSettings.phone ?? '')
    setLogoUrl(shopSettings.logo_url ?? '')
  }, [shopSettings])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!shopName.trim()) {
      setError('Give your shop a name.')
      return
    }

    updateShopSettings.mutate(
      {
        shop_name: shopName.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        logo_url: logoUrl.trim() || null,
      },
      {
        onSuccess: () => toast('Settings saved', 'success'),
        onError: (err) => setError(err.message),
      },
    )
  }

  if (isLoading) {
    return <div className="px-4 py-6 text-sm text-ink/70">Loading…</div>
  }

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-ink/70">
        This appears on every bill you generate.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <Card className="flex flex-col gap-3 p-4">
          <TextField
            label="Shop name"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="My Shop"
          />
          <TextField
            label="Address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main Street, your city"
          />
          <TextField
            label="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            placeholder="98765 43210"
          />
          <TextField
            label="Logo URL (optional)"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
          />
        </Card>

        {error && <p className="text-sm text-chili">{error}</p>}

        <Button type="submit" size="lg" fullWidth disabled={updateShopSettings.isPending}>
          {updateShopSettings.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </div>
  )
}
