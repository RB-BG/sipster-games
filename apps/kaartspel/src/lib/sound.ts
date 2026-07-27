// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

// De synth-engine leeft in @sipster/core; hier alleen de kaartspel-namespace en de
// spel-eigen namen (draaien, fanfare) als aliassen op de neutrale core-tonen.
import { configureSound } from '@sipster/core/sound'

configureSound('kaartspel.muted')

export { isMuted, setMuted, playDrink, playSlap } from '@sipster/core/sound'
export {
  playRattle as playDeal,
  playFanfare,
  playHorn as playBluff,
} from '@sipster/core/sound'
