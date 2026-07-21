'use client';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Token veya User yoksa /login'e zorla
  useEffect(() => {
    if (!token || !user) {
      router.push('/login');
    }
  }, [token, user, router]);

  if (!token || !user) return null; // Yönlendirme bitene kadar boş ekran göster

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-neutral-950">
      {/* SIDEBAR (Sol Menü) */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between">
        <div>
          {/* Logo / Başlık */}
          <div className="p-6 border-b border-neutral-800">
            <h1 className="text-xl font-bold text-white tracking-wide">
              Stage<span className="text-indigo-500">Partner</span>
            </h1>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">
              Edge-AI Sahne Asistanı
            </p>
          </div>

          {/* Menü Linkleri */}
          <nav className="p-4 flex flex-col gap-2">
            <Link 
              href="/" 
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                pathname === '/' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              🎭 Sahne Yöneticisi
            </Link>
            
            <Link 
              href="/analytics" 
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                pathname === '/analytics' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              📊 Analiz & Skorlar
            </Link>
          </nav>
        </div>

        {/* Alt Kısım - Kullanıcı ve Çıkış */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{user.name}</span>
              <span className="text-[10px] text-emerald-400">● Oturum Açık</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* ANA İÇERİK (Sağ Taraf - page.tsx'in render olduğu yer) */}
      <main className="flex-1 overflow-hidden p-6 bg-neutral-950">
        {children}
      </main>
    </div>
  );
}