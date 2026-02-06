'use client';

import { Sidebar } from '@/components/layout';
import { QuickAddFab } from '@/components/ui/QuickAddFab';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-primary page-bg">
      <Sidebar />
      {/* Desktop: sidebar margin, Mobile: top header + bottom nav margins */}
      <main className="md:ml-64 pt-14 pb-24 md:pt-0 md:pb-0 transition-all duration-300">
        {children}
      </main>
      <QuickAddFab />
    </div>
  );
}
