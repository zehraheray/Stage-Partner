"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { logout } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex font-sans">
        {/* Sol Sidebar */}
        <aside className="w-64 border-r border-neutral-800 bg-neutral-900/40 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="font-bold text-lg text-white">Stage Partner <span className="text-blue-500">AI</span></div>
            <nav className="space-y-2 text-sm">
              <Link href="/" className="block px-3 py-2 rounded-xl bg-blue-600/10 text-blue-400 font-medium border border-blue-500/20">
                ● Prompt Studio
              </Link>
              <Link href="/analytics" className="block px-3 py-2 rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors">
                📊 Analytics & Leaderboard
              </Link>
            </nav>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-colors"
            >
              ⏻ Çıkış Yap
            </button>
            <div className="text-xs text-neutral-500 border-t border-neutral-800 pt-4">
              MasterFabric v1.0 • Edge LLM
            </div>
          </div>
        </aside>

        {/* Sağ Ana İçerik Alanı */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}