import type { Studio } from '@/types/database'

export type ActivationStepKey =
  | 'appDownloaded'
  | 'qrSaved'
  | 'linkShared'
  | 'staffBriefed'
  | 'firstSignup'

export type ActivationState = {
  walkthroughSeen: boolean
  steps: Record<ActivationStepKey, boolean>
}

export const ACTIVATION_STEP_KEYS: ActivationStepKey[] = [
  'appDownloaded',
  'qrSaved',
  'linkShared',
  'staffBriefed',
  'firstSignup',
]

const DEFAULT_STATE: ActivationState = {
  walkthroughSeen: false,
  steps: {
    appDownloaded: false,
    qrSaved: false,
    linkShared: false,
    staffBriefed: false,
    firstSignup: false,
  },
}

export function getActivationState(studio: Studio | null | undefined): ActivationState {
  const settings = (studio?.settings ?? {}) as Record<string, unknown>
  const raw = settings.activation as Partial<ActivationState> | undefined
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STATE, steps: { ...DEFAULT_STATE.steps } }
  const rawSteps = (raw.steps ?? {}) as Partial<Record<ActivationStepKey, boolean>>
  return {
    walkthroughSeen: raw.walkthroughSeen === true,
    steps: {
      appDownloaded: rawSteps.appDownloaded === true,
      qrSaved: rawSteps.qrSaved === true,
      linkShared: rawSteps.linkShared === true,
      staffBriefed: rawSteps.staffBriefed === true,
      firstSignup: rawSteps.firstSignup === true,
    },
  }
}

export function mergeActivationPatch(
  studio: Studio | null | undefined,
  patch: { walkthroughSeen?: boolean; steps?: Partial<Record<ActivationStepKey, boolean>> },
): Record<string, unknown> {
  const settings = { ...((studio?.settings ?? {}) as Record<string, unknown>) }
  const current = getActivationState(studio)
  const next: ActivationState = {
    walkthroughSeen: patch.walkthroughSeen ?? current.walkthroughSeen,
    steps: { ...current.steps, ...(patch.steps ?? {}) },
  }
  settings.activation = next
  return settings
}

export function countCompletedSteps(state: ActivationState): number {
  return ACTIVATION_STEP_KEYS.reduce((n, k) => n + (state.steps[k] ? 1 : 0), 0)
}

export function isActivationComplete(state: ActivationState): boolean {
  return countCompletedSteps(state) === ACTIVATION_STEP_KEYS.length
}
