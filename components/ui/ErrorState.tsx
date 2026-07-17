import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

/** Friendly fetch-failure state with an optional retry button */
export default function ErrorState({
  message = "We couldn't load this right now. Please check your connection.",
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="mx-auto mt-10 max-w-md text-center">
      <p className="text-4xl">📡</p>
      <p className="mt-3 font-semibold text-deep-blue">Something went wrong</p>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-5">
          Try Again
        </Button>
      )}
    </Card>
  )
}
