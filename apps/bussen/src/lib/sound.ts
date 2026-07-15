// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

// De synth-engine leeft in @sipster/core; hier alleen de bussen-namespace en de
// spel-eigen namen (delen, fanfare, bluf) als aliassen op de neutrale core-tonen.
import { configureSound } from '@sipster/core/sound'

configureSound('bussen.muted')

export { isMuted, setMuted, playDrink, playSlap } from '@sipster/core/sound'
export {
  playRattle as playDeal,
  playFanfare,
  playHorn as playBluff,
} from '@sipster/core/sound'
