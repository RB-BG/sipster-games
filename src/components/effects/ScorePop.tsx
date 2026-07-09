import { AnimatePresence, motion } from 'framer-motion'
import { strings } from '@/i18n/strings'

export type PopKind = 'mex' | '32' | '31'

export interface Pop {
  id: number
  kind: PopKind
}

/** Fullscreen score-knal voor de bijzondere worpen: mex, 32 en 31. */
export default function ScorePop({ pop }: { pop: Pop | null }) {
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
              transition={{ duration: pop.kind === 'mex' ? 1.2 : 0.9, times: [0, 0.2, 1] }}
              className="absolute inset-0"
              style={{
                background:
                  pop.kind === 'mex'
                    ? 'radial-gradient(60% 45% at 50% 45%, #e8a33d55 0%, transparent 70%)'
                    : pop.kind === '32'
                      ? 'radial-gradient(60% 45% at 50% 45%, #c8442c44 0%, transparent 70%)'
                      : 'radial-gradient(60% 45% at 50% 45%, #f4c06a44 0%, transparent 70%)',
              }}
            />
            <motion.div
              initial={{ scale: 0.25, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: pop.kind === 'mex' ? -5 : -2, opacity: 1 }}
              exit={{ scale: 1.15, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 17 }}
              className={`font-heading font-extrabold drop-shadow-2xl ${
                pop.kind === 'mex'
                  ? 'text-8xl text-amber-soft'
                  : pop.kind === '32'
                    ? 'text-8xl text-destructive'
                    : 'text-7xl text-amber-warm'
              }`}
            >
              {pop.kind === 'mex' ? 'MEX!' : pop.kind === '32' ? '32' : '31!'}
            </motion.div>
            {pop.kind !== 'mex' && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.12 }}
                className="mt-1 text-lg font-semibold text-ivory drop-shadow"
              >
                {pop.kind === '32' ? strings.pop32Sub : strings.pop31Sub}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
