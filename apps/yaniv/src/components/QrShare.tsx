// Copyright © 2026 Yaniv. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import QrShareBase from '@sipster/core/QrShare'
import { useStrings } from '@/store/localeStore'

/** Dunne adapter: bindt de yaniv-strings en het eigen thema aan de core-component. */
export default function QrShare({ roomCode }: { roomCode: string }) {
  const strings = useStrings()
  return (
    <QrShareBase
      roomCode={roomCode}
      strings={strings}
      frameClassName="rounded-xl bg-card-face p-3"
      bgColor="#f2f4fb"
      fgColor="#0b1020"
    />
  )
}
