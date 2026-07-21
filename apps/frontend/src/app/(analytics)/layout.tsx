import Link from "next/link";

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-8">
      {/* Analytics Üst Bar */}
      <header className="max-w-7xl mx-auto border-b border-neutral-800 pb-4 mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📊</span> LLM Model Performance & Analytics
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">Real-time GORM Latency & Decision Score Metrics</p>
        </div>
        <Link href="/" className="text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 px-4 py-2 rounded-xl transition-colors">
          ← Studio'ya Dön
        </Link>
      </header>

      {/* Analytics Ana Gövde */}
      <main className="max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}