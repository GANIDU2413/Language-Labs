interface SkeletonProps {
  className?: string
}

/** Base pulsing placeholder block */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-lab bg-blue-light ${className}`}
    />
  )
}

/** Grid of card-shaped placeholders (listing pages) */
export function CardGridSkeleton({
  count = 3,
  cardClassName = 'h-40',
  gridClassName = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
}: {
  count?: number
  cardClassName?: string
  gridClassName?: string
}) {
  return (
    <div className={`grid gap-4 ${gridClassName}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cardClassName} />
      ))}
    </div>
  )
}

/** Stacked rows placeholder (tables and lists) */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-8 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  )
}
