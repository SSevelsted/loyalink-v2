'use client'

import { useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStudio } from './use-studio'
import {
  type ActivationState,
  type ActivationStepKey,
  countCompletedSteps,
  getActivationState,
  isActivationComplete,
  mergeActivationPatch,
} from '@/lib/activation'

type UpdatePatch = {
  walkthroughSeen?: boolean
  steps?: Partial<Record<ActivationStepKey, boolean>>
}

export function useActivation(): {
  state: ActivationState
  completed: number
  total: number
  isComplete: boolean
  update: (patch: UpdatePatch) => Promise<void>
  markStep: (key: ActivationStepKey, value?: boolean) => Promise<void>
  markWalkthroughSeen: () => Promise<void>
} {
  const { currentStudio, refresh } = useStudio()
  const supabase = useMemo(() => createClient(), [])

  const state = useMemo(() => getActivationState(currentStudio), [currentStudio])

  const update = useCallback(
    async (patch: UpdatePatch) => {
      if (!currentStudio) return
      const nextSettings = mergeActivationPatch(currentStudio, patch)
      const { error } = await supabase
        .from('studios')
        .update({ settings: nextSettings })
        .eq('id', currentStudio.id)
      if (error) throw error
      refresh()
    },
    [currentStudio, supabase, refresh],
  )

  const markStep = useCallback(
    (key: ActivationStepKey, value = true) => update({ steps: { [key]: value } }),
    [update],
  )

  const markWalkthroughSeen = useCallback(
    () => update({ walkthroughSeen: true }),
    [update],
  )

  return {
    state,
    completed: countCompletedSteps(state),
    total: 5,
    isComplete: isActivationComplete(state),
    update,
    markStep,
    markWalkthroughSeen,
  }
}
