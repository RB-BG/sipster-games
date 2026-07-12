// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { lazy, Suspense } from 'react'
import HomeScreen from '@/screens/HomeScreen'
import DebugScreen from '@/screens/DebugScreen'
import HotseatSetupScreen from '@/screens/HotseatSetupScreen'
import LobbyScreen from '@/screens/LobbyScreen'
import ProfileScreen from '@/screens/ProfileScreen'
import RulesScreen from '@/screens/RulesScreen'
import { useStrings } from '@/store/localeStore'
import { useGameStore } from '@/store/gameStore'
import { useNetStore } from '@/store/netStore'

// Lazy zodat three/rapier niet in de startbundel zitten.
const DiceLabScreen = lazy(() => import('@/screens/DiceLabScreen'))
const GameScreen = lazy(() => import('@/screens/GameScreen'))

export default function App() {
  const strings = useStrings()
  const loader = <p className="p-8 text-muted-foreground">{strings.rolling}</p>
  const hasGame = useGameStore((s) => s.state !== null)
  const screen = useGameStore((s) => s.screen)
  const role = useNetStore((s) => s.role)
  const netPhase = useNetStore((s) => s.netState?.phase ?? 'lobby')

  // Dev-hulpschermen: /?debug (engine), /?dice (3D-steering).
  const params = new URLSearchParams(window.location.search)
  if (params.has('debug')) return <DebugScreen />
  if (params.has('dice')) {
    return <Suspense fallback={loader}>{<DiceLabScreen />}</Suspense>
  }

  // Verbonden (host of guest): lobby tot de host start, daarna het spel.
  if (role !== 'none') {
    if (netPhase !== 'lobby') {
      return <Suspense fallback={loader}>{<GameScreen />}</Suspense>
    }
    return <LobbyScreen />
  }

  // Hotseat-potje op dit toestel.
  if (hasGame) {
    return <Suspense fallback={loader}>{<GameScreen />}</Suspense>
  }

  // Uitnodigingslink: /?room=ABCD springt direct naar het join-formulier.
  const roomParam = params.get('room')
  if (roomParam && screen === 'home') {
    return <ProfileScreen mode="join" initialCode={roomParam} />
  }

  if (screen === 'rules') return <RulesScreen />
  if (screen === 'setup') return <HotseatSetupScreen />
  if (screen === 'host') return <ProfileScreen mode="host" />
  if (screen === 'join') return <ProfileScreen mode="join" />
  return <HomeScreen />
}
