'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="h-16 bg-bg-secondary border-b border-border flex items-center justify-between px-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={handleLogout}
          className="btn btn-ghost text-sm"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
