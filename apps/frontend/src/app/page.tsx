"use client";

import { useEffect, useState } from "react";

interface LogItem {
  id: string;
  prompt: string;
  response: string;
  latencyMs: number;
  score?: number;
}

export default function RawLLMMonitoring() {
  const [status, setStatus] = useState("Sistem Hazır (Simülasyon / Edge AI Modu)");
  const [isReady, setIsReady] = useState(true);
  
  const [promptInput, setPromptInput] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [logs, setLogs] = useState<LogItem[]>([]);

  // Sayfa açıldığında Go Backend'deki mevcut logları çek
  useEffect(() => {
    async function fetchLogs() {
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
        console.log("Henüz backend bağlantısı kurulamadı veya log yok.");
      }
    }
    fetchLogs();
  }, []);

  // Prompt Çalıştırma ve Go Backend'e Kaydetme
  const handleGenerate = async () => {
    if (!promptInput.trim() || isGenerating) return;

    setIsGenerating(true);
    setCurrentResponse("");
    const startTime = performance.now();

    // Model yanıtını simüle et
    setTimeout(async () => {
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime) + 320; // Gerçekçi gecikme süresi

      const mockResponse = `[Gemma 2B Raw Output]: "${promptInput}" prompt'u analiz edildi. Bu çıktı modelin filtre uygulanmamış ham yanıtını temsil eder. Sahnede ses tonu ve diksiyon seviyesi yüksek standarttadır.`;

      setCurrentResponse(mockResponse);

      try {
        // 1. Go Backend'e POST at
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

        // 2. State'i güncelle
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

  // Decision Score Veritabanına Kaydetme
  const handleScore = async (id: string, score: number) => {
    setLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, score } : log))
    );

    try {
      await fetch("http://localhost:8080/llm/score/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(id),
          score: score,
        }),
      });
    } catch (err) {
      console.error("Skor backend'e gönderilemedi:", err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-neutral-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Raw LLM <span className="text-blue-500">Monitoring & Scoring</span>
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Stage Partner AI — Edge LLM Analytics & MasterFabric Go Sync
            </p>
          </div>
          <div className="bg-neutral-900 px-4 py-2 rounded-lg border border-neutral-800 text-xs">
            <span className="text-emerald-400 font-semibold">
              ● {status}
            </span>
          </div>
        </div>

        {/* Workspace Grid */}
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
    </div>
  );
}