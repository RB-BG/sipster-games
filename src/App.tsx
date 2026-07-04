import { lazy, Suspense } from 'react'
import HomeScreen from '@/screens/HomeScreen'
import DebugScreen from '@/screens/DebugScreen'
import HotseatSetupScreen from '@/screens/HotseatSetupScreen'
import { strings } from '@/i18n/strings'
import { useGameStore } from '@/store/gameStore'

// Lazy zodat three/rapier niet in de startbundel zitten.
const DiceLabScreen = lazy(() => import('@/screens/DiceLabScreen'))
const GameScreen = lazy(() => import('@/screens/GameScreen'))

const loader = <p className="p-8 text-muted-foreground">{strings.rolling}</p>

export default function App() {
  const hasGame = useGameStore((s) => s.state !== null)
  const screen = useGameStore((s) => s.screen)

  // Dev-hulpschermen: /?debug (engine), /?dice (3D-steering).
  const params = new URLSearchParams(window.location.search)
  if (params.has('debug')) return <DebugScreen />
  if (params.has('dice')) {
    return <Suspense fallback={loader}>{<DiceLabScreen />}</Suspense>
  }

  if (hasGame) {
    return <Suspense fallback={loader}>{<GameScreen />}</Suspense>
  }
  if (screen === 'setup') return <HotseatSetupScreen />
  return <HomeScreen />
}
