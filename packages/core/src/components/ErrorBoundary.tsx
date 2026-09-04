// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { Component, type ReactNode } from 'react'

interface Props {
  /** Getoond als een child (bv. een lazy-geladen scherm) niet kon renderen/laden. */
  message: string
  retryLabel: string
  children: ReactNode
}

interface State {
  failed: boolean
}

/**
 * Vangt render- en lazy-import-fouten op zodat een mislukte chunk-fetch (bv. een
 * hikkende verbinding op mobiel) een retry-knop toont in plaats van de app voor
 * altijd op de Suspense-loader te laten hangen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-foreground">{this.props.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground"
          >
            {this.props.retryLabel}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
