'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-bg-hover/50',
        className
      )}
    />
  );
}

// Pre-built skeleton variants for common use cases
export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-6 w-2/3" />
    </div>
  );
}

export function SkeletonTransactionItem() {
  return (
    <div className="flex items-center justify-between p-3 card">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}

export function SkeletonAccountItem() {
  return (
    <div className="flex items-center justify-between p-3 bg-bg-primary/50 border border-border/50 rounded-xl">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  );
}
