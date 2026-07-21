"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApiUrl, setToken } from "@/lib/auth";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${getApiUrl()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kayıt başarısız");

      setToken(data.token);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">{error}</div>}
      <div>
        <label className="text-xs text-neutral-400">Ad Soyad</label>
        <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-sm text-neutral-200 mt-1 focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="text-xs text-neutral-400">E-posta</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-sm text-neutral-200 mt-1 focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="text-xs text-neutral-400">Şifre</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-sm text-neutral-200 mt-1 focus:outline-none focus:border-blue-500" />
      </div>
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 text-sm">
        Kayıt Ol & Başla
      </button>
      <p className="text-center text-xs text-neutral-500 mt-4">
        Zaten hesabın var mı? <Link href="/login" className="text-blue-400 hover:underline">Giriş Yap</Link>
      </p>
    </form>
  );
}