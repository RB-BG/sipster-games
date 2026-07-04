import HomeScreen from '@/screens/HomeScreen'
import DebugScreen from '@/screens/DebugScreen'

export default function App() {
  // Dev-hulpscherm om de engine zonder game-UI te bespelen: /?debug
  const debug = new URLSearchParams(window.location.search).has('debug')
  return debug ? <DebugScreen /> : <HomeScreen />
}
