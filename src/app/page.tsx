import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
          FinTrack
        </h1>
        <div className="flex gap-3">
          <Link href="/login" className="btn btn-ghost">
            Login
          </Link>
          <Link href="/register" className="btn btn-primary">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-16">
        <div className="text-center max-w-2xl">
          <h2 className="text-5xl font-bold mb-6 leading-tight">
            Take Control of Your
            <span className="bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent"> Finances</span>
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            Track your income, expenses, and savings with beautiful charts and insights.
            Simple, elegant, and built for long-term use.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register" className="btn btn-primary text-lg px-8 py-3">
              Start Tracking →
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl w-full">
          <div className="card text-center">
            <div className="text-4xl mb-3">💳</div>
            <h3 className="font-semibold mb-2">Track Transactions</h3>
            <p className="text-sm text-text-secondary">
              Log income and expenses with categories and multiple accounts
            </p>
          </div>
          <div className="card text-center">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-semibold mb-2">Visual Statistics</h3>
            <p className="text-sm text-text-secondary">
              Beautiful charts showing your spending patterns and trends
            </p>
          </div>
          <div className="card text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-semibold mb-2">Budget Goals</h3>
            <p className="text-sm text-text-secondary">
              Set monthly budgets and get alerts when nearing limits
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-text-muted text-sm">
        <p>Built with Next.js + Supabase • IDR Currency</p>
      </footer>
    </div>
  );
}
