'use client'

import type { Ref } from 'react'
import type { TierTheme } from '@/types/database'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ImageUpload, type ImageUploadHandle } from '@/components/wallet/image-upload'
import { Trash2, Paintbrush, Palette, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type TierEditorProps = {
  slug: string
  tier: TierTheme
  onChange: (updates: Partial<TierTheme>) => void
  onDelete: () => void
  canDelete: boolean
  logoOverride: string | null
  onLogoOverrideUpload: (file: File) => void
  onLogoOverrideRemove: () => void
  /** Ref so the parent can trigger this tier's logo uploader (e.g. from the
   *  live-preview logo click). */
  logoOverrideRef?: Ref<ImageUploadHandle>
  /** Global "all cards" logo — used as the recolor source when the tier has no
   *  logo of its own, and to know whether a logo exists to recolor. */
  globalLogoUrl?: string | null
  /** Current solid recolor applied to this tier's logo (null = original). */
  logoTint?: string | null
  /** When both handlers are provided, the logo-recolor controls are shown. */
  onLogoTint?: (color: string) => void
  onLogoTintClear?: () => void
  tinting?: boolean
  uploading?: boolean
}

const COLOR_PRESETS = [
  { name: 'Midnight', bg: '#0F0F0F', fg: '#FFFFFF', label: '#888888' },
  { name: 'Charcoal', bg: '#2D2D2D', fg: '#F5F5F5', label: '#999999' },
  { name: 'Navy', bg: '#1B2A4A', fg: '#E8ECF1', label: '#8096B8' },
  { name: 'Forest', bg: '#1A3A2A', fg: '#E8F1EC', label: '#7BAF8E' },
  { name: 'Wine', bg: '#3A1A2A', fg: '#F1E8EC', label: '#AF7B8E' },
  { name: 'Gold', bg: '#D4AF37', fg: '#1A1A1A', label: '#4A3B00' },
  { name: 'Silver', bg: '#C0C0C0', fg: '#1A1A1A', label: '#4A4A4A' },
  { name: 'Pearl', bg: '#F5F0EB', fg: '#2D2A26', label: '#8A857F' },
]

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
  logoOverrideRef,
  globalLogoUrl,
  logoTint,
  onLogoTint,
  onLogoTintClear,
  tinting,
  uploading,
}: TierEditorProps) {
  // A logo is available to recolor if this tier has one or a global one exists.
  const hasLogo = Boolean(tier.logoBase || logoOverride || globalLogoUrl)
  const norm = (c?: string | null) => (c ? c.toUpperCase() : null)
  const activeTint = norm(logoTint)
  const LOGO_TINTS = [
    { name: 'White', color: '#FFFFFF' },
    { name: 'Black', color: '#111111' },
    { name: 'Text color', color: norm(tier.foregroundColor) ?? '#111111' },
  ]
  const isPresetTint = LOGO_TINTS.some((t) => norm(t.color) === activeTint)
  const isCustomTint = Boolean(activeTint) && !isPresetTint

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

      {/* Color presets */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Paintbrush className="h-3 w-3" />
          Quick Presets
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((preset) => {
            const isActive = preset.bg === tier.backgroundColor && preset.fg === tier.foregroundColor && preset.label === tier.labelColor
            return (
              <button
                key={preset.name}
                onClick={() => onChange({
                  backgroundColor: preset.bg,
                  foregroundColor: preset.fg,
                  labelColor: preset.label,
                })}
                className={cn(
                  'group relative flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition-colors',
                  isActive
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border/30 hover:border-primary/30 hover:bg-secondary/50'
                )}
              >
                <div
                  className="h-3.5 w-3.5 rounded-full border border-border/50 shrink-0"
                  style={{ backgroundColor: preset.bg }}
                />
                <span className={cn('transition-colors', isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
                  {preset.name}
                </span>
              </button>
            )
          })}
          {!COLOR_PRESETS.some(p => p.bg === tier.backgroundColor && p.fg === tier.foregroundColor && p.label === tier.labelColor) && (
            <span className="flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-2 py-1.5 text-[11px] text-foreground">
              <div
                className="h-3.5 w-3.5 rounded-full border border-border/50 shrink-0"
                style={{ backgroundColor: tier.backgroundColor }}
              />
              Custom
            </span>
          )}
        </div>
      </div>

      {/* Custom colors */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Custom Colors</Label>
        <div className="grid grid-cols-3 gap-3">
          <ColorInput
            label="Background"
            value={tier.backgroundColor}
            onChange={(v) => onChange({ backgroundColor: v })}
          />
          <ColorInput
            label="Text"
            value={tier.foregroundColor}
            onChange={(v) => onChange({ foregroundColor: v })}
          />
          <ColorInput
            label="Labels"
            value={tier.labelColor}
            onChange={(v) => onChange({ labelColor: v })}
          />
        </div>
      </div>

      {/* Color mapping hint */}
      <div className="rounded-2xl border border-border/30 bg-secondary/20 p-3 space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Color mapping</p>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: tier.backgroundColor }} />
            <span className="text-muted-foreground">Card background</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: tier.foregroundColor }} />
            <span className="text-muted-foreground">Name & values</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: tier.labelColor }} />
            <span className="text-muted-foreground">Field labels</span>
          </div>
        </div>
      </div>

      {/* Per-tier logo override */}
      <ImageUpload
        ref={logoOverrideRef}
        label="Logo override (this tier only)"
        hint="PNG, 480x150 px - use if default logo doesn't fit this background"
        aspect={480 / 150}
        targetWidth={480}
        targetHeight={150}
        currentUrl={logoOverride}
        onUpload={onLogoOverrideUpload}
        onRemove={onLogoOverrideRemove}
        uploading={uploading}
        removeBgType="graphic"
      />

      {/* Per-tier logo recolor */}
      {hasLogo && onLogoTint && onLogoTintClear && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Palette className="h-3 w-3" />
            Logo color
            {tinting && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2.5 w-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                Applying…
              </span>
            )}
          </Label>
          <p className="text-[10px] text-muted-foreground -mt-1">
            Recolor a solid logo to fit this background. Leave as Original for multi-color logos.
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Original (no tint) */}
            <button
              type="button"
              onClick={onLogoTintClear}
              disabled={tinting}
              title="Original (no recolor)"
              className={cn(
                'relative h-7 w-7 rounded-full border transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed',
                !activeTint ? 'border-primary ring-2 ring-primary/40' : 'border-border/50 hover:border-primary/40'
              )}
            >
              {/* checkerboard = "as uploaded" */}
              <span
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #b0b0b0 25%, transparent 25%), linear-gradient(-45deg, #b0b0b0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #b0b0b0 75%), linear-gradient(-45deg, transparent 75%, #b0b0b0 75%)',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                  backgroundColor: '#f0f0f0',
                }}
              />
            </button>

            {LOGO_TINTS.map((t) => {
              const isActive = activeTint === norm(t.color)
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => onLogoTint(t.color)}
                  disabled={tinting}
                  title={t.name}
                  className={cn(
                    'relative h-7 w-7 rounded-full border flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                    isActive ? 'border-primary ring-2 ring-primary/40' : 'border-border/50 hover:border-primary/40'
                  )}
                  style={{ backgroundColor: t.color }}
                >
                  {isActive && (
                    <Check
                      className="h-3.5 w-3.5"
                      style={{ color: norm(t.color) === '#FFFFFF' ? '#111111' : '#FFFFFF' }}
                    />
                  )}
                </button>
              )
            })}

            {/* Custom color */}
            <label
              title="Custom color"
              className={cn(
                'relative h-7 w-7 rounded-full border cursor-pointer overflow-hidden transition-all',
                tinting && 'opacity-50 cursor-not-allowed',
                isCustomTint ? 'border-primary ring-2 ring-primary/40' : 'border-border/50 hover:border-primary/40'
              )}
              style={
                isCustomTint
                  ? { backgroundColor: logoTint as string }
                  : {
                      background:
                        'conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)',
                    }
              }
            >
              <input
                type="color"
                value={isCustomTint ? (logoTint as string) : (norm(tier.foregroundColor) ?? '#000000')}
                onChange={(e) => onLogoTint(e.target.value)}
                disabled={tinting}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
