'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/transactions', label: 'Transactions', icon: '💳' },
  { href: '/accounts', label: 'Accounts', icon: '🏦' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [showTransMenu, setShowTransMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTransMenu && !(event.target as Element).closest('.trans-menu-trigger')) {
         setShowTransMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTransMenu]);

  // Mobile: Bottom Navigation Bar
  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 h-14 bg-bg-secondary/80 backdrop-blur-md border-b border-border/50 flex items-center justify-center px-4 z-50">
          <h1 className="text-xl font-bold text-white">
            Retire Early
          </h1>
        </header>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-bg-secondary/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-around z-50 safe-area-bottom pb-1">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-2xl transition-all duration-300 relative',
                  isActive
                    ? 'text-accent-blue -translate-y-1'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                <div className={cn("p-1 rounded-xl transition-all duration-300", isActive ? "bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "")}>
                  <span className={cn("text-xl transition-transform", isActive ? "scale-105" : "")}>{item.icon}</span>
                </div>
                <span className={cn("text-[9px] font-medium transition-opacity", isActive ? "text-white font-bold" : "opacity-80")}>
                  {item.label}
                </span>

                {isActive && (
                    <span className="absolute -bottom-1 w-1 h-1 bg-white rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </>
    );
  }

  // Desktop: Regular Sidebar
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-bg-secondary/50 backdrop-blur-xl border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <h1 className="text-2xl font-bold text-white">
          Retire Early
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group',
                isActive
                  ? 'bg-white/10 text-white border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="font-semibold tracking-wide">{item.label}</span>

              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
