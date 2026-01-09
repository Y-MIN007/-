
import React, { useState, useCallback, useRef } from 'react';
import { Camera, Image as ImageIcon, Type as TextIcon, Search, CheckCircle, RefreshCw, Download, Sparkles, Copy, X, Globe } from 'lucide-react';
import { CinematicShot, InputMode, Language } from './types';
import { GeminiService } from './services/geminiService';

const translations = {
  en: {
    tagline: "Discover & Synthesize Cinematic References",
    title: "What's the vision?",
    desc: "Upload an image or describe a mood to explore 20+ movie-quality shot references.",
    textMode: "Text",
    imageMode: "Image",
    placeholder: "Describe the scene: 'A lone detective in a rainy neon city, noir atmosphere...'",
    uploadHint: "Click or drag to upload source image",
    btnDiscover: "Discover Shots",
    btnAnalyzing: "Analyzing Cinematography...",
    gridTitle: "Refined Shot References",
    gridDesc: "Select favorite shots to synthesize a master prompt.",
    shotsSelected: "shots selected",
    btnClear: "Clear Selection",
    btnSynthesize: "Generate Master Prompt",
    btnSynthesizing: "Synthesizing...",
    modalTitle: "Synthesized Prompt",
    btnCopy: "Copy Prompt",
    btnClose: "Close",
    developing: "Developing film...",
    error: "Analysis failed. Please try again."
  },
  zh: {
    tagline: "发现并合成电影感视觉参考",
    title: "你的视觉构思是什么？",
    desc: "上传图片或描述氛围，探索 20+ 个电影级镜头参考。",
    textMode: "文本",
    imageMode: "图片",
    placeholder: "描述画面：'一名孤独的侦探在霓虹闪烁的雨夜城市中，黑色电影氛围，沉重的阴影...'",
    uploadHint: "点击或拖拽上传源图片",
    btnDiscover: "探索镜头",
    btnAnalyzing: "正在分析电影构图...",
    gridTitle: "精选镜头参考",
    gridDesc: "选择你喜欢的镜头来合成最终的大师级提示词。",
    shotsSelected: "个镜头已选择",
    btnClear: "清除选择",
    btnSynthesize: "生成大师提示词",
    btnSynthesizing: "正在合成...",
    modalTitle: "合成提示词",
    btnCopy: "复制提示词",
    btnClose: "关闭",
    developing: "正在冲洗胶片...",
    error: "分析失败，请稍后重试。"
  }
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh');
  const [mode, setMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [shots, setShots] = useState<CinematicShot[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [finalPrompt, setFinalPrompt] = useState<string | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  const t = translations[lang];
  const gemini = useRef(new GeminiService());

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInputImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setShots([]);
    setSelectedIds(new Set());
    setFinalPrompt(null);

    try {
      const input = mode === 'text' ? inputText : (inputImage?.split(',')[1] || "");
      const resultShots = await gemini.current.analyzeInput(input, mode === 'image', lang);
      
      setShots(resultShots.map(s => ({ ...s, isGenerating: true })));

      for (let i = 0; i < resultShots.length; i++) {
        try {
          const imageUrl = await gemini.current.generateShotImage(resultShots[i]);
          setShots(prev => prev.map((s, idx) => idx === i ? { ...s, imageUrl, isGenerating: false } : s));
        } catch (err) {
          console.error("Image gen failed for shot", i, err);
          setShots(prev => prev.map((s, idx) => idx === i ? { ...s, isGenerating: false } : s));
        }
      }
    } catch (error) {
      console.error("Analysis failed", error);
      alert(t.error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const generatePrompt = async () => {
    if (selectedIds.size === 0) return;
    setIsGeneratingPrompt(true);
    try {
      const selectedShots = shots.filter(s => selectedIds.has(s.id));
      const prompt = await gemini.current.synthesizeFinalPrompt(selectedShots, lang);
      setFinalPrompt(prompt);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const copyPrompt = () => {
    if (finalPrompt) {
      navigator.clipboard.writeText(finalPrompt);
      alert(lang === 'zh' ? "提示词已复制到剪贴板！" : "Prompt copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen cinematic-gradient pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">CineMatch</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-sm text-gray-400 hidden sm:block">
            {t.tagline}
          </div>
          <button 
            onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10 transition"
          >
            <Globe size={14} />
            {lang === 'en' ? 'English' : '中文'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-10">
        {/* Input Section */}
        <section className="mb-12 max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{t.title}</h2>
          <p className="text-gray-400 mb-8">{t.desc}</p>
          
          <div className="glass p-6 rounded-2xl shadow-2xl">
            <div className="flex gap-4 mb-6 justify-center">
              <button 
                onClick={() => setMode('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${mode === 'text' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-400 hover:bg-white/5'}`}
              >
                <TextIcon size={18} /> {t.textMode}
              </button>
              <button 
                onClick={() => setMode('image')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${mode === 'image' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-400 hover:bg-white/5'}`}
              >
                <ImageIcon size={18} /> {t.imageMode}
              </button>
            </div>

            {mode === 'text' ? (
              <textarea 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] transition-all"
                placeholder={t.placeholder}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            ) : (
              <div className="relative group cursor-pointer border-2 border-dashed border-white/10 rounded-xl p-8 hover:border-indigo-500 transition-colors bg-black/20">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleImageUpload}
                />
                {inputImage ? (
                  <div className="relative h-48">
                    <img src={inputImage} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                    <button onClick={(e) => { e.stopPropagation(); setInputImage(null); }} className="absolute -top-2 -right-2 bg-red-500 p-1 rounded-full shadow-lg"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <ImageIcon size={40} className="mb-2 text-indigo-500/50" />
                    <p className="text-sm">{t.uploadHint}</p>
                  </div>
                )}
              </div>
            )}

            <button 
              disabled={isAnalyzing || (mode === 'text' ? !inputText : !inputImage)}
              onClick={startAnalysis}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/10"
            >
              {isAnalyzing ? <RefreshCw className="animate-spin" /> : <Search size={20} />}
              {isAnalyzing ? t.btnAnalyzing : t.btnDiscover}
            </button>
          </div>
        </section>

        {/* Results Grid */}
        {shots.length > 0 && (
          <section className="mb-12 animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row items-baseline justify-between mb-8 gap-2">
              <h3 className="text-2xl font-bold text-white">{t.gridTitle} ({shots.length})</h3>
              <p className="text-sm text-gray-400">{t.gridDesc}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {shots.map((shot) => (
                <div 
                  key={shot.id}
                  onClick={() => toggleSelect(shot.id)}
                  className={`group relative rounded-xl overflow-hidden glass border transition-all cursor-pointer ${
                    selectedIds.has(shot.id) ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="aspect-video bg-gray-900 relative overflow-hidden">
                    {shot.imageUrl ? (
                      <img src={shot.imageUrl} alt={shot.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-white/5">
                        <RefreshCw className="animate-spin text-indigo-500" />
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{t.developing}</span>
                      </div>
                    )}
                    {selectedIds.has(shot.id) && (
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-full shadow-lg">
                        <CheckCircle size={16} />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{shot.vibe}</p>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h4 className="font-bold text-white mb-1 line-clamp-1">{shot.title}</h4>
                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-400"><span className="text-gray-500 font-semibold">{lang === 'zh' ? '镜头:' : 'Cam:'}</span> {shot.cinematography}</p>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{shot.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 p-4 z-50 shadow-2xl animate-in slide-in-from-bottom">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3 overflow-hidden">
                {shots.filter(s => selectedIds.has(s.id)).slice(0, 5).map(s => (
                  <img key={s.id} src={s.imageUrl} className="inline-block h-10 w-10 rounded-full ring-2 ring-black object-cover bg-gray-800" />
                ))}
              </div>
              <span className="text-sm font-medium text-white">{selectedIds.size} {t.shotsSelected}</span>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm transition"
              >
                {t.btnClear}
              </button>
              <button 
                onClick={generatePrompt}
                disabled={isGeneratingPrompt}
                className="flex-1 sm:flex-none bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-gray-200 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isGeneratingPrompt ? <RefreshCw className="animate-spin" /> : <Sparkles size={18} />}
                {isGeneratingPrompt ? t.btnSynthesizing : t.btnSynthesize}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Result Modal */}
      {finalPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="glass w-full max-w-2xl rounded-3xl p-8 border border-white/20 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-indigo-500" />
                {t.modalTitle}
              </h3>
              <button onClick={() => setFinalPrompt(null)} className="text-gray-400 hover:text-white transition"><X /></button>
            </div>
            
            <div className="bg-black/60 rounded-xl p-6 border border-white/5 mb-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <p className="text-gray-300 leading-relaxed font-mono text-sm whitespace-pre-wrap">{finalPrompt}</p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={copyPrompt}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-xl shadow-indigo-600/20"
              >
                <Copy size={18} /> {t.btnCopy}
              </button>
              <button 
                onClick={() => setFinalPrompt(null)}
                className="px-6 py-4 border border-white/10 hover:bg-white/5 text-white font-medium rounded-xl transition"
              >
                {t.btnClose}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};

export default App;
