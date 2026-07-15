// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

// De synth-engine leeft in @sipster/core; hier alleen de mexxen-namespace en de
// spel-eigen namen (worp, mex, ridder) als aliassen op de neutrale core-tonen.
import { configureSound } from '@sipster/core/sound'

configureSound('mexxen.muted')

export { isMuted, setMuted, playDrink, playSlap } from '@sipster/core/sound'
export {
  playRattle as playRoll,
  playFanfare as playMex,
  playHorn as playRidder,
} from '@sipster/core/sound'
