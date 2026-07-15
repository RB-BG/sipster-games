// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { createStorage } from '@sipster/core/storage'
import { DEFAULT_RULES, type RuleConfig } from '@/engine/types'

// De laad-/bewaarlogica leeft in @sipster/core; hier alleen de bussen-namespace + regels.
export const { loadProfile, saveProfile, newPlayerId, loadRules, saveRules } =
  createStorage<RuleConfig>({
    profileKey: 'bussen.profile',
    rulesKey: 'bussen.rules',
    defaultRules: DEFAULT_RULES,
  })
