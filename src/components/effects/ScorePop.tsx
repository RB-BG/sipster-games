// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { AnimatePresence, motion } from 'framer-motion'
import { useStrings } from '@/store/localeStore'

export type PopKind = 'mex' | '32' | '31' | 'ridder' | 'ridderDubbel'

export interface Pop {
  id: number
  kind: PopKind
  /** Spelersnaam, alleen voor de ridder-varianten. */
  name?: string
}

const VIGNET: Record<PopKind, string> = {
  mex: 'radial-gradient(60% 45% at 50% 45%, #e8a33d55 0%, transparent 70%)',
  '32': 'radial-gradient(60% 45% at 50% 45%, #c8442c44 0%, transparent 70%)',
  '31': 'radial-gradient(60% 45% at 50% 45%, #f4c06a44 0%, transparent 70%)',
  ridder: 'radial-gradient(60% 45% at 50% 45%, #b5c4d144 0%, transparent 70%)',
  ridderDubbel: 'radial-gradient(60% 45% at 50% 45%, #b5c4d155 0%, transparent 70%)',
}

/** Fullscreen knal voor bijzondere momenten: mex, 32, 31 en de ridderslag. */
export default function ScorePop({ pop }: { pop: Pop | null }) {
  const strings = useStrings()
  const isRidder = pop?.kind === 'ridder' || pop?.kind === 'ridderDubbel'

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
              transition={{ duration: pop.kind === 'mex' ? 1.2 : 1, times: [0, 0.2, 1] }}
              className="absolute inset-0"
              style={{ background: VIGNET[pop.kind] }}
            />
            <motion.div
              initial={{ scale: 0.25, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: pop.kind === 'mex' ? -5 : isRidder ? 0 : -2, opacity: 1 }}
              exit={{ scale: 1.15, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 17 }}
              className={`font-heading font-extrabold drop-shadow-2xl ${
                pop.kind === 'mex'
                  ? 'text-8xl text-amber-soft'
                  : pop.kind === '32'
                    ? 'text-8xl text-destructive'
                    : isRidder
                      ? 'text-8xl'
                      : 'text-7xl text-amber-warm'
              }`}
            >
              {pop.kind === 'mex'
                ? 'MEX!'
                : pop.kind === '32'
                  ? '32'
                  : isRidder
                    ? '🛡️'
                    : '31!'}
            </motion.div>
            {pop.kind !== 'mex' && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.12 }}
                className={`mt-1 text-center font-semibold text-ivory drop-shadow ${
                  isRidder ? 'text-2xl' : 'text-lg'
                }`}
              >
                {pop.kind === '32'
                  ? strings.pop32Sub
                  : pop.kind === '31'
                    ? strings.pop31Sub
                    : pop.kind === 'ridder'
                      ? strings.ridderPop(pop.name ?? '')
                      : strings.ridderDubbelPop(pop.name ?? '')}
              </motion.p>
            )}
            {isRidder && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-1 text-sm text-muted-foreground drop-shadow"
              >
                {pop.kind === 'ridder' ? strings.ridderPopSub : strings.ridderDubbelPopSub}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
