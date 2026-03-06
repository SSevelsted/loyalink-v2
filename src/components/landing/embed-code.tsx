'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { APP_URL } from '@/lib/constants'

type Props = {
  slug: string
}

export function EmbedCode({ slug }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  const joinUrl = `${APP_URL}/join/${slug}`

  const iframeCode = `<iframe src="${joinUrl}" width="100%" height="600" frameborder="0" style="border:none;max-width:480px;margin:0 auto;display:block;"></iframe>`

  const linkCode = `<a href="${joinUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Join Our Loyalty Program</a>`

  const handleCopy = async (code: string, label: string) => {
    await navigator.clipboard.writeText(code)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">
          Iframe Embed
        </label>
        <p className="text-xs text-muted-foreground">
          Paste this into any page on your website to embed the full signup form inline — customers fill it out without leaving your site.
        </p>
        <div className="relative">
          <pre className="text-xs bg-secondary/50 rounded-lg p-3 overflow-x-auto border border-border/30 whitespace-pre-wrap break-all">
            {iframeCode}
          </pre>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-7 w-7 p-0"
            onClick={() => handleCopy(iframeCode, 'iframe')}
          >
            {copied === 'iframe' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">
          Button Link
        </label>
        <p className="text-xs text-muted-foreground">
          Add a styled button anywhere on your site that opens the signup page in a new tab. Works in any website builder.
        </p>
        <div className="relative">
          <pre className="text-xs bg-secondary/50 rounded-lg p-3 overflow-x-auto border border-border/30 whitespace-pre-wrap break-all">
            {linkCode}
          </pre>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-7 w-7 p-0"
            onClick={() => handleCopy(linkCode, 'link')}
          >
            {copied === 'link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
