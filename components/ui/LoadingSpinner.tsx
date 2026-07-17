type SpinnerSize = 'sm' | 'md' | 'lg'

interface LoadingSpinnerProps {
  size?: SpinnerSize
  /** Center the spinner on the full screen */
  fullPage?: boolean
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
}

export default function LoadingSpinner({
  size = 'md',
  fullPage = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-electric-blue border-t-transparent ${sizeClasses[size]}`}
    />
  )

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-lab-white">
        {spinner}
      </div>
    )
  }

  return spinner
}
