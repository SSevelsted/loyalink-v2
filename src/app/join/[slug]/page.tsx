import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { JoinForm } from '@/components/landing/join-form'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('studio_landing_pages')
    .select('headline, description')
    .eq('slug', slug)
    .single()

  if (!page) return { title: 'Not Found' }

  return {
    title: page.headline ?? 'Join',
    description: page.description ?? undefined,
  }
}

export default async function JoinPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('studio_landing_pages')
    .select('*, studios(id, name)')
    .eq('slug', slug)
    .single()

  if (!page) notFound()

  // Increment view count (fire and forget)
  supabase
    .from('studio_landing_pages')
    .update({ view_count: (page.view_count ?? 0) + 1 })
    .eq('id', page.id)
    .then()

  const settings = (page.settings ?? {}) as {
    brandColor?: string
    backgroundColor?: string
    textColor?: string
    logoUrl?: string | null
    buttonText?: string
    showPhone?: boolean
    showEmail?: boolean
  }

  const bgColor = settings.backgroundColor || undefined
  const txtColor = settings.textColor || undefined
  const logoSrc = settings.logoUrl || page.hero_image_url

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      <div className="mx-auto max-w-lg px-4 py-16 space-y-8">
        {logoSrc && (
          <img
            src={logoSrc}
            alt=""
            className="mx-auto h-24 w-24 rounded-full object-cover"
          />
        )}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" style={txtColor ? { color: txtColor } : undefined}>
            {page.headline ?? page.studios?.name}
          </h1>
          {page.description && (
            <p style={txtColor ? { color: txtColor, opacity: 0.7 } : undefined} className="text-muted-foreground">
              {page.description}
            </p>
          )}
        </div>
        <JoinForm
          studioId={page.studio_id}
          landingPageId={page.id}
          brandColor={settings.brandColor}
          backgroundColor={bgColor}
          textColor={txtColor}
          buttonText={settings.buttonText}
          showEmail={settings.showEmail ?? true}
          showPhone={settings.showPhone ?? true}
        />
      </div>
    </div>
  )
}
