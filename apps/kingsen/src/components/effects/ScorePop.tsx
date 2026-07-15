// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { AnimatePresence, motion } from 'framer-motion'
import { useStrings } from '@/store/localeStore'

export type PopKind = 'correct' | 'fout' | 'bluf-betrapt' | 'bluf-mis' | 'bus-af' | 'bus-uit'

export interface Pop {
  id: number
  kind: PopKind
  /** Spelersnaam, voor de bluf-varianten. */
  name?: string
}

const VIGNET: Record<PopKind, string> = {
  correct: 'radial-gradient(60% 45% at 50% 45%, #34e0e855 0%, transparent 70%)',
  fout: 'radial-gradient(60% 45% at 50% 45%, #ff5ea855 0%, transparent 70%)',
  'bluf-betrapt': 'radial-gradient(60% 45% at 50% 45%, #ff4d6d66 0%, transparent 70%)',
  'bluf-mis': 'radial-gradient(60% 45% at 50% 45%, #ff5ea866 0%, transparent 70%)',
  'bus-af': 'radial-gradient(60% 45% at 50% 45%, #ff4d6d55 0%, transparent 70%)',
  'bus-uit': 'radial-gradient(60% 45% at 50% 45%, #34e0e866 0%, transparent 70%)',
}

/** Grote glyph per knal-soort. */
const GLYPH: Record<PopKind, string> = {
  correct: '✓',
  fout: '✗',
  'bluf-betrapt': '🃏',
  'bluf-mis': '🃏',
  'bus-af': '🚌',
  'bus-uit': '🎉',
}

const TONE: Record<PopKind, string> = {
  correct: 'text-cyan-soft',
  fout: 'text-magenta',
  'bluf-betrapt': 'text-destructive',
  'bluf-mis': 'text-magenta',
  'bus-af': 'text-destructive',
  'bus-uit': 'text-cyan-soft',
}

/** Fullscreen knal voor de spelmomenten: goed/fout, call bluff en de bus. */
export default function ScorePop({ pop }: { pop: Pop | null }) {
  const strings = useStrings()

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden">
      <AnimatePresence>
        {pop && (
          <motion.div
            key={pop.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            {/* Flits-vignet achter de tekst */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0] }}
              transition={{ duration: 1, times: [0, 0.2, 1] }}
              className="absolute inset-0"
              style={{ background: VIGNET[pop.kind] }}
            />
            <motion.div
              initial={{ scale: 0.25, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: -3, opacity: 1 }}
              exit={{ scale: 1.15, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 17 }}
              className={`font-heading text-8xl font-extrabold drop-shadow-2xl ${TONE[pop.kind]}`}
            >
              {GLYPH[pop.kind]}
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-2 text-center text-xl font-semibold text-ivory drop-shadow"
            >
              {strings.popText(pop.kind, pop.name ?? '')}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
