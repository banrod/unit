export type Personality = 'neutral' | 'playful' | 'serious'

export interface PersonalityProfile {
  baseColor?: string
  scalar?: number
}

export const PERSONALITY_PROFILES: Record<Personality, PersonalityProfile> = {
  neutral: { baseColor: '#666666', scalar: 0 },
  playful: { baseColor: '#ff66cc', scalar: 15 },
  serious: { baseColor: '#3355ff', scalar: -10 },
}

export const DEFAULT_PERSONALITY: Personality = 'neutral'
export const DEFAULT_PERSONALITY_PROFILE = PERSONALITY_PROFILES[DEFAULT_PERSONALITY]
