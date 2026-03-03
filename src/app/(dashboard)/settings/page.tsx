"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function SettingsPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    void run();
  }, [supabase]);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <div className="p-6 max-w-4xl space-y-6 animate-fade-in">
        <div className="stat-card bg-linear-to-br from-accent-blue/10 to-accent-purple/10 border-accent-blue/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-linear-to-br from-accent-blue to-accent-purple flex items-center justify-center text-2xl font-bold text-white">
              {user?.email?.charAt(0).toUpperCase() || "?"}
            </div>
            <div>
              <h3 className="text-lg font-semibold">Account</h3>
              <p className="text-text-secondary text-sm">
                {user?.email || "Loading..."}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border-2 border-accent-red/50 bg-linear-to-br from-accent-red/15 via-accent-red/5 to-transparent p-6 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
          <div className="absolute inset-0 bg-linear-to-r from-accent-red/10 to-transparent animate-pulse pointer-events-none" />

          <div className="relative">
            <h3 className="text-xl font-bold mb-2 text-accent-red flex items-center gap-3">
              <span className="text-3xl">🚨</span>
              Danger Zone
            </h3>
            <p className="text-sm text-text-muted mb-4">
              Proceed with caution. These actions cannot be undone.
            </p>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="btn bg-accent-red hover:bg-red-600 text-white shadow-lg shadow-accent-red/30 hover:shadow-accent-red/50 transition-all w-full"
            >
              {loading ? "Logging out..." : "🚪 Logout"}
            </button>
          </div>
        </div>

        <div className="text-center text-text-muted text-sm space-y-1 py-4">
          <p className="font-medium">💰 FinTrack</p>
          <p className="text-xs">
            Personal Finance Tracker • Built with Next.js + Supabase
          </p>
        </div>
      </div>
    </>
  );
}
