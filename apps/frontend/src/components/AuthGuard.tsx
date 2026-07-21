"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Sunucuda (SSR) token bilinmez; ilk render'da güvenli tarafta kalıp
  // içerik yerine kısa bir yükleniyor durumu gösteriyoruz, gerçek kontrol
  // tarayıcıda (client) yapılıyor.
  const isBrowser = typeof window !== "undefined";
  const hasToken = isBrowser && !!getToken();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  if (!isBrowser || !hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-400 text-sm">
        Oturum kontrol ediliyor...
      </div>
    );
  }

  return <>{children}</>;
}
