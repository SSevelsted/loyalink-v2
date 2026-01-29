'use client'

import type { TierTheme } from '@/types/database'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ImageUpload } from '@/components/wallet/image-upload'
import { Trash2 } from 'lucide-react'

type TierEditorProps = {
  slug: string
  tier: TierTheme
  onChange: (updates: Partial<TierTheme>) => void
  onDelete: () => void
  canDelete: boolean
  logoOverride: string | null
  onLogoOverrideUpload: (file: File) => void
  onLogoOverrideRemove: () => void
  uploading?: boolean
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 rounded-lg border border-border/50 cursor-pointer bg-transparent p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-secondary/50 font-mono text-xs h-8"
        />
      </div>
    </div>
  )
}

export function TierEditor({
  slug,
  tier,
  onChange,
  onDelete,
  canDelete,
  logoOverride,
  onLogoOverrideUpload,
  onLogoOverrideRemove,
  uploading,
}: TierEditorProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{tier.name}</h3>
          <p className="text-xs text-muted-foreground font-mono">{slug}</p>
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Tier Name</Label>
        <Input
          value={tier.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="bg-secondary/50 h-8"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ColorInput
          label="Background"
          value={tier.backgroundColor}
          onChange={(v) => onChange({ backgroundColor: v })}
        />
        <ColorInput
          label="Foreground"
          value={tier.foregroundColor}
          onChange={(v) => onChange({ foregroundColor: v })}
        />
        <ColorInput
          label="Label"
          value={tier.labelColor}
          onChange={(v) => onChange({ labelColor: v })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cashback Rate (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={tier.cashbackRate}
            onChange={(e) => onChange({ cashbackRate: Number(e.target.value) })}
            className="bg-secondary/50 h-8"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Min Spend</Label>
          <Input
            type="number"
            min={0}
            value={tier.minSpend}
            onChange={(e) => onChange({ minSpend: Number(e.target.value) })}
            className="bg-secondary/50 h-8"
          />
        </div>
      </div>

      {/* Per-tier logo override */}
      <ImageUpload
        label="Logo override (this tier only)"
        hint="PNG, 480×150 px — use if default logo doesn't fit this background"
        aspect={480 / 150}
        targetWidth={480}
        targetHeight={150}
        currentUrl={logoOverride}
        onUpload={onLogoOverrideUpload}
        onRemove={onLogoOverrideRemove}
        uploading={uploading}
      />
    </div>
  )
}
