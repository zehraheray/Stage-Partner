"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface LogItem {
  id: string;
  prompt: string;
  response: string;
  latencyMs: number;
  score?: number;
}

interface User {
  id: number;
  email: string;
  full_name: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Sistem Hazır (Edge AI Simülasyonu)");
  const [promptInput, setPromptInput] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // JWT Token Kontrolü (Auth Guard)
  useEffect(() => {
    const token = localStorage.getItem("stage_token");

    if (!token) {
      // Token yoksa doğrudan Login sayfasına yönlendir
      router.push("/login");
      return;
    }

    // Token varsa profil verilerini doğrula
    fetch("http://localhost:8080/user/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Geçersiz oturum");
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setLoading(false);
        fetchLogs();
      })
      .catch(() => {
        // Token geçersizse temizle ve Login'e yönlendir
        localStorage.removeItem("stage_token");
        router.push("/login");
      });
  }, [router]);

  // Logları Çekme
  const fetchLogs = async () => {
    try {
      const res = await fetch("http://localhost:8080/llm/logs");
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          const mappedLogs: LogItem[] = data.data.map((item: any) => ({
            id: item.id.toString(),
            prompt: item.prompt,
            response: item.response,
            latencyMs: item.latency_ms,
            score: item.score > 0 ? item.score : undefined,
          }));
          setLogs(mappedLogs);
        }
      }
    } catch (err) {
      console.log("Loglar çekilemedi.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("stage_token");
    router.push("/login");
  };

  // Prompt Çalıştırma ve Backend'e Kaydetme
  const handleGenerate = async () => {
    if (!promptInput.trim() || isGenerating) return;

    setIsGenerating(true);
    setCurrentResponse("");
    const startTime = performance.now();

    setTimeout(async () => {
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime) + 320;
      const mockResponse = `[Gemma 2B Raw Output]: "${promptInput}" prompt'u analiz edildi. Filtre uygulanmamış ham yanıt üretildi.`;

      setCurrentResponse(mockResponse);

      try {
        const res = await fetch("http://localhost:8080/llm/log/raw-output", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptInput,
            response: mockResponse,
            latency_ms: latency,
          }),
        });

        const resData = await res.json();
        const newLog: LogItem = {
          id: resData.data?.id?.toString() || Date.now().toString(),
          prompt: promptInput,
          response: mockResponse,
          latencyMs: latency,
        };

        setLogs((prev) => [newLog, ...prev]);
      } catch (error: any) {
        setCurrentResponse("Backend Bağlantı Hatası: " + error.message);
      } finally {
        setIsGenerating(false);
      }
    }, 600);
  };

  // Decision Score Verme
  const handleScore = async (id: string, score: number) => {
    setLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, score } : log))
    );

    try {
      await fetch("http://localhost:8080/llm/score/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(id), score }),
      });
    } catch (err) {
      console.error("Skor gönderilemedi:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-neutral-400 text-sm">
        Oturum doğrulanıyor...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Bar */}
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Raw LLM <span className="text-blue-500">Monitoring & Scoring</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Stage Partner AI — Edge LLM Analytics
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs flex items-center gap-3">
            <div>
              <p className="text-neutral-200 font-medium">{user?.full_name || user?.email}</p>
              <p className="text-emerald-400 text-[10px]">● Oturum Açık</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 rounded-lg transition-colors text-[11px]"
            >
              Çıkış
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sol Kolon: Prompt Studio */}
        <div className="space-y-4 bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-200">Prompt Studio</h2>

          <div className="space-y-2">
            <label className="text-xs text-neutral-400 uppercase tracking-wider">Test Prompt</label>
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Model çıktısını test etmek için bir metin girin..."
              rows={4}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !promptInput.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 text-sm"
          >
            {isGenerating ? "İşleniyor (Inference)..." : "Çıktı Üret & Backend'e Logla"}
          </button>

          {currentResponse && (
            <div className="mt-4 space-y-2">
              <span className="text-xs text-blue-400 uppercase tracking-wider font-semibold">Anlık Ham Çıktı</span>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-sm text-neutral-300 max-h-48 overflow-y-auto leading-relaxed">
                {currentResponse}
              </div>
            </div>
          )}
        </div>

        {/* Sağ Kolon: Logs & Scoring */}
        <div className="space-y-4 bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800 flex flex-col h-[550px]">
          <h2 className="text-lg font-semibold text-neutral-200">Database Monitoring Logs</h2>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-neutral-600 text-sm">
                Veritabanında henüz kayıtlı log bulunmuyor.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                  <div className="flex justify-between items-center text-xs text-neutral-500">
                    <span className="font-mono">DB ID: #{log.id} | Latency: {log.latencyMs}ms</span>
                    <span className={log.score ? "text-emerald-400 font-semibold" : "text-amber-500"}>
                      {log.score ? `Decision Score: ${log.score}/5` : "Puan Bekliyor"}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 italic">"{log.prompt}"</p>
                  <p className="text-sm text-neutral-200 line-clamp-3">{log.response}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
                    <span className="text-xs text-neutral-500">Kalite Puanı Ver:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleScore(log.id, star)}
                          className={`w-6 h-6 rounded text-xs font-bold transition-colors ${
                            log.score === star
                              ? "bg-blue-600 text-white"
                              : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
                          }`}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}