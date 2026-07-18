// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import QrShareBase from '@sipster/core/QrShare'
import { useStrings } from '@/store/localeStore'

/** Dunne adapter: bindt de mexxen-strings en het eigen thema aan de core-component. */
export default function QrShare({ roomCode }: { roomCode: string }) {
  const strings = useStrings()
  return (
    <QrShareBase
      roomCode={roomCode}
      strings={strings}
      frameClassName="rounded-xl bg-ivory p-3"
      bgColor="#f3ecd9"
      fgColor="#17130e"
    />
  )
}
