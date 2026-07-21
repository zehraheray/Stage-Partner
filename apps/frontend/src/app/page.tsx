"use client";

import { useEffect, useState } from "react";
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

interface LogItem {
  id: string;
  prompt: string;
  response: string;
  latencyMs: number;
  score?: number;
}

export default function RawLLMMonitoring() {
  const [engine, setEngine] = useState<MLCEngine | null>(null);
  const [status, setStatus] = useState("Gemma modeli tarayıcıya (WebGPU) yükleniyor...");
  const [isReady, setIsReady] = useState(false);
  
  const [promptInput, setPromptInput] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [logs, setLogs] = useState<LogItem[]>([]);

  // Model Kurulumu
  useEffect(() => {
    async function initModel() {
      const selectedModel = "gemma-2b-it-q4f16_1-MLC";
      try {
        const mlcEngine = await CreateMLCEngine(selectedModel, {
          initProgressCallback: (info) => {
            setStatus(info.text);
          },
        });
        setEngine(mlcEngine);
        setStatus("Sistem Hazır: Gemma (WebGPU) aktif.");
        setIsReady(true);
      } catch (error: any) {
        setStatus("Kritik Hata: " + error.message);
      }
    }
    initModel();
  }, []);

  // Prompt Çalıştırma ve Raw İzleme
  const handleGenerate = async () => {
    if (!engine || !promptInput.trim() || isGenerating) return;

    setIsGenerating(true);
    setCurrentResponse("");
    const startTime = performance.now();

    try {
      const completion = await engine.chat.completions.create({
        messages: [{ role: "user", content: promptInput }],
        temperature: 0.7,
      });

      const responseText = completion.choices[0].message.content || "";
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      setCurrentResponse(responseText);

      // Raw log kaydı oluştur
      const newLog: LogItem = {
        id: Date.now().toString(),
        prompt: promptInput,
        response: responseText,
        latencyMs: latency,
      };

      setLogs((prev) => [newLog, ...prev]);
    } catch (error: any) {
      setCurrentResponse("Üretim hatası: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Decision Scoring (Puanlama) İşlemi
  const handleScore = (id: string, score: number) => {
    setLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, score } : log))
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-neutral-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Raw LLM <span className="text-blue-500">Monitoring & Scoring</span>
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Client-Side Edge AI (Gemma via WebGPU) & Quality Analytics
            </p>
          </div>
          <div className="bg-neutral-900 px-4 py-2 rounded-lg border border-neutral-800 text-xs">
            <span className={isReady ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
              ● {status}
            </span>
          </div>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Sol Kolon: Prompt Giriş ve Üretim */}
          <div className="space-y-4 bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-200">Prompt Studio</h2>
            
            <div className="space-y-2">
              <label className="text-xs text-neutral-400 uppercase tracking-wider">Test Prompt</label>
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Modelin çıktısını test etmek için bir prompt girin..."
                rows={4}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!isReady || isGenerating || !promptInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 text-sm"
            >
              {isGenerating ? "Gemma Düşünüyor (Inference)..." : "Çıktı Üret & İzle"}
            </button>

            {/* Anlık Yanıt Paneli */}
            {currentResponse && (
              <div className="mt-4 space-y-2">
                <span className="text-xs text-blue-400 uppercase tracking-wider font-semibold">Anlık Ham Çıktı</span>
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-sm text-neutral-300 max-h-48 overflow-y-auto leading-relaxed">
                  {currentResponse}
                </div>
              </div>
            )}
          </div>

          {/* Sağ Kolon: Monitoring & Decision Scoring Akışı */}
          <div className="space-y-4 bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800 flex flex-col h-[550px]">
            <h2 className="text-lg font-semibold text-neutral-200">Monitoring & Decision Logs</h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-neutral-600 text-sm">
                  Henüz loglanan bir çıktı bulunmuyor.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                    <div className="flex justify-between items-center text-xs text-neutral-500">
                      <span className="font-mono">Latency: {log.latencyMs}ms</span>
                      <span className={log.score ? "text-emerald-400 font-semibold" : "text-amber-500"}>
                        {log.score ? `Skor: ${log.score}/5` : "Puan Bekliyor"}
                      </span>
                    </div>
                    
                    <p className="text-xs text-neutral-400 italic">"{log.prompt}"</p>
                    <p className="text-sm text-neutral-200 line-clamp-3">{log.response}</p>

                    {/* Decision Scoring Butonları (1-5 Puan) */}
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