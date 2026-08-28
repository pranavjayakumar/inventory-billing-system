import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import TextField from '../components/ui/TextField';
import {
  useShopSettings,
  useUpdateShopSettings,
} from '../lib/queries/shopSettings';
import { useToast } from '../lib/toastContext';

export default function Settings() {
  const { data: shopSettings, isLoading } = useShopSettings();
  const updateShopSettings = useUpdateShopSettings();
  const toast = useToast();
  const navigate = useNavigate();

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shopSettings) return;
    setShopName(shopSettings.shop_name);
    setOwnerName(shopSettings.owner_name ?? '');
    setAddress(shopSettings.address ?? '');
    setPhone(shopSettings.phone ?? '');
    setLogoUrl(shopSettings.logo_url ?? '/favicon.png');
  }, [shopSettings]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!shopName.trim()) {
      setError('Give your shop a name.');
      return;
    }

    updateShopSettings.mutate(
      {
        shop_name: shopName.trim(),
        owner_name: ownerName.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        logo_url: logoUrl.trim() || null,
      },
      {
        onSuccess: () => toast('Settings saved', 'success'),
        onError: (err) => setError(err.message),
      },
    );
  }

  if (isLoading) {
    return <div className='px-4 py-6 text-sm text-ink/70'>Loading…</div>;
  }

  return (
    <div className='px-4 py-6'>
      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={() => navigate('/')}
          aria-label='Back'
          className='-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-ink/70'>
          <ArrowLeft className='h-5 w-5' />
        </button>
        <h1 className='font-heading text-xl font-semibold'>Settings</h1>
      </div>
      <p className='mt-1 text-sm text-ink/70'>
        This appears on every bill you generate.
      </p>

      <form
        onSubmit={handleSubmit}
        className='mt-4 flex flex-col gap-4'>
        <Card className='flex flex-col gap-3 p-4'>
          <TextField
            label='Shop name'
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder='Aniyathi Mart'
          />
          <TextField
            label='Owner name (optional)'
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder='Your name'
          />
          <TextField
            label='Address (optional)'
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder='123 Main Street, your city'
          />
          <TextField
            label='Phone (optional)'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type='tel'
            inputMode='tel'
            placeholder='98765 43210'
          />
          <TextField
            label='Logo URL (optional)'
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder='/favicon.png'
          />
        </Card>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <Button
          type='submit'
          size='lg'
          fullWidth
          disabled={updateShopSettings.isPending}>
          {updateShopSettings.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </div>
  );
}
