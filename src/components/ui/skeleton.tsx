// C:\Users\vizir\halal-marriage\src\components\ui\skeleton.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Turn off the pulse animation if you just want a static placeholder */
  animated?: boolean
}

function Skeleton({
  className,
  animated = true,
  ...props
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        "rounded-md bg-muted/70",
        animated && "animate-pulse",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
