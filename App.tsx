
import React, { useState, useEffect, useRef } from 'react';
import { Send, Calendar, MessageSquare, Loader2, Sparkles, LogOut, Clock, BellRing, BellOff, Copy, Check, UserPlus, LogIn, ShieldCheck, Activity, Settings, User, Save, RefreshCw } from 'lucide-react';
import { processUserMessage } from './services/geminiService';
import { ScheduleItem, ChatMessage, AIResponse } from './types';
import { getCurrentTimeHHMM } from './utils/timeUtils';
import { speakText } from './utils/audioUtils';
import { ScheduleItemCard } from './components/ScheduleItemCard';
import { generateUserToken, encryptData, decryptData, migrateUserData } from './utils/cryptoUtils';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init',
  role: 'assistant',
  content: 'Hai! Saya Habit Tracker. Paste jadwal atau kebiasaan barumu disini. Saya akan bantu menyusun dan mengingatkan! 🎯',
  timestamp: new Date()
};

function App() {
  // --- Auth & Session State ---
  const [userToken, setUserToken] = useState<string | null>(sessionStorage.getItem('active_token'));
  
  // Auth UI State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [inputToken, setInputToken] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Settings / Profile Modal
  const [showSettings, setShowSettings] = useState(false);
  const [newTokenInput, setNewTokenInput] = useState('');

  // --- App State ---
  const [activeTab, setActiveTab] = useState<'schedule' | 'chat'>('schedule');
  const [currentTime, setCurrentTime] = useState<string>(getCurrentTimeHHMM());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bgNotifyEnabled, setBgNotifyEnabled] = useState(false);
  
  // --- Data State ---
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastNotifiedTask = useRef<string | null>(null);

  // --- AUTH HANDLERS ---

  // 1. REGISTER: Generate Token, Create User Record
  const handleRegister = () => {
      const newToken = generateUserToken();
      
      const userData = {
          createdAt: new Date().toISOString()
      };

      // Save User User Record (Just existance check)
      localStorage.setItem(`HABIT_USER_${newToken}`, JSON.stringify(userData));
      
      setGeneratedToken(newToken);
  };

  // 2. LOGIN: Check Token, Load & Decrypt Data
  const handleLogin = (tokenToUse: string) => {
      const cleanToken = tokenToUse.trim().toUpperCase();
      const userDB = localStorage.getItem(`HABIT_USER_${cleanToken}`);

      if (!userDB) {
          alert("Token tidak ditemukan. Pastikan anda sudah mendaftar/generate token.");
          return;
      }

      try {
          // Success
          setUserToken(cleanToken);
          sessionStorage.setItem('active_token', cleanToken);
          
          // Load Specific User Data
          loadUserData(cleanToken);

      } catch (e) {
          alert("Terjadi kesalahan saat login.");
      }
  };

  const loadUserData = (token: string) => {
      try {
          // Data is stored ENCRYPTED with the Token as the key
          const encryptedSchedule = localStorage.getItem(`schedule_${token}`);
          const encryptedChat = localStorage.getItem(`chat_${token}`);
          
          if (encryptedSchedule) {
              const raw = decryptData(encryptedSchedule, token);
              setSchedule(raw ? JSON.parse(raw) : []);
          } else {
              setSchedule([]);
          }

          if (encryptedChat) {
             const raw = decryptData(encryptedChat, token);
             setMessages(raw ? JSON.parse(raw) : [INITIAL_MESSAGE]);
          } else {
              setMessages([INITIAL_MESSAGE]);
          }

      } catch (e) {
          console.error("Load error", e);
      }
  };

  const handleLogout = () => {
      const confirmLogout = window.confirm("Keluar dari sesi ini? Data tetap aman di browser.");
      if(confirmLogout) {
          sessionStorage.removeItem('active_token');
          // Reset States
          setUserToken(null);
          setSchedule([]);
          setMessages([INITIAL_MESSAGE]);
          setAuthMode('login');
          setGeneratedToken(null);
          setInputToken('');
          setShowSettings(false);
          setNewTokenInput('');
      }
  };

  const copyToken = () => {
      if (generatedToken) {
          navigator.clipboard.writeText(generatedToken);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
      }
  };

  const handleCustomToken = () => {
      if (!userToken) return;
      const cleanNewToken = newTokenInput.trim().toUpperCase();
      
      if (cleanNewToken.length < 3) {
          alert("Token minimal 3 karakter.");
          return;
      }

      if (cleanNewToken === userToken) {
          alert("Token sama dengan yang aktif sekarang.");
          return;
      }

      const success = migrateUserData(userToken, cleanNewToken);
      if (success) {
          alert(`Berhasil! Token anda sekarang: ${cleanNewToken}`);
          setUserToken(cleanNewToken);
          sessionStorage.setItem('active_token', cleanNewToken);
          setShowSettings(false);
          setNewTokenInput('');
      } else {
          alert(`GAGAL: Token '${cleanNewToken}' sudah digunakan oleh pengguna lain. Silakan pilih kata lain.`);
      }
  };

  // --- Notification Handler ---
  const toggleNotification = () => {
      if (!("Notification" in window)) {
          alert("Browser ini tidak mendukung notifikasi sistem.");
          return;
      }

      if (Notification.permission === "granted") {
          setBgNotifyEnabled(!bgNotifyEnabled);
      } else if (Notification.permission === "denied") {
          alert("Izin notifikasi diblokir. Mohon aktifkan di pengaturan browser.");
      } else {
          Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                  setBgNotifyEnabled(true);
                  new Notification("Notifikasi Aktif", { body: "Habit Tracker siap mengingatkan!" });
              }
          });
      }
  };

  // --- Subtask Toggle Handler ---
  const handleSubtaskToggle = (itemId: string, subtaskIndex: number) => {
      setSchedule(prevSchedule => {
          return prevSchedule.map(item => {
              if (item.id !== itemId) return item;
              
              const newSubtasks = [...item.subtasks];
              const currentText = newSubtasks[subtaskIndex];
              
              if (currentText.startsWith("✓ ")) {
                  newSubtasks[subtaskIndex] = currentText.substring(2);
              } else {
                  newSubtasks[subtaskIndex] = "✓ " + currentText;
              }
              
              return { ...item, subtasks: newSubtasks };
          });
      });
  };

  // --- Effects ---
  
  // Auto-Login on Refresh
  useEffect(() => {
      const savedToken = sessionStorage.getItem('active_token');
      if (savedToken) {
          handleLogin(savedToken);
      }
  }, []);

  // Data Persistence (Encrypted)
  useEffect(() => {
    if(userToken && schedule.length > 0) {
        const encrypted = encryptData(JSON.stringify(schedule), userToken);
        localStorage.setItem(`schedule_${userToken}`, encrypted);
    }
  }, [schedule, userToken]);

  useEffect(() => {
    if(userToken && messages.length > 1) { 
        const encrypted = encryptData(JSON.stringify(messages), userToken);
        localStorage.setItem(`chat_${userToken}`, encrypted);
    }
    scrollToBottom();
  }, [messages, userToken]);

  // Schedule Checker
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
        setBgNotifyEnabled(true);
    }

    const checkSchedule = () => {
      const now = getCurrentTimeHHMM();
      setCurrentTime(now);
      
      schedule.forEach(item => {
        // Skip future tasks for notification logic
        if (item.isTomorrow) return;

        if (item.startTime === now && lastNotifiedTask.current !== item.id) {
           lastNotifiedTask.current = item.id;
           
           if (bgNotifyEnabled) {
             const notif = new Notification(`⏰ ${item.title}`, {
               body: `${item.subtasks?.[0]?.replace('✓ ', '') || 'Waktunya dimulai!'} \nKlik untuk melihat detail.`,
               icon: '/vite.svg', 
               tag: 'daily-task' 
             });
             notif.onclick = () => window.focus();
           }

           if (soundEnabled) {
               const cleanSubtask = item.subtasks?.[0]?.replace('✓ ', '') || '';
               const speech = `Saatnya ${item.title}. ${cleanSubtask}`;
               speakText(speech);
           }
        }
      });
    };

    const timer = setInterval(checkSchedule, 1000 * 15);
    return () => clearInterval(timer);
  }, [schedule, soundEnabled, bgNotifyEnabled]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-Expand Textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // --- AI Logic ---
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (soundEnabled) speakText(""); 

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Reset height manually
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const recentContext = messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');

      // Call Service (API Key handled via env)
      const result: AIResponse = await processUserMessage(
          userMsg.content, 
          schedule, 
          currentTime,
          recentContext
      );
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
      
      if (result.schedule && result.schedule.length > 0) {
          setSchedule(result.schedule);
          if (schedule.length === 0) setActiveTab('schedule');
      }

    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Maaf, ada gangguan koneksi. Coba lagi ya.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- SETTINGS MODAL ---
  const SettingsModal = () => (
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">PENGATURAN AKUN</h3>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                      <LogOut className="w-5 h-5 rotate-180" />
                  </button>
              </div>
              
              <div className="bg-slate-100 p-4 rounded-xl border-2 border-slate-300">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Token Saat Ini</div>
                  <div className="text-2xl font-black text-slate-900 tracking-widest break-all">{userToken}</div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">CUSTOM TOKEN (GANTI NAMA)</label>
                  <div className="flex gap-2">
                      <input 
                          value={newTokenInput}
                          onChange={(e) => setNewTokenInput(e.target.value.toUpperCase())}
                          placeholder="HABITKU"
                          className="flex-1 bg-white border-2 border-slate-900 rounded-xl px-3 py-2 font-bold text-slate-900 uppercase focus:outline-none focus:shadow-[2px_2px_0px_0px_black]"
                      />
                      <button 
                          onClick={handleCustomToken}
                          className="bg-indigo-500 text-white px-4 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_black] active:translate-y-1 active:shadow-none font-bold"
                      >
                          <Save className="w-5 h-5" />
                      </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                      Ubah token acak menjadi kata yang mudah diingat.
                  </p>
              </div>

              <div className="border-t-2 border-slate-200 pt-4 mt-4">
                  <button 
                      onClick={handleLogout}
                      className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                      <LogOut className="w-4 h-4" />
                      LOGOUT / KELUAR
                  </button>
              </div>
          </div>
      </div>
  );

  // --- LOGIN OVERLAY COMPONENT ---
  const LoginOverlay = () => (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/10 backdrop-blur-md transition-all">
          <AnimatePresence mode="wait">
              <motion.div 
                key="auth-box"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 w-full max-w-md shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] border-4 border-slate-900 space-y-6"
              >
                  <div className="text-center">
                      <div className="w-20 h-20 bg-indigo-500 rounded-2xl mx-auto flex items-center justify-center mb-6 border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-3">
                          <Activity className="w-10 h-10 text-white" />
                      </div>
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight">HABIT TRACKER</h1>
                      <p className="text-sm font-bold text-slate-500 mt-1">Smart Routine Builder</p>
                  </div>

                  {/* Toggle Tabs */}
                  {generatedToken ? (
                      // --- SUCCESS REGISTRATION VIEW ---
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                          <div className="bg-green-100 border-4 border-slate-900 rounded-2xl p-4 text-center">
                              <p className="text-sm font-bold text-green-800 mb-2">AKUN BERHASIL DIBUAT!</p>
                              <div className="text-4xl font-black text-slate-900 tracking-widest my-2 break-all">{generatedToken}</div>
                              <p className="text-xs text-slate-600">Simpan token ini. Ini adalah kunci aksesmu.</p>
                          </div>
                          
                          <button 
                            onClick={copyToken}
                            className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black py-3 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                          >
                             {copySuccess ? <Check className="w-5 h-5"/> : <Copy className="w-5 h-5"/>}
                             {copySuccess ? "TERSALIN!" : "SALIN TOKEN"}
                          </button>

                          <button 
                            onClick={() => handleLogin(generatedToken)}
                            className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-black py-3 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                          >
                              MASUK KE APLIKASI
                          </button>
                      </div>
                  ) : (
                      // --- LOGIN / REGISTER FORM ---
                      <>
                        <div className="flex bg-slate-100 p-1 rounded-xl border-2 border-slate-900">
                            <button 
                                onClick={() => setAuthMode('login')}
                                className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-wide transition-all ${authMode === 'login' ? 'bg-white text-slate-900 shadow-sm border border-slate-300' : 'text-slate-400'}`}
                            >
                                Masuk
                            </button>
                            <button 
                                onClick={() => setAuthMode('register')}
                                className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-wide transition-all ${authMode === 'register' ? 'bg-white text-slate-900 shadow-sm border border-slate-300' : 'text-slate-400'}`}
                            >
                                Daftar Baru
                            </button>
                        </div>

                        {authMode === 'register' ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                                    <p className="font-bold flex items-center gap-2 mb-1"><ShieldCheck className="w-4 h-4"/> GENERATE TOKEN</p>
                                    Buat token baru untuk mulai. Data anda akan terenkripsi dan tersimpan aman di perangkat ini.
                                </div>
                                <button 
                                    onClick={handleRegister}
                                    className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-black py-4 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                                >
                                    <UserPlus className="w-5 h-5" />
                                    BUAT TOKEN BARU
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-2">Token Anda</label>
                                    <input 
                                        type="text" 
                                        value={inputToken}
                                        onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                                        placeholder="CONTOH: X9A2B"
                                        className="w-full bg-slate-50 border-4 border-slate-900 rounded-xl p-3 font-mono text-center text-2xl tracking-[0.2em] focus:bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all uppercase placeholder:text-slate-300 placeholder:text-lg placeholder:tracking-normal"
                                    />
                                </div>
                                <button 
                                    onClick={() => handleLogin(inputToken)}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                                >
                                    <LogIn className="w-5 h-5" />
                                    MASUK
                                </button>
                            </div>
                        )}
                      </>
                  )}
              </motion.div>
          </AnimatePresence>
      </div>
  );

  // --- MAIN APP ---
  return (
    <div className="relative flex flex-col h-[100dvh] overflow-hidden bg-[#f0f4f8] text-slate-900 font-sans">
      
      {/* AUTH OVERLAY */}
      {!userToken && <LoginOverlay />}

      {/* Main Content (Blurred if not logged in) */}
      <div className={`flex flex-col h-full w-full transition-all duration-500 ${!userToken ? 'filter blur-sm pointer-events-none opacity-50 scale-[0.98]' : 'opacity-100 scale-100'}`}>
          {/* Top Bar */}
          <div className="bg-white border-b-4 border-slate-900 px-4 py-3 flex justify-between items-center z-30 shrink-0 sticky top-0 safe-top">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <Activity className="w-6 h-6" />
                  </div>
                  <div className="leading-none hidden sm:block">
                      <span className="block font-black text-slate-900 text-lg tracking-tight">HABIT TRACKER</span>
                      {/* Clickable ID to open settings */}
                      <button onClick={() => setShowSettings(true)} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">ID: {userToken || '---'}</span>
                          <Settings className="w-3 h-3 text-slate-400 ml-1" />
                      </button>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button 
                      onClick={toggleNotification}
                      className={`p-2 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all ${bgNotifyEnabled ? 'bg-green-400 text-slate-900' : 'bg-slate-100 text-slate-400'}`}
                  >
                      {bgNotifyEnabled ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </button>
                  <div className="bg-slate-900 text-white px-3 py-2 rounded-xl font-mono font-bold text-sm flex items-center gap-2 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        {currentTime}
                    </div>
                    <button onClick={() => setShowSettings(true)} className="md:hidden p-2 text-slate-400 hover:text-slate-900 transition-colors">
                        <User className="w-5 h-5" />
                    </button>
              </div>
          </div>

          {showSettings && <SettingsModal />}

          {/* Main Layout */}
          <div className="flex-1 flex flex-col md:flex-row md:gap-6 md:p-6 overflow-hidden relative max-w-6xl mx-auto w-full">
            
            {/* SCHEDULE TAB */}
            <div className={`
                flex-1 flex-col h-full overflow-hidden transition-all duration-300
                ${activeTab === 'schedule' ? 'flex' : 'hidden md:flex'}
                md:bg-white md:border-4 md:border-slate-900 md:rounded-[2rem] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]
            `}>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {schedule.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                        <div className="animate-bounce mb-6">
                            <Calendar className="w-20 h-20 text-indigo-300" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Belum Ada Jadwal</h3>
                        <p className="text-slate-500 font-medium max-w-xs mt-2 mx-auto">
                            Ngobrol sama saya di tab chat untuk mulai membangun kebiasaan baru!
                        </p>
                    </div>
                ) : (
                    <>
                      <div className="flex items-center justify-between mb-2 md:mt-2">
                          <h2 className="text-2xl font-black text-slate-900 italic tracking-tight">TIMELINE</h2>
                          <span className="text-xs font-black px-3 py-1 bg-black text-white rounded-full">
                              {schedule.length} ITEMS
                          </span>
                      </div>
                      <div className="space-y-4 pb-24 md:pb-4">
                          <AnimatePresence>
                              {schedule.map((item, idx) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                    >
                                        <ScheduleItemCard 
                                            item={item} 
                                            currentTime={currentTime} 
                                            onToggleSubtask={(sIdx) => handleSubtaskToggle(item.id, sIdx)}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                      </div>
                    </>
                )}
              </div>
            </div>

            {/* CHAT TAB */}
            <div className={`
                flex-1 flex-col h-full overflow-hidden relative
                ${activeTab === 'chat' ? 'flex' : 'hidden md:flex'}
                md:bg-white md:border-4 md:border-slate-900 md:rounded-[2rem] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]
            `}>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar pb-4 md:pb-4">
                    {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                        <div className={`
                            max-w-[85%] p-4 text-sm font-medium leading-relaxed relative border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]
                            ${msg.role === 'user' 
                                ? 'bg-indigo-500 text-white rounded-[20px] rounded-br-none' 
                                : 'bg-white text-slate-800 rounded-[20px] rounded-bl-none'
                            }
                        `}>
                        {msg.content}
                        </div>
                    </div>
                    ))}
                    
                    {/* Reasoning / Thinking Animation */}
                    {isLoading && (
                      <div className="flex justify-start animate-in slide-in-from-bottom-2 fade-in duration-300">
                          <div className="bg-emerald-100 border-2 border-emerald-300 rounded-[20px] rounded-bl-none p-4 max-w-[85%] shadow-[4px_4px_0px_0px_rgba(16,185,129,0.2)]">
                              <div className="flex items-center gap-3 text-emerald-800 font-bold text-xs">
                                  <div className="relative w-4 h-4">
                                      <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                                      <div className="relative w-4 h-4 bg-emerald-600 rounded-full"></div>
                                  </div>
                                  <span className="animate-pulse">Sedang Menganalisa Jadwal...</span>
                              </div>
                          </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
              </div>

              {/* Auto-Expanding Input Area */}
              <div className="p-3 bg-white border-t-4 border-slate-900 z-20">
                  <div className="relative flex items-end gap-2">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Tulis update kebiasaan..."
                        className="w-full bg-slate-100 border-2 border-slate-900 rounded-xl px-4 py-3 font-medium text-slate-900 focus:bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] resize-none transition-all overflow-y-auto max-h-[120px] min-h-[50px]"
                        rows={1}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !input.trim()}
                        className="h-[50px] w-[50px] shrink-0 flex items-center justify-center bg-indigo-500 text-white rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_black] active:translate-y-[2px] active:shadow-none hover:bg-indigo-600 disabled:opacity-50 disabled:active:translate-y-0 disabled:shadow-[4px_4px_0px_0px_black] transition-all"
                      >
                        <Send className="w-6 h-6" />
                      </button>
                  </div>
              </div>
            </div>
          </div>

          {/* MOBILE BOTTOM NAV */}
          <div className="md:hidden bg-white border-t-4 border-slate-900 grid grid-cols-2 z-40 safe-bottom rounded-t-[2rem] shadow-[0px_-4px_10px_rgba(0,0,0,0.1)] overflow-hidden shrink-0">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors border-r-4 border-slate-900 ${
                activeTab === 'schedule' ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar className={`w-6 h-6 ${activeTab === 'schedule' ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">Jadwal</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                activeTab === 'chat' ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-slate-400 hover:text-slate-600'
              }`}
            >
              <MessageSquare className={`w-6 h-6 ${activeTab === 'chat' ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">Asisten</span>
            </button>
          </div>
      </div>
    </div>
  );
}

export default App;
