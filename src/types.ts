import type { HealthPayload } from './lib/api'
import type { PublicConfig } from './lib/types'

export interface LayoutContext {
  config: PublicConfig | null
  health: HealthPayload | null
}
