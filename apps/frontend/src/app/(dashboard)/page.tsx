'use client';
import { useState, useEffect } from 'react';
import { CreateMLCEngine } from '@mlc-ai/web-llm';

type Message = { role: string; content: string; isPending?: boolean; latency?: number; promptContext?: string };

export default function DashboardPage() {
  const [engine, setEngine] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [logs, setLogs] = useState<any[]>([]);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const loadModel = async () => {
    setIsModelLoading(true);
    try {
      const selectedModel = 'gemma-2b-it-q4f16_1-MLC';
      const loadedEngine = await CreateMLCEngine(selectedModel, {
        initProgressCallback: (progress) => setLoadingProgress(progress.text),
      });
      setEngine(loadedEngine);
    } catch (error) {
      console.error(error);
      alert('Model yüklenemedi. Tarayıcınız WebGPU desteklemiyor olabilir.');
    } finally {
      setIsModelLoading(false);
    }
  };

  // Dinamik olarak prompt alabilen generate fonksiyonu
  const handleGenerate = async (overridePrompt?: string) => {
    if (!engine) return alert('Önce Sahne Asistanı modelini yüklemelisin.');
    
    const activePrompt = overridePrompt || prompt;
    if (!activePrompt.trim()) return;

    setIsGenerating(true);
    const startTime = performance.now();

    try {
      const updatedHistory = [...chatHistory, { role: 'user', content: activePrompt }];
      
      const systemMessage = { 
        role: 'system', 
        content: 'Sen usta bir tiyatro senaristi ve sahne asistanısın. Kullanıcı sana sahne durumunu veya bir repliği verecek. Durumu asla açıklama. Doğrudan karakterlerin ağzından, yaratıcı ve akıcı diyaloglar/replikler yaz. Sadece üretilen diyalog metnini ver.' 
      };

      const reply = await engine.chat.completions.create({
        messages: [systemMessage, ...updatedHistory.map(h => ({ role: h.role, content: h.content }))],
      });
      
      const responseText = reply.choices[0].message.content;
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);
      
      // DB'ye göndermiyoruz, SADECE sola ekleyip ONAY bekliyoruz.
      setChatHistory([
        ...updatedHistory, 
        { role: 'assistant', content: responseText, isPending: true, latency: latencyMs, promptContext: activePrompt }
      ]);
      
      setPrompt('');
    } catch (error) {
      console.error(error);
      alert('Çıktı üretilirken hata oluştu.');
    } finally {
      setIsGenerating(false);
    }
  };

// Bekleyen Mesaja Puan Verildiğinde Çalışan Fonksiyon
  const handlePendingScore = async (msgIndex: number, score: number) => {
    const pendingMsg = chatHistory[msgIndex];
    if (!pendingMsg || !pendingMsg.isPending) return;

    // Arayüzde bekleyen durumunu kaldır
    const newHistory = [...chatHistory];
    newHistory[msgIndex].isPending = false;
    setChatHistory(newHistory);

    if (score >= 3) {
      // 3 ve Üzeri: ONAYLANDI -> DB'ye Kaydet ve Loglara Düşür
      try {
        const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        
        // 1. Logu oluştur
        const res = await fetch(`${apiURL}/llm/log`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ prompt: pendingMsg.promptContext, response: pendingMsg.content, latency_ms: pendingMsg.latency })
        });
        
        if (!res.ok) {
          alert(`HATA: Replik veritabanına kaydedilemedi! (Hata Kodu: ${res.status}). Oturumunuz kapanmış olabilir, çıkış yapıp tekrar giriş yapmayı deneyin.`);
          return;
        }

        // Backend'in döndüğü yanıttan direkt yeni oluşturulan ID'yi alıyoruz (En güvenli yöntem)
        const responseData = await res.json();
        const createdId = responseData?.data?.id || responseData?.id;

        if (createdId) {
          // 2. Puanı ver
          const scoreRes = await fetch(`${apiURL}/llm/score`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id: createdId, score })
          });

          if (!scoreRes.ok) {
             console.error("Puan atanamadı:", scoreRes.status);
          }
        } else {
          console.error("Backend kayıt yaptı ama ID dönmedi:", responseData);
        }
        
        fetchLogs(); // Sağ paneli yenile
      } catch (e) {
        console.error("Ağ hatası oluştu:", e);
        alert("Sunucuya bağlanılamadı. Console'u kontrol edin.");
      }
    } else {
      // 2 ve Altı: REDDEDİLDİ -> Yeniden Üretim İste
      const rejectNote = `[Yönetmen Notu: Bu replik reddedildi (${score} Yıldız). Aynı bağlamda daha güçlü, duygusal ve tamamen farklı bir alternatif replik yaz.]`;
      newHistory.push({ role: 'user', content: rejectNote });
      setChatHistory([...newHistory]);
      
      // Otomatik olarak asistanı tekrar tetikle
      handleGenerate(rejectNote);
    }
  };

  const fetchLogs = async () => {
    try {
      const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${apiURL}/llm/logs`, {
        headers: getAuthHeaders(),
        cache: 'no-store' // Cache'i iptal et ki canlı veri gelsin
      });
      const data = await res.json();
      if (data.data) {
        setLogs(data.data.reverse());
      }
    } catch (error) {
      console.error("Loglar çekilemedi", error);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="flex gap-6 h-[calc(100vh-100px)]">
      
      {/* SOL PANEL: Yönetmen / Senarist Diyalog Girişi */}
      <div className="w-1/2 bg-gray-800 rounded-xl p-6 flex flex-col relative border border-gray-700 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-2">🎭 Sahne & Diyalog Yöneticisi</h2>
        <p className="text-gray-400 text-sm mb-6">Yönetmen olarak sahne durumunu girin. Modelin ürettiği repliği puanlayarak onaylayın veya yeniden yazdırın.</p>
        
        <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Edge AI Asistanı:</span>
            {engine ? (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">Sahneye Hazır (GPU)</span>
            ) : (
              <button onClick={loadModel} disabled={isModelLoading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">
                {isModelLoading ? 'Yükleniyor...' : 'Asistanı Yükle (Gemma 2B)'}
              </button>
            )}
          </div>
          {isModelLoading && <p className="text-xs text-indigo-400 mt-2 truncate">{loadingProgress}</p>}
        </div>

        <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-2">
          {chatHistory.length === 0 && <div className="text-gray-500 text-center text-sm mt-10 italic">Diyalog yok. Başlamak için sahne girin.</div>}
          {chatHistory.map((msg, idx) => (
             <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-gray-500 mb-1">{msg.role === 'user' ? 'Yönetmen' : 'Sahne Asistanı'}</span>
                
                <div className={`p-3 rounded-lg max-w-[85%] text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600/30 text-indigo-100 border border-indigo-500/30 rounded-tr-none' : 'bg-gray-700 text-gray-200 border border-gray-600 rounded-tl-none'}`}>
                  {msg.content}
                </div>

                {/* Eğer Mesaj Onay Bekliyorsa Yıldızlar Çıksın */}
                {msg.isPending && (
                  <div className="mt-2 flex flex-col items-start bg-gray-900/50 p-2 rounded border border-yellow-500/30">
                     <span className="text-xs text-yellow-500 mb-1">Sahneye Eklemek İçin Puanla:</span>
                     <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                            key={star} 
                            onClick={() => handlePendingScore(idx, star)}
                            className="w-7 h-7 rounded-full bg-gray-800 border border-gray-600 text-gray-400 hover:bg-yellow-500/20 hover:text-yellow-500 hover:border-yellow-500 transition-all text-xs"
                          >
                            ★
                          </button>
                        ))}
                     </div>
                     <span className="text-[10px] text-gray-500 mt-1">3+ Onaylar | 1-2 Yeniden Yazdırır</span>
                  </div>
                )}
             </div>
          ))}
        </div>

        <div className="mt-auto">
           <textarea 
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none h-24 mb-3 text-sm"
            placeholder="Örn: Karakter A kapıyı sertçe çarpar ve bağırır: 'Bana yalan söyledin!'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button onClick={() => handleGenerate()} disabled={!engine || !prompt.trim() || isGenerating} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2">
            {isGenerating ? 'Replik Düşünülüyor...' : 'Replik Üret'}
          </button>
        </div>
      </div>

      {/* SAĞ PANEL: Loglar */}
      <div className="w-1/2 bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col shadow-xl">
        <h2 className="text-xl font-bold text-white mb-2">📋 Onaylanmış Sahne Logları</h2>
        <p className="text-gray-400 text-sm mb-6">Yönetmen tarafından 3 ve üzeri puan alan replikler senaryoya işlenir ve kulistekiler tarafından görülür.</p>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {logs.map((log) => (
            <div key={log.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-mono text-gray-500">Kayıt: #{log.id} | Hız: {log.latency_ms}ms</span>
                <span className="text-xs font-medium bg-yellow-500/20 px-2 py-1 rounded text-yellow-500 border border-yellow-500/30">
                  Kabul Edildi: {log.decision_score}/5
                </span>
              </div>
              <div className="mb-2">
                 <p className="text-xs text-gray-500 mb-1">Yönetmen / Bağlam:</p>
                 <p className="text-sm text-gray-300 italic">"{log.prompt}"</p>
              </div>
              <div>
                 <p className="text-xs text-gray-500 mb-1">Sahne Repliği:</p>
                 <p className="text-sm text-white bg-gray-800/50 p-2 rounded border border-gray-700/50 whitespace-pre-wrap">{log.response}</p>
              </div>
            </div>
          ))}
          {logs.length === 0 && <div className="text-gray-500 text-center mt-10">Henüz onaylanmış sahne kaydı bulunmuyor.</div>}
        </div>
      </div>
    </div>
  );
}