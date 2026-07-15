// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Share2 } from 'lucide-react'
import { useStrings } from '@/store/localeStore'

export default function QrShare({ roomCode }: { roomCode: string }) {
  const strings = useStrings()
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/?room=${roomCode}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard geweigerd; de QR en code blijven bruikbaar.
    }
  }

  async function share() {
    try {
      await navigator.share({ title: strings.appName, url: link })
    } catch {
      // Gebruiker annuleerde de share-sheet.
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl bg-card-face p-3">
        <QRCodeSVG value={link} size={144} bgColor="#f2f4fb" fgColor="#0b1020" />
      </div>
      <p className="text-sm text-muted-foreground">{strings.scanToJoin}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground active:scale-95"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? strings.copied : strings.copyLink}
        </button>
        {'share' in navigator && (
          <button
            type="button"
            onClick={share}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground active:scale-95"
          >
            <Share2 className="size-4" />
            {strings.shareLink}
          </button>
        )}
      </div>
    </div>
  )
}
