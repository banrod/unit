import { API } from '../../../../API'
import { BootOpt } from '../../../../system'
import { Personality } from '../../../personality'

export function webPersonality(
  window: Window,
  root: HTMLElement,
  opt: BootOpt
): API['personality'] {
  let current: Personality = 'neutral'

  const personality: API['personality'] = {
    setPersonality: async function (p: Personality): Promise<void> {
      current = p
      root.dataset.personality = p
    },
    getPersonality: function (): Personality {
      return current
    },
  }

  return personality
}
