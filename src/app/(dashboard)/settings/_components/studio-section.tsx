'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export function StudioSection() {
  const { currentStudio, membership } = useStudio()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'

  const [studioName, setStudioName] = useState(currentStudio?.name ?? '')
  const currency = (currentStudio?.settings as Record<string, unknown>)?.currency as string | undefined
  const [selectedCurrency, setSelectedCurrency] = useState(currency ?? 'dkk')

  // Sync local state when studio data loads
  useEffect(() => {
    if (currentStudio) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStudioName(currentStudio.name)
      const cur = (currentStudio.settings as Record<string, unknown>)?.currency as string | undefined
      if (cur) setSelectedCurrency(cur)
    }
  }, [currentStudio])

  const updateStudio = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('studios')
        .update({
          name: studioName,
          settings: { ...(currentStudio?.settings ?? {}), currency: selectedCurrency },
        })
        .eq('id', currentStudio!.id)
      if (error) throw error
    },
    onSuccess: () => {
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
            />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={currentStudio?.slug ?? ''} disabled />
            <p className="text-xs text-muted-foreground">This is your unique URL identifier and cannot be changed.</p>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Currency
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
