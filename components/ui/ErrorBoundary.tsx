'use client'

import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/** Catches render-time JavaScript errors anywhere below it */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // Kept for developers — users see the friendly screen below
    console.error('ErrorBoundary caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-blue-light px-4">
          <div className="w-full max-w-md rounded-lab bg-lab-white p-8 text-center shadow-md">
            <p className="text-4xl">🧯</p>
            <h1 className="mt-3 text-xl font-bold text-deep-blue">
              Something went wrong in the lab
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              An unexpected error occurred. Don&apos;t worry — your data is
              safe. Try reloading the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 min-h-11 rounded-lab bg-electric-blue px-6 py-2.5 font-semibold text-lab-white transition-colors hover:bg-electric-blue/90"
            >
              Reload Page
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
