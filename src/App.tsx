import { lazy, Suspense } from 'react'
import HomeScreen from '@/screens/HomeScreen'
import DebugScreen from '@/screens/DebugScreen'

// Lazy zodat three/rapier niet in de startbundel zitten.
const DiceLabScreen = lazy(() => import('@/screens/DiceLabScreen'))

export default function App() {
  // Dev-hulpschermen: /?debug (engine), /?dice (3D-steering).
  const params = new URLSearchParams(window.location.search)
  if (params.has('debug')) return <DebugScreen />
  if (params.has('dice')) {
    return (
      <Suspense fallback={<p className="p-8 text-muted-foreground">Dobbelstenen laden…</p>}>
        <DiceLabScreen />
      </Suspense>
    )
  }
  return <HomeScreen />
}
