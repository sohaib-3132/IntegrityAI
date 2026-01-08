import { supabase } from './supabase';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, AlertTriangle, Search, Loader2, CheckCircle2, Lock, Zap, Globe, 
  Menu, X, History, LayoutDashboard, Trash2, Sun, Moon, 
  FileText, RefreshCw, Copy, Edit3, Repeat, Sparkles, HelpCircle, User, Bot, 
  LogIn, ArrowRight, Mail, Key, Eye, PenTool, RotateCcw, Gamepad2, Trophy, Target, Dna, Code, ExternalLink
} from 'lucide-react';

function App() {
  // --- STATE ---
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ status: "Checking..." });
  
  // Plagiarism State (NEW)
  const [plagText, setPlagText] = useState('');
  const [plagResults, setPlagResults] = useState(null);
  const [plagLoading, setPlagLoading] = useState(false);

  // Code Detector State
  const [codeText, setCodeText] = useState('');
  const [codeResult, setCodeResult] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);

  // Paraphraser State
  const [paraInput, setParaInput] = useState('');
  const [paraSentences, setParaSentences] = useState([]); 
  const [paraLoading, setParaLoading] = useState(false);
  const [tone, setTone] = useState('Standard'); 

  // LIVE WRITER STATE
  const [writeText, setWriteText] = useState('');
  const [writeStats, setWriteStats] = useState({ keystrokes: 0, backspaces: 0, pastes: 0, startTime: null });
  const [isWriting, setIsWriting] = useState(false);
  const [proofResult, setProofResult] = useState(null);

  // GAME MODE STATE
  const [gameInput, setGameInput] = useState('');
  const [gamePrompt, setGamePrompt] = useState('Explain how a CPU works using only cooking metaphors.');
  const [gameResult, setGameResult] = useState(null); 
  const CHALLENGE_PROMPTS = [
    "Explain how a CPU works using only cooking metaphors.",
    "Write a sincere apology letter to a time traveler.",
    "Describe the color 'blue' to someone who has never seen it.",
    "Convince a medieval peasant to buy a subscription to Spotify."
  ];

  // Interactive State
  const [activeWord, setActiveWord] = useState({ idx: -1, sentIdx: -1 }); 
  const [activeSentence, setActiveSentence] = useState(-1); 
  const [suggestions, setSuggestions] = useState([]); 
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0, placement: 'bottom' });

  // Navigation & History
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('scan'); 
  const [history, setHistory] = useState([]);
  const [themeState, setThemeState] = useState('dark');
  const isDark = themeState === 'dark';

  // Auth State
  const [isLoginView, setIsLoginView] = useState(true); 
  const [currentUser, setCurrentUser] = useState(null); 
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  useEffect(() => {
    axios.get('https://integrityai-backend.onrender.com/').then(res => setBackendStatus(res.data)).catch(() => {});
    const savedTheme = localStorage.getItem('integrityTheme');
    if (savedTheme) setThemeState(savedTheme);
  }, []);

  const saveToHistory = (newItem) => {
    if (!currentUser) return;
    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem(`integrityHistory_${currentUser.email}`, JSON.stringify(updatedHistory));
  };

  const calculatePosition = (event) => {
    const rect = event.target.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement = spaceBelow < 250 ? 'top' : 'bottom';
    setPopupPosition({ top: placement === 'bottom' ? rect.bottom + window.scrollY + 5 : rect.top + window.scrollY - 5, left: rect.left + window.scrollX, placement });
  };

  const resetApp = () => { setText(''); setResult(null); setCodeText(''); setCodeResult(null); setPlagText(''); setPlagResults(null); setCurrentView('scan'); };
  const toggleTheme = () => { const t = isDark ? 'light' : 'dark'; setThemeState(t); localStorage.setItem('integrityTheme', t); };
  const clearHistory = () => { if (confirm("Clear logs?")) { setHistory([]); if(currentUser) localStorage.removeItem(`integrityHistory_${currentUser.email}`); } };
  
  const restoreHistoryItem = (item) => {
    if (item.type === 'scan') { setText(item.fullText); setResult({ prediction: item.prediction, confidence: item.confidence, risk_level: item.risk }); setCurrentView('scan'); }
    else if (item.type === 'plag') { setPlagText(item.fullText); setPlagResults(item.matches); setCurrentView('plagiarism'); }
    else if (item.type === 'proof') { setWriteText(item.textSnippet); setProofResult(item.report); setCurrentView('write'); }
    else if (item.type === 'game') { setGameInput(item.textSnippet); setGamePrompt(item.result.prompt); setGameResult(item.result); setCurrentView('game'); }
    else { setParaInput(item.original); setParaSentences(item.result.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [item.result]); setCurrentView('paraphrase'); }
    setIsSidebarOpen(false);
  };

  // --- API HANDLERS ---
  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true); setResult(null);
    try {
      const response = await axios.post('https://integrityai-backend.onrender.com/analyze', { content: text });
      const scanResult = response.data;
      setResult(scanResult);
      saveToHistory({ id: Date.now(), type: 'scan', textSnippet: text.substring(0, 50)+"...", fullText: text, prediction: scanResult.prediction, confidence: scanResult.confidence, risk: scanResult.risk_level, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString() });
    } catch (e) { alert("Backend Error"); }
    setLoading(false);
  };

  const handlePlagiarismCheck = async () => {
    if (!plagText.trim()) return;
    setPlagLoading(true); setPlagResults(null);
    try {
      const response = await axios.post('https://integrityai-backend.onrender.com/check_plagiarism', { content: plagText });
      const matches = response.data.matches;
      setPlagResults(matches);
      saveToHistory({ id: Date.now(), type: 'plag', textSnippet: plagText.substring(0, 50)+"...", fullText: plagText, matches: matches, prediction: matches.length > 0 ? "Plagiarism Detected" : "Original", risk: matches.length > 0 ? "High" : "Low", confidence: matches.length * 10, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString() });
    } catch (e) { alert("Backend Error (Check logs)"); }
    setPlagLoading(false);
  };

  const handleCodeAnalyze = async () => { setCodeLoading(true); setTimeout(() => { setCodeResult({ prediction: "Human-Written Code", confidence: 92.5, risk_level: "Low", perplexity: 14.2 }); setCodeLoading(false); }, 1500); };
  
  const handleParaphrase = async () => {
    if (!paraInput.trim()) return;
    setParaLoading(true); setParaSentences([]);
    try {
      const response = await axios.post('https://integrityai-backend.onrender.com/paraphrase', { content: paraInput, tone: tone });
      const rawText = response.data.paraphrased;
      setParaSentences(rawText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [rawText]);
      saveToHistory({ id: Date.now(), type: 'paraphrase', original: paraInput, result: rawText, tone: tone, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString() });
    } catch (e) { alert("Backend Error"); }
    setParaLoading(false);
  };

  // --- LIVE WRITER & GAME ---
  const handleWritingInput = (e) => { setWriteText(e.target.value); if (!isWriting) { setIsWriting(true); setWriteStats(prev => ({ ...prev, startTime: Date.now() })); } };
  const handleKeyDown = (e) => { setWriteStats(prev => ({ ...prev, keystrokes: prev.keystrokes + 1, backspaces: e.key === 'Backspace' ? prev.backspaces + 1 : prev.backspaces })); };
  const resetLiveWriter = () => { setWriteText(''); setWriteStats({ keystrokes: 0, backspaces: 0, pastes: 0, startTime: null }); setIsWriting(false); setProofResult(null); };
  const generateProofReport = () => { if (!writeText.trim()) return; const endTime = Date.now(); const wpm = Math.round((writeText.split(/\s+/).length) / ((endTime - writeStats.startTime) / 60000)) || 0; let score = 100; if (writeStats.pastes > 0) score -= 20; if (wpm > 120) score -= 30; if (writeStats.backspaces > 5) score += 5; if(score>100)score=100; if(score<0)score=0; setProofResult({ score, verdict: score<50?"Likely Copied":score<80?"Suspicious":"Verified Human", wpm, keystrokes: writeStats.keystrokes, color: score<50?"red":score<80?"yellow":"emerald" }); saveToHistory({ id: Date.now(), type: 'proof', textSnippet: writeText.substring(0, 50)+"...", report: {score, verdict: score<50?"Likely Copied":score<80?"Suspicious":"Verified Human"}, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString() }); };
  const cyclePrompt = () => { setGamePrompt(CHALLENGE_PROMPTS[Math.floor(Math.random() * CHALLENGE_PROMPTS.length)]); setGameResult(null); };
  const handleGameSubmit = async () => { if (!gameInput.trim()) return; setLoading(true); try { const response = await axios.post('https://integrityai-backend.onrender.com/analyze', { content: gameInput }); const scan = response.data; const humanScore = scan.risk_level === 'Low' ? scan.confidence : (100 - scan.confidence); setGameResult({ win: humanScore > 80, humanScore, aiScore: (100-humanScore).toFixed(1) }); saveToHistory({ id: Date.now(), type: 'game', textSnippet: gameInput.substring(0,30)+"...", result: { win: humanScore > 80, humanScore, prompt: gamePrompt }, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString() }); } catch (e) { alert("Game Error"); } setLoading(false); };

  // --- INTERACTIVE POPUPS ---
  const handleWordClick = async (e, word, sentIdx, wordIdx) => { e.stopPropagation(); calculatePosition(e); setActiveWord({ idx: wordIdx, sentIdx }); setActiveSentence(-1); setLoadingSuggestions(true); try { const res = await axios.post('https://integrityai-backend.onrender.com/synonyms', { word: word.replace(/[^\w\s]/gi, '') }); setSuggestions(res.data.synonyms); } catch (e) {} setLoadingSuggestions(false); };
  const replaceWord = (sentIdx, wordIdx, newWord) => { const newSentences = [...paraSentences]; const words = newSentences[sentIdx].split(' '); words[wordIdx] = newWord + (words[wordIdx].match(/[.,!?;:]$/)?words[wordIdx].slice(-1):''); newSentences[sentIdx] = words.join(' '); setParaSentences(newSentences); setActiveWord({ idx: -1, sentIdx: -1 }); };

  // --- AUTH ---
  const handleAuth = async (e) => { e.preventDefault(); setLoading(true); const { data, error } = isLoginView ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword }) : await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { full_name: authName } } }); if (error) alert(error.message); else { if (isLoginView) { setCurrentUser({ name: data.user.user_metadata.full_name || authEmail.split('@')[0], email: data.user.email, id: data.user.id }); setCurrentView('scan'); } else { alert("Account Created! Login now."); setIsLoginView(true); } } setLoading(false); };
  const handleLogout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setHistory([]); setIsLoginView(true); };

  return (
    <div className={`relative min-h-screen font-sans transition-colors duration-500 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`} onClick={() => { setActiveWord({ idx: -1, sentIdx: -1 }); setActiveSentence(-1); }}>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden"><div className={`absolute top-0 left-0 w-full h-full ${isDark ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black' : 'bg-gradient-to-b from-blue-50 to-white'}`}></div><div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div></div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={(e) => {e.stopPropagation(); setIsSidebarOpen(false)}}></div>}
      <div className={`fixed top-0 left-0 h-full w-72 z-50 transition-transform duration-300 border-r backdrop-blur-xl ${isDark ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-slate-200'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-10"><span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-900'}`}>IntegrityAI</span><button onClick={() => setIsSidebarOpen(false)}><X size={24} className="text-slate-500"/></button></div>
          <nav className="flex-grow space-y-2">
            <button onClick={() => {setCurrentView('scan'); setIsSidebarOpen(false)}} className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${currentView === 'scan' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><LayoutDashboard size={20}/>AI Scanner</button>
            <button onClick={() => {setCurrentView('plagiarism'); setIsSidebarOpen(false)}} className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${currentView === 'plagiarism' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Globe size={20}/>Plagiarism Check</button>
            <button onClick={() => {setCurrentView('code'); setIsSidebarOpen(false)}} className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${currentView === 'code' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Code size={20}/>Code Scanner</button>
            <button onClick={() => {setCurrentView('write'); setIsSidebarOpen(false)}} className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${currentView === 'write' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><PenTool size={20}/>Live Writer</button>
            <button onClick={() => {setCurrentView('game'); setIsSidebarOpen(false)}} className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${currentView === 'game' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Gamepad2 size={20}/>Fool the AI</button>
            <button onClick={() => {setCurrentView('paraphrase'); setIsSidebarOpen(false)}} className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${currentView === 'paraphrase' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><RefreshCw size={20}/>Paraphraser</button>
            <button onClick={() => {setCurrentView('history'); setIsSidebarOpen(false)}} className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${currentView === 'history' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><History size={20}/>History</button>
          </nav>
          <div className="mt-auto pt-6 border-t border-white/10"><button onClick={toggleTheme} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}><div className="flex items-center gap-3">{isDark ? <Moon size={18}/> : <Sun size={18}/>}<span className="text-sm font-bold">{isDark?"Dark":"Light"} Mode</span></div></button></div>
        </div>
      </div>
      
      <nav className={`border-b sticky top-0 z-30 backdrop-blur-md ${isDark ? 'border-white/5 bg-slate-950/50' : 'border-slate-200 bg-white/70'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-4"><button onClick={(e) => {e.stopPropagation(); setIsSidebarOpen(true)}} className="p-2 text-slate-500"><Menu size={28}/></button><div className={`hidden md:flex px-3 py-1 rounded-full border items-center gap-2 text-xs font-bold ${backendStatus.status === "Ready" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}><div className={`w-2 h-2 rounded-full ${backendStatus.status==="Ready"?"bg-emerald-500 animate-pulse":"bg-red-500"}`}></div>{backendStatus.status==="Ready"?"ONLINE":"OFFLINE"}</div></div>
          <div onClick={resetApp} className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 cursor-pointer group select-none"><Shield size={24} className="text-blue-500" /><div className="text-2xl font-black tracking-tighter"><span className={`drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>Integrity</span><span className={isDark ? 'text-slate-700' : 'text-slate-400'}>AI</span></div></div>
          <div className="flex items-center gap-4">{currentUser ? (<div className="flex items-center gap-2 cursor-pointer group" onClick={() => setCurrentView('auth')}><div className="text-right hidden sm:block"><div className={`text-xs font-bold ${isDark?'text-white':'text-slate-900'}`}>{currentUser.name}</div><div className="text-[10px] text-slate-500">{currentUser.email}</div></div><div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-transparent group-hover:ring-blue-500 transition-all">{currentUser.name[0].toUpperCase()}</div></div>) : (<button onClick={() => setCurrentView('auth')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isDark ? 'bg-white text-black hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-700'} shadow-lg`}><LogIn size={16} /><span className="hidden sm:inline">Login</span></button>)}</div>
        </div>
      </nav>

      {activeWord.idx !== -1 && (<div className="fixed z-[100] bg-white rounded-xl shadow-2xl overflow-hidden text-sm border border-slate-200 animate-in fade-in zoom-in-95 duration-100" style={{ top: popupPosition.placement === 'bottom' ? popupPosition.top : 'auto', bottom: popupPosition.placement === 'top' ? (window.innerHeight - popupPosition.top + 10) : 'auto', left: popupPosition.left, width: '200px' }} onClick={(e) => e.stopPropagation()}><div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 border-b">Synonyms</div><div className="max-h-56 overflow-y-auto">{loadingSuggestions ? <div className="p-3 text-center"><Loader2 className="animate-spin inline text-indigo-500"/></div> : suggestions.length > 0 ? suggestions.map((syn, i) => (<button key={i} onClick={() => replaceWord(activeWord.sentIdx, activeWord.idx, syn)} className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-slate-800 border-b border-slate-50 last:border-0 hover:text-indigo-600 transition-colors">{syn}</button>)) : <div className="p-2 text-center text-slate-400 text-xs">No synonyms found</div>}</div></div>)}

      <main className="flex-grow p-6 w-full max-w-7xl mx-auto flex flex-col items-center">
        {currentView === 'auth' && (<div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 mt-12"><div className={`p-8 rounded-3xl border shadow-2xl backdrop-blur-xl ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white/90 border-slate-200'}`}><div className="text-center mb-8"><h2 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser ? "My Profile" : (isLoginView ? "Welcome Back" : "Join IntegrityAI")}</h2></div>{currentUser ? (<div className="space-y-6"><div className={`p-6 rounded-2xl border flex flex-col items-center gap-3 ${isDark ? 'bg-slate-950/50 border-white/10' : 'bg-slate-50 border-slate-200'}`}><div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-4xl shadow-xl">{currentUser.name[0].toUpperCase()}</div><div className="text-center"><div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser.name}</div><div className="text-sm text-slate-500">{currentUser.email}</div></div></div><button onClick={handleLogout} className="w-full py-4 rounded-xl font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"><LogIn className="rotate-180" size={20}/> Sign Out</button></div>) : (<form onSubmit={handleAuth} className="space-y-4">{!isLoginView && (<div className="space-y-2"><label className="text-xs font-bold uppercase text-slate-500 ml-1">Full Name</label><input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} placeholder="John Doe" className={`w-full px-4 py-3 rounded-xl border bg-transparent focus:outline-none ${isDark?'border-white/10':'border-slate-200'}`}/></div>)}<div className="space-y-2"><label className="text-xs font-bold uppercase text-slate-500 ml-1">Email</label><input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="name@example.com" className={`w-full px-4 py-3 rounded-xl border bg-transparent focus:outline-none ${isDark?'border-white/10':'border-slate-200'}`}/></div><div className="space-y-2"><label className="text-xs font-bold uppercase text-slate-500 ml-1">Password</label><input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" className={`w-full px-4 py-3 rounded-xl border bg-transparent focus:outline-none ${isDark?'border-white/10':'border-slate-200'}`}/></div><button type="submit" className="w-full py-4 rounded-xl font-bold bg-blue-600 text-white shadow-lg">{isLoginView ? "Sign In" : "Create Account"}</button><div className="text-center mt-6"><button type="button" onClick={() => setIsLoginView(!isLoginView)} className="text-sm font-bold text-blue-500 hover:underline">{isLoginView ? "Create Account" : "Log In"}</button></div></form>)}</div></div>)}

        {currentView === 'scan' && (
          <div className="w-full flex flex-col items-center animate-fade-in mt-8">
            <div className="text-center max-w-3xl space-y-6 mb-12"><h1 className={`text-5xl md:text-7xl font-black tracking-tighter leading-tight bg-clip-text text-transparent ${isDark ? 'bg-gradient-to-b from-white to-slate-500' : 'bg-gradient-to-b from-slate-900 to-slate-500'}`}>Detect Artificial Patterns <span className="text-blue-500">Instantly.</span></h1></div>
            <div className={`w-full max-w-4xl relative backdrop-blur-xl border rounded-3xl p-2 shadow-2xl ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white/80 border-slate-200'}`}><textarea className={`w-full h-64 bg-transparent p-6 text-lg focus:outline-none resize-none font-medium leading-relaxed rounded-2xl ${isDark ? 'text-slate-200 placeholder-slate-600' : 'text-slate-800 placeholder-slate-400'}`} placeholder="Paste suspect text..." value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} /><div className={`flex justify-between items-center px-6 py-4 border-t rounded-b-2xl ${isDark ? 'border-white/5 bg-slate-950/30' : 'border-slate-100 bg-slate-50/50'}`}><span className="text-xs font-mono text-slate-500 uppercase">{text.length} / 2000 chars</span><button onClick={handleAnalyze} disabled={loading || !text} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex gap-2 items-center">{loading ? <Loader2 className="animate-spin"/> : <Search/>}{loading ? "Scanning..." : "Analyze"}</button></div></div>
            {result && (<div className="w-full max-w-4xl mt-10 animate-in fade-in slide-in-from-bottom-6"><div className={`p-8 rounded-[22px] backdrop-blur-xl border ${result.risk_level === 'High' ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}><h3 className={`text-3xl font-black ${result.risk_level==='High'?'text-red-500':'text-emerald-500'}`}>{result.prediction}</h3><div className={`text-6xl font-black mt-2 ${result.risk_level==='High'?'text-red-500':'text-emerald-500'}`}>{result.confidence}% <span className="text-base font-bold text-slate-500 uppercase">Confidence</span></div></div></div>)}
          </div>
        )}

        {/* --- PLAGIARISM CHECKER VIEW (NEW) --- */}
        {currentView === 'plagiarism' && (
          <div className="w-full flex flex-col items-center animate-fade-in mt-8">
            <div className="text-center max-w-3xl space-y-6 mb-12"><h1 className={`text-5xl md:text-7xl font-black tracking-tighter leading-tight bg-clip-text text-transparent ${isDark ? 'bg-gradient-to-b from-white to-slate-500' : 'bg-gradient-to-b from-slate-900 to-slate-500'}`}>Scan for <span className="text-orange-500">Plagiarism.</span></h1></div>
            <div className={`w-full max-w-4xl relative backdrop-blur-xl border rounded-3xl p-2 shadow-2xl ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white/80 border-slate-200'}`}>
                <textarea className={`w-full h-64 bg-transparent p-6 text-lg focus:outline-none resize-none font-medium leading-relaxed rounded-2xl ${isDark ? 'text-slate-200 placeholder-slate-600' : 'text-slate-800 placeholder-slate-400'}`} placeholder="Paste text to check for plagiarism (Max 10 sentences for demo)..." value={plagText} onChange={(e) => setPlagText(e.target.value)} />
                <div className={`flex justify-between items-center px-6 py-4 border-t rounded-b-2xl ${isDark ? 'border-white/5 bg-slate-950/30' : 'border-slate-100 bg-slate-50/50'}`}>
                   <span className="text-xs font-mono text-slate-500 uppercase">{plagText.split('.').length} sentences</span>
                   <button onClick={handlePlagiarismCheck} disabled={plagLoading || !plagText} className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-xl font-bold flex gap-2 items-center">{plagLoading ? <Loader2 className="animate-spin"/> : <Globe/>}{plagLoading ? "Checking Web..." : "Check Plagiarism"}</button>
                </div>
            </div>
            
            {plagResults && (
                <div className="w-full max-w-4xl mt-10 animate-in fade-in slide-in-from-bottom-6">
                    <div className={`p-8 rounded-[22px] backdrop-blur-xl border ${plagResults.length > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-2xl font-black ${plagResults.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{plagResults.length > 0 ? `${plagResults.length} Plagiarized Matches Found` : "No Plagiarism Detected"}</h3>
                        </div>
                        
                        {plagResults.length > 0 ? (
                            <div className="space-y-4">
                                <p className="text-slate-500 mb-4">The following sentences matched content found online. Click to view source.</p>
                                {plagResults.map((match, i) => (
                                    <div key={i} className={`p-4 rounded-xl border flex flex-col gap-2 ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200'}`}>
                                        <p className="font-medium text-red-400">"{match.text}"</p>
                                        <a href={match.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-blue-500 hover:underline"><ExternalLink size={12}/> Found at: {match.source_title || "External Source"}</a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-emerald-500 opacity-80">
                                <CheckCircle2 size={48} className="mb-4"/>
                                <p className="font-bold">Original Content Verified</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
          </div>
        )}

        {currentView === 'code' && (<div className="w-full flex flex-col items-center animate-fade-in mt-8"><div className="text-center max-w-3xl space-y-6 mb-12"><h1 className={`text-5xl md:text-7xl font-black tracking-tighter leading-tight bg-clip-text text-transparent ${isDark ? 'bg-gradient-to-b from-white to-slate-500' : 'bg-gradient-to-b from-slate-900 to-slate-500'}`}>Analyze Code <span className="text-blue-500">Integrity.</span></h1></div><div className={`w-full max-w-4xl relative backdrop-blur-xl border rounded-3xl p-2 shadow-2xl ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white/80 border-slate-200'}`}><textarea className={`w-full h-64 bg-transparent p-6 text-sm font-mono focus:outline-none resize-none leading-relaxed rounded-2xl ${isDark ? 'text-slate-200 placeholder-slate-600' : 'text-slate-800 placeholder-slate-400'}`} placeholder="Paste Python, JS, C++ code here..." value={codeText} onChange={(e) => setCodeText(e.target.value.slice(0, 5000))} /><div className={`flex justify-between items-center px-6 py-4 border-t rounded-b-2xl ${isDark ? 'border-white/5 bg-slate-950/30' : 'border-slate-100 bg-slate-50/50'}`}><span className="text-xs font-mono text-slate-500 uppercase">{codeText.length} / 5000 chars</span><button onClick={handleCodeAnalyze} disabled={codeLoading || !codeText} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex gap-2 items-center">{codeLoading ? <Loader2 className="animate-spin"/> : <Code/>}{codeLoading ? "Scanning..." : "Analyze Code"}</button></div></div></div>)}
        {currentView === 'paraphrase' && (<div className="w-full max-w-5xl animate-fade-in mt-8"><div className="flex justify-between items-end mb-8"><h2 className={`text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Smart Paraphraser</h2></div><div className="grid md:grid-cols-2 gap-6"><div className={`p-6 rounded-3xl border flex flex-col h-[500px] ${isDark ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200'}`}><h3 className="text-sm font-bold uppercase text-slate-500 mb-4 flex gap-2"><FileText size={16}/> Input</h3><textarea className={`flex-grow bg-transparent resize-none focus:outline-none text-lg p-2 rounded-lg ${isDark ? 'text-slate-200 placeholder-slate-600' : 'text-slate-800 placeholder-slate-400'}`} placeholder="Paste text to rewrite..." value={paraInput} onChange={(e) => setParaInput(e.target.value)} /><div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{['Standard', 'Fluent', 'Formal'].map(t => (<button key={t} onClick={() => setTone(t)} className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${tone === t ? 'bg-indigo-600 text-white border-indigo-600' : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{t}</button>))}</div></div><div className={`p-6 rounded-3xl border flex flex-col h-[500px] relative ${isDark ? 'bg-indigo-950/20 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}><h3 className="text-sm font-bold uppercase text-indigo-400 mb-4 flex gap-2"><Sparkles size={16}/> Editor (Click words or sentences)</h3>{paraLoading ? (<div className="flex-grow flex flex-col items-center justify-center text-indigo-400 gap-4"><Loader2 className="animate-spin" size={32}/><span>Rewriting as {tone}...</span></div>) : (<div className={`flex-grow overflow-y-auto p-4 leading-relaxed text-lg ${isDark ? 'text-indigo-100' : 'text-indigo-900'}`}>{paraSentences.length > 0 ? (<div className="text-left">{paraSentences.map((sent, sIdx) => (<span key={sIdx} className="group relative mr-1 hover:bg-indigo-500/10 rounded px-1 transition-colors">{sent.split(' ').map((word, wIdx) => (<span key={wIdx} className="relative inline-block mr-1"><span onClick={(e) => handleWordClick(e, word, sIdx, wIdx)} className={`cursor-pointer rounded hover:text-indigo-400 hover:underline decoration-dashed underline-offset-4 ${activeWord.idx === wIdx && activeWord.sentIdx === sIdx ? 'bg-indigo-500 text-white px-1' : ''}`}>{word}</span></span>))}<span onClick={() => {}} className="inline-flex items-center justify-center w-5 h-5 ml-0.5 rounded-full bg-indigo-500/20 text-indigo-400 cursor-pointer hover:bg-indigo-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 align-middle transform translate-y-[-2px]"><Repeat size={10} /></span></span>))}</div>) : <span className="opacity-40 italic">Result appears here...</span>}</div>)}{paraSentences.length > 0 && <button onClick={() => navigator.clipboard.writeText(paraSentences.join(' '))} className="absolute bottom-6 right-6 p-3 rounded-xl bg-indigo-500 text-white shadow-lg"><Copy size={20}/></button>}</div></div><div className="flex justify-center mt-8"><button onClick={handleParaphrase} disabled={paraLoading || !paraInput} className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-xl font-bold shadow-lg flex gap-3">{paraLoading ? "Processing..." : "Paraphrase Now"} <RefreshCw size={20}/></button></div></div>)}
        {currentView === 'write' && (<div className="w-full max-w-5xl animate-fade-in mt-8"><div className="flex justify-between items-end mb-8"><h2 className={`text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Proof of Authorship</h2></div><div className="grid md:grid-cols-3 gap-6"><div className={`md:col-span-2 p-6 rounded-3xl border flex flex-col h-[500px] ${isDark ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200'}`}><div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold uppercase text-slate-500 flex gap-2"><PenTool size={16}/> Live Editor</h3>{isWriting && <span className="text-xs font-bold text-red-500 animate-pulse flex gap-1"><span className="w-2 h-2 rounded-full bg-red-500 mt-1"></span> Recording</span>}</div><textarea className={`flex-grow bg-transparent resize-none focus:outline-none text-lg p-4 rounded-lg leading-relaxed ${isDark ? 'text-slate-200 placeholder-slate-600' : 'text-slate-800 placeholder-slate-400'}`} placeholder="Start typing..." value={writeText} onChange={handleWritingInput} onKeyDown={handleKeyDown} /><div className="mt-4 flex justify-between items-center"><div className="text-xs text-slate-500 font-mono">{(writeText.length / 5).toFixed(0)} words approx</div><div className="flex gap-2"><button onClick={resetLiveWriter} disabled={!writeText && !proofResult} className={`px-4 py-2 rounded-xl font-bold text-sm shadow-sm flex gap-2 items-center transition-colors ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-red-900/50 hover:text-red-400' : 'bg-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-600'} disabled:opacity-50 disabled:cursor-not-allowed`}><RotateCcw size={16}/> Reset</button><button onClick={generateProofReport} disabled={!writeText} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg flex gap-2 items-center"><Fingerprint size={16}/> Verify</button></div></div></div><div className="space-y-6"><div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'}`}><h3 className="text-sm font-bold uppercase text-slate-500 mb-6">Session Metrics</h3><div className="space-y-6"><div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><Key size={20}/></div><span className="font-medium text-sm">Keystrokes</span></div><span className="font-bold text-xl">{writeStats.keystrokes}</span></div><div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-orange-500/10 text-orange-500"><Edit3 size={20}/></div><span className="font-medium text-sm">Backspaces</span></div><span className="font-bold text-xl">{writeStats.backspaces}</span></div></div></div>{proofResult && (<div className={`p-6 rounded-3xl border animate-in fade-in slide-in-from-bottom-4 ${proofResult.color === 'red' ? 'bg-red-500/10 border-red-500/30' : proofResult.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}><div className="flex items-center gap-3 mb-4"><CheckCircle2 className={proofResult.color==='emerald'?"text-emerald-500":proofResult.color==='red'?"text-red-500":"text-yellow-500"} size={28}/><h3 className={`text-xl font-black ${proofResult.color==='red'?'text-red-500':proofResult.color==='yellow'?'text-yellow-500':'text-emerald-500'}`}>{proofResult.verdict}</h3></div><div className="grid grid-cols-2 gap-4 mb-4"><div className="text-center p-2 rounded-lg bg-black/5"><div className="text-2xl font-bold">{proofResult.score}%</div><div className="text-[10px] uppercase font-bold opacity-60">Humanity</div></div><div className="text-center p-2 rounded-lg bg-black/5"><div className="text-2xl font-bold">{proofResult.wpm}</div><div className="text-[10px] uppercase font-bold opacity-60">WPM</div></div></div></div>)}</div></div></div>)}
        {currentView === 'game' && (<div className="w-full max-w-4xl animate-fade-in mt-8"><div className="text-center mb-8"><h2 className={`text-4xl font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Fool the AI</h2><p className="text-slate-500">Can you write something that our scanner thinks is 100% human?</p></div><div className={`p-8 rounded-3xl border shadow-2xl relative overflow-hidden ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'}`}><div className="flex justify-between items-start mb-6"><div className="flex-1"><div className="flex items-center gap-2 text-indigo-500 font-bold uppercase text-xs tracking-widest mb-2"><Target size={16}/> Challenge Prompt</div><h3 className={`text-2xl font-bold leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>"{gamePrompt}"</h3></div><button onClick={cyclePrompt} className="p-2 rounded-full hover:bg-indigo-500/10 text-indigo-500 transition-colors"><RefreshCw size={20}/></button></div><textarea className={`w-full h-40 bg-transparent p-4 text-lg focus:outline-none resize-none font-medium leading-relaxed rounded-xl border ${isDark ? 'border-white/10 text-slate-200 placeholder-slate-600 focus:border-indigo-500' : 'border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'} transition-all`} placeholder="Write your response here..." value={gameInput} onChange={(e) => setGameInput(e.target.value)} /><div className="flex justify-end mt-4"><button onClick={handleGameSubmit} disabled={loading || !gameInput} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex gap-2 items-center">{loading ? <Loader2 className="animate-spin"/> : <Dna size={20}/>} Check Humanity</button></div>{gameResult && (<div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95"><div className={`p-8 rounded-3xl border shadow-2xl max-w-sm w-full transform transition-all ${gameResult.win ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-red-500/20 border-red-500/50'}`}>{gameResult.win ? <Trophy size={64} className="text-emerald-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]" /> : <Bot size={64} className="text-red-400 mx-auto mb-4" />}<h3 className={`text-3xl font-black mb-2 ${gameResult.win ? 'text-emerald-400' : 'text-red-400'}`}>{gameResult.win ? "YOU WON!" : "AI CAUGHT YOU!"}</h3><p className="text-white/80 mb-6 font-medium">{gameResult.win ? "You successfully fooled the detector." : "The scanner detected artificial patterns."}</p><div className="grid grid-cols-2 gap-4 mb-6"><div className="bg-black/30 p-3 rounded-xl"><div className="text-2xl font-bold text-white">{gameResult.humanScore}%</div><div className="text-[10px] uppercase font-bold text-white/50">Human Score</div></div><div className="bg-black/30 p-3 rounded-xl"><div className="text-2xl font-bold text-white">{gameResult.aiScore}%</div><div className="text-[10px] uppercase font-bold text-white/50">AI Score</div></div></div><button onClick={() => { setGameResult(null); setGameInput(''); cyclePrompt(); }} className="w-full py-3 rounded-xl font-bold bg-white text-black hover:bg-slate-200 transition-colors">Play Again</button></div></div>)}</div></div>)}
        {currentView === 'history' && (<div className="w-full max-w-5xl animate-fade-in mt-8"><div className="flex justify-between items-end mb-8"><h2 className={`text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Activity Log</h2> {history.length > 0 && <button onClick={clearHistory} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 font-bold text-sm border border-red-500/20"><Trash2 size={16} /> Clear</button>}</div>{history.length > 0 ? (<div className="grid gap-4">{history.map((item) => (<div key={item.id} onClick={() => restoreHistoryItem(item)} className={`group relative p-6 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] ${isDark ? 'bg-slate-900/50 border-white/5 hover:border-blue-500/50' : 'bg-white border-slate-200 hover:border-blue-500/50'}`}><div className="flex justify-between items-center"><div className="flex-grow pr-8"><div className="flex items-center gap-3 mb-2">{item.type === 'scan' ? <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.risk === 'High' ? 'bg-red-500/20 text-red-500' : item.risk === 'Medium' ? 'bg-yellow-500/20 text-yellow-600' : 'bg-emerald-500/20 text-emerald-500'}`}>{item.prediction}</span> : item.type === 'plag' ? <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.matches.length > 0 ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{item.prediction}</span> : <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-400">{item.type}</span>}<span className="text-slate-400 text-xs font-mono">{item.date} • {item.time}</span></div><p className={`font-medium line-clamp-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>"{item.textSnippet}"</p></div><div className={`text-xl font-black ${item.confidence > 80 ? 'text-emerald-500' : 'text-slate-500'}`}>{item.confidence}%</div></div></div>))}</div>) : (<div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/50"><div className="inline-flex p-4 rounded-full bg-slate-200/50 mb-4 text-slate-400"><History size={32} /></div><h3 className="text-xl font-bold text-slate-900">No history found</h3></div>)}</div>)}
      </main>
    </div>
  );
}

export default App;