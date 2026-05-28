'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useStudio } from '@/hooks/use-studio'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CURRENCY_MAP } from '@/lib/currency'
import { Building2, Globe } from 'lucide-react'

const CURRENCY_OPTIONS = Object.entries(CURRENCY_MAP)
  .filter(([key]) => key !== 'kr') // skip the alias
  .map(([key, cfg]) => ({ value: key, label: `${key.toUpperCase()} (${cfg.symbol})` }))

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'da', label: 'Danish (Dansk)' },
  { value: 'sv', label: 'Swedish (Svenska)' },
  { value: 'no', label: 'Norwegian (Norsk)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'es', label: 'Spanish (Español)' },
  { value: 'nl', label: 'Dutch (Nederlands)' },
  { value: 'pl', label: 'Polish (Polski)' },
]

const COUNTRY_OPTIONS = [
  { value: 'DK', label: 'Denmark' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'FI', label: 'Finland' },
  { value: 'DE', label: 'Germany' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'AT', label: 'Austria' },
  { value: 'PL', label: 'Poland' },
  { value: 'CZ', label: 'Czech Republic' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
]

export function StudioSection() {
  const { currentStudio, membership, refresh: refreshStudio } = useStudio()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin' || membership?.role === 'super_admin'

  const s = currentStudio?.settings as Record<string, unknown> | undefined

  const [studioName, setStudioName] = useState(currentStudio?.name ?? '')
  const [studioEmail, setStudioEmail] = useState((s?.email as string) ?? '')
  const [studioPhone, setStudioPhone] = useState((s?.phone as string) ?? '')
  const [addressStreet, setAddressStreet] = useState((s?.address_street as string) ?? '')
  const [addressCity, setAddressCity] = useState((s?.address_city as string) ?? '')
  const [addressPostalCode, setAddressPostalCode] = useState((s?.address_postal_code as string) ?? '')
  const [addressCountry, setAddressCountry] = useState((s?.address_country as string) ?? 'DK')
  const [selectedCurrency, setSelectedCurrency] = useState((s?.currency as string) ?? 'dkk')
  const [selectedLanguage, setSelectedLanguage] = useState((s?.language as string) ?? 'en')

  // Sync local state when studio data loads
  useEffect(() => {
    if (currentStudio) {
      const settings = currentStudio.settings as Record<string, unknown> | undefined
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStudioName(currentStudio.name)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (settings?.email) setStudioEmail(settings.email as string)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (settings?.phone) setStudioPhone(settings.phone as string)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (settings?.address_street) setAddressStreet(settings.address_street as string)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (settings?.address_city) setAddressCity(settings.address_city as string)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (settings?.address_postal_code) setAddressPostalCode(settings.address_postal_code as string)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (settings?.address_country) setAddressCountry(settings.address_country as string)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (settings?.currency) setSelectedCurrency(settings.currency as string)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (settings?.language) setSelectedLanguage(settings.language as string)
    }
  }, [currentStudio])

  const updateStudio = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('studios')
        .update({
          name: studioName,
          settings: {
            ...(currentStudio?.settings ?? {}),
            email: studioEmail,
            phone: studioPhone,
            address_street: addressStreet,
            address_city: addressCity,
            address_postal_code: addressPostalCode,
            address_country: addressCountry,
            currency: selectedCurrency,
            language: selectedLanguage,
          },
        })
        .eq('id', currentStudio!.id)
      if (error) throw error
    },
    onSuccess: () => {
      // useStudio uses its own state, not react-query, so invalidateQueries
      // alone leaves `currentStudio` stale and the form rehydrates from old
      // settings the next time this tab mounts. Trigger an actual refetch.
      refreshStudio()
      queryClient.invalidateQueries({ queryKey: ['studios'] })
      toast.success('Studio updated')
    },
    onError: () => toast.error('Failed to update studio'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Studio</h2>
        <p className="text-sm text-muted-foreground">Manage your studio settings.</p>
      </div>

      <Card variant="glass" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Studio Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studio-name">Studio Name</Label>
            <Input
              id="studio-name"
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              disabled={!isAdmin}
              autoComplete="organization"
            />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={currentStudio?.slug ?? ''} disabled />
            <p className="text-xs text-muted-foreground">This is your unique URL identifier and cannot be changed.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="studio-email">Business Email</Label>
            <Input
              id="studio-email"
              type="email"
              value={studioEmail}
              onChange={(e) => setStudioEmail(e.target.value)}
              disabled={!isAdmin}
              placeholder="hello@yourstudio.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studio-phone">Phone</Label>
            <Input
              id="studio-phone"
              type="tel"
              value={studioPhone}
              onChange={(e) => setStudioPhone(e.target.value)}
              disabled={!isAdmin}
              placeholder="+45 12 34 56 78"
              autoComplete="tel"
            />
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-3">Address</p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="studio-street">Street Address</Label>
                <Input
                  id="studio-street"
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Nørregade 1"
                  autoComplete="street-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="studio-city">City</Label>
                  <Input
                    id="studio-city"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="Copenhagen"
                    autoComplete="address-level2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studio-postal">Postal Code</Label>
                  <Input
                    id="studio-postal"
                    value={addressPostalCode}
                    onChange={(e) => setAddressPostalCode(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="1234"
                    autoComplete="postal-code"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="studio-country">Country</Label>
                <Select value={addressCountry} onValueChange={setAddressCountry} disabled={!isAdmin}>
                  <SelectTrigger id="studio-country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Regional Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Display currency</Label>
            <Select
              value={selectedCurrency}
              onValueChange={setSelectedCurrency}
              disabled={!isAdmin}
            >
              <SelectTrigger id="currency" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used for displaying amounts in rewards configuration and customer views.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
              disabled={!isAdmin}
            >
              <SelectTrigger id="language" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Language used on your customer-facing loyalty page.</p>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => updateStudio.mutate()} disabled={updateStudio.isPending} variant="glow">
            {updateStudio.isPending ? 'Saving...' : 'Save Studio Settings'}
          </Button>
        </div>
      )}
    </div>
  )
}
