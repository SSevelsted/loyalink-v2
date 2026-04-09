'use client'

import { useQuery } from '@tanstack/react-query'
import { useStudio } from './use-studio'

type MigrationPreview = {
  members: Record<string, number>
  promotions: Record<string, number>
}

export function useTierMemberCounts(slugs: string[]) {
  const { currentStudio } = useStudio()

  return useQuery({
    queryKey: ['tier_member_counts', currentStudio?.id, slugs],
    queryFn: async () => {
      const res = await fetch(
        `/api/rewards/migration/preview?studioId=${currentStudio!.id}&slugs=${slugs.join(',')}`
      )
      if (!res.ok) throw new Error('Failed to fetch member counts')
      return (await res.json()) as MigrationPreview
    },
    enabled: !!currentStudio && slugs.length > 0,
  })
}
