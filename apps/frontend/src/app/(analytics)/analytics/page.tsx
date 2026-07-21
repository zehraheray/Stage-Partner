"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  summary: {
    total_prompts: number;
    avg_latency_ms: number;
    avg_score: number;
    scored_prompts: number;
  };
  top_logs: Array<{
    id: number;
    prompt: string;
    response: string;
    latency_ms: number;
    score: number;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("http://localhost:8080/llm/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Analytics çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-neutral-400 text-sm">
        Sistem Analitik Verileri Yükleniyor...
      </div>
    );
  }

  const summary = data?.summary || {
    total_prompts: 0,
    avg_latency_ms: 0,
    avg_score: 0,
    scored_prompts: 0,
  };

  return (
    <div className="space-y-8">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Toplam Prompt */}
        <div className="bg-neutral-900/60 border border-neutral-800 p-5 rounded-2xl space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Toplam Prompt Sayısı
          </p>
          <p className="text-3xl font-bold text-white font-mono">
            {summary.total_prompts}
          </p>
          <p className="text-[11px] text-neutral-500">GORM Veritabanı Kayıtları</p>
        </div>

        {/* Card 2: Ortalama Latency */}
        <div className="bg-neutral-900/60 border border-neutral-800 p-5 rounded-2xl space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Ortalama Latency
          </p>
          <p className="text-3xl font-bold text-blue-400 font-mono">
            {summary.avg_latency_ms.toFixed(1)} <span className="text-sm font-normal text-neutral-400">ms</span>
          </p>
          <p className="text-[11px] text-neutral-500">Inference + Network Süresi</p>
        </div>

        {/* Card 3: Decision Score */}
        <div className="bg-neutral-900/60 border border-neutral-800 p-5 rounded-2xl space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Ortalama Karar Skoru
          </p>
          <p className="text-3xl font-bold text-emerald-400 font-mono">
            {summary.avg_score.toFixed(2)} <span className="text-sm font-normal text-neutral-400">/ 5.0</span>
          </p>
          <p className="text-[11px] text-neutral-500">Kullanıcı Değerlendirmeleri</p>
        </div>

        {/* Card 4: Puanlanan Oranı */}
        <div className="bg-neutral-900/60 border border-neutral-800 p-5 rounded-2xl space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Puanlanmış Çıktılar
          </p>
          <p className="text-3xl font-bold text-purple-400 font-mono">
            {summary.scored_prompts} <span className="text-sm font-normal text-neutral-400">/ {summary.total_prompts}</span>
          </p>
          <p className="text-[11px] text-neutral-500">Inference Kalite Auditing</p>
        </div>

      </div>

      {/* Bar Progress Section */}
      <div className="bg-neutral-900/40 border border-neutral-800 p-6 rounded-2xl space-y-6">
        <h2 className="text-lg font-semibold text-white">Inference Performans Metrik Dağılımı</h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-400">Hedef Latency Eşiği (&lt; 500ms)</span>
              <span className="text-blue-400 font-mono">{summary.avg_latency_ms.toFixed(0)} ms</span>
            </div>
            <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((summary.avg_latency_ms / 1000) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-400">Kalite Skor Başarısı (% Hedef)</span>
              <span className="text-emerald-400 font-mono">{((summary.avg_score / 5) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(summary.avg_score / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="bg-neutral-900/40 border border-neutral-800 p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">🏆 Highest Rated LLM Outputs</h2>
          <button
            onClick={fetchAnalytics}
            className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Yenile
          </button>
        </div>

        <div className="space-y-3">
          {!data?.top_logs || data.top_logs.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4 text-center">Henüz skorlanmış kayıt bulunmuyor.</p>
          ) : (
            data.top_logs.map((log) => (
              <div
                key={log.id}
                className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600/20 text-blue-400 text-[10px] px-2 py-0.5 rounded font-mono border border-blue-500/20">
                      ID #{log.id}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">{log.latency_ms} ms</span>
                  </div>
                  <p className="text-xs text-neutral-400 italic">"{log.prompt}"</p>
                  <p className="text-sm text-neutral-200 line-clamp-1">{log.response}</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-xl text-center self-start sm:self-auto min-w-[100px]">
                  <span className="text-xs text-neutral-500 block text-[10px] uppercase">Decision Score</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {log.score > 0 ? `${log.score} / 5` : "Unrated"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}