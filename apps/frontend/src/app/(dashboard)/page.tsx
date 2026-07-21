'use client';
import { useState, useEffect } from 'react';
import { CreateMLCEngine } from '@mlc-ai/web-llm';

export default function DashboardPage() {
  const [engine, setEngine] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [logs, setLogs] = useState<any[]>([]);

  // Güvenli API İstekleri İçin Header Oluşturucu
  const getAuthHeaders = () => {
    // Projende token nasıl tutuluyorsa (genelde localStorage'da 'token' olur)
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

  const handleGenerate = async () => {
    if (!engine) return alert('Önce Sahne Asistanı modelini yüklemelisin.');
    if (!prompt.trim()) return;

    setIsGenerating(true);
    const startTime = performance.now();

    try {
      const updatedHistory = [...chatHistory, { role: 'user', content: prompt }];
      
      // === SİHİRLİ DOKUNUŞ: SİSTEM PROMPTU ===
      // Modele kim olduğunu ve ne yapması gerektiğini gizlice söylüyoruz
      const systemMessage = { 
        role: 'system', 
        content: 'Sen usta bir tiyatro senaristi ve sahne asistanısın. Kullanıcı sana sahne durumunu veya bir repliği verecek. SAKIN durumu açıklama veya analiz etme. Doğrudan karakterlerin ağzından, yaratıcı, duygusal ve akıcı devam replikleri (diyaloglar) yaz. Sadece üretilen diyalog metnini ver.' 
      };

      const reply = await engine.chat.completions.create({
        messages: [systemMessage, ...updatedHistory], // Sistem promptu en başa eklenir
      });
      
      const responseText = reply.choices[0].message.content;
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);
      
      setChatHistory([...updatedHistory, { role: 'assistant', content: responseText }]);

      // === BACKEND LOGLAMA (Token ile) ===
      const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${apiURL}/llm/log`, {
        method: 'POST',
        headers: getAuthHeaders(), // Authorization eklendi
        credentials: 'omit', // CORS çakışmasını engeller
        body: JSON.stringify({ prompt, response: responseText, latency_ms: latencyMs })
      });

      if (!res.ok) {
        console.error("Backend log kaydını reddetti. Yetki hatası olabilir.");
      } else {
        fetchLogs(); // Başarılıysa tabloyu yenile
      }
      
      setPrompt('');
    } catch (error) {
      console.error(error);
      alert('Çıktı üretilirken hata oluştu.');
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${apiURL}/llm/logs`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.data) {
        setLogs(data.data.reverse());
      }
    } catch (error) {
      console.error("Loglar çekilemedi", error);
    }
  };

  const updateScore = async (id: number, score: number) => {
    try {
      const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${apiURL}/llm/score`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, score })
      });
      if (res.ok) fetchLogs();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="flex gap-6 h-[calc(100vh-100px)]">
      
      {/* SOL PANEL: Yönetmen / Senarist Diyalog Girişi */}
      <div className="w-1/2 bg-gray-800 rounded-xl p-6 flex flex-col relative border border-gray-700 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-2">🎭 Sahne & Diyalog Yöneticisi</h2>
        <p className="text-gray-400 text-sm mb-6">Yönetmen olarak sahne durumunu girin. Asistan diyalogu doğrudan sürdürecektir.</p>
        
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
          <button onClick={handleGenerate} disabled={!engine || !prompt.trim() || isGenerating} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2">
            {isGenerating ? 'Replik Düşünülüyor...' : 'Replik Üret & Sahneye Logla'}
          </button>
        </div>
      </div>

      {/* SAĞ PANEL: Loglar & Puanlama */}
      <div className="w-1/2 bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col shadow-xl">
        <h2 className="text-xl font-bold text-white mb-2">📋 Sahne Logları & Karar Puanlaması</h2>
        <p className="text-gray-400 text-sm mb-6">Kulisteki oyuncular ve ekip üretilen replikleri buradan takip eder ve puanlar.</p>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {logs.map((log) => (
            <div key={log.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-mono text-gray-500">Kayıt: #{log.id} | Hız: {log.latency_ms}ms</span>
                <span className="text-xs font-medium bg-gray-800 px-2 py-1 rounded text-indigo-400">Puan: {log.decision_score}/5</span>
              </div>
              
              <div className="mb-2">
                 <p className="text-xs text-gray-500 mb-1">Yönetmen / Bağlam:</p>
                 <p className="text-sm text-gray-300 italic">"{log.prompt}"</p>
              </div>
              
              <div className="mb-4">
                 <p className="text-xs text-gray-500 mb-1">Üretilen Replik:</p>
                 <p className="text-sm text-white bg-gray-800/50 p-2 rounded border border-gray-700/50 whitespace-pre-wrap">{log.response}</p>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-800">
                <span className="text-xs text-gray-400 mr-2">Repliği Puanla:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => updateScore(log.id, star)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${log.decision_score >= star ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}>
                    ★
                  </button>
                ))}
              </div>
            </div>
          ))}
          {logs.length === 0 && <div className="text-gray-500 text-center mt-10">Henüz sahne kaydı bulunmuyor. Yeni bir replik üretin.</div>}
        </div>
      </div>
    </div>
  );
}