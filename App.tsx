
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { analyzeBeverage } from './services/geminiService';
import { AnalysisResult, SafetyStatus, ScanState, SYMPTOMS } from './types';
import {
  Camera,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Info,
  History,
  X,
  Stethoscope,
  AlertOctagon,
  ChevronRight,
  Shield as ShieldIcon,
  ArrowLeft,
  Focus,
  Activity,
  Droplets,
  Search,
  Sparkles,
  Wifi,
  Moon,
  Sun,
  SearchX,
  Target,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Navigation,
  GlassWater,
  ShieldHalf,
  Skull,
  Check,
  ChevronDown
} from 'lucide-react';
import { LANGUAGES, STRINGS, Language } from './translations';

const SafeDrinkLogo: React.FC<{ className?: string; hideText?: boolean; isDarkMode: boolean }> = ({ className = "", hideText = false, isDarkMode }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <svg viewBox="0 0 100 120" className="h-full w-auto drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 110C50 110 90 95 90 45V15L50 5L10 15V45C10 95 50 110 50 110Z" fill={isDarkMode ? "#00A3E0" : "#003366"} />
      <mask id="shield-mask">
        <path d="M50 105C50 105 85 91 85 45V18L50 8L15 18V45C15 91 50 105 50 105Z" fill="white" />
      </mask>
      <g mask="url(#shield-mask)">
        <rect x="0" y="0" width="100" height="120" fill={isDarkMode ? "#080a0c" : "#E0F7FA"} />
        <path d="M10 55C30 45 70 65 90 55V110H10V55Z" fill="#4FC3F7" />
        <path d="M10 75C30 65 70 85 90 75V110H10V75Z" fill="#66CC33" />
        <path d="M50 70C65 70 85 85 85 105H15C15 85 35 70 50 70Z" fill="#4CAF50" />
      </g>
      <path d="M35 35L25 5" stroke={isDarkMode ? "#E0F7FA" : "#003366"} strokeWidth="6" strokeLinecap="round" />
      <path d="M25 5L15 8" stroke={isDarkMode ? "#E0F7FA" : "#003366"} strokeWidth="6" strokeLinecap="round" />
    </svg>
    {!hideText && (
      <span className={`${isDarkMode ? 'text-white' : 'text-[#003366]'} font-black text-4xl tracking-tighter`}>
        Safe<span className={`font-extrabold ${isDarkMode ? 'text-cyan-400' : 'text-[#003366]/90'}`}>Drink</span>
        <span className="text-[10px] align-top ml-1">TM</span>
      </span>
    )}
  </div>
);



const SuccessConfetti: React.FC = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.5}s`,
      size: `${Math.random() * 6 + 2}px`
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle particle-anim"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            width: p.size,
            height: p.size
          }}
        />
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanState, setScanState] = useState<ScanState>({
    isScanning: false,
    result: null,
    error: null
  });
  const [showInterstitial, setShowInterstitial] = useState(false);

  // Translation State
  const [language, setLanguage] = useState<Language>('en');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  // Helper for translations
  const t = (key: keyof typeof STRINGS['en']) => STRINGS[language][key];

  const toggleLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsLangMenuOpen(false);
  };

  const [isGuiding, setIsGuiding] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [envFeedback, setEnvFeedback] = useState({ light: 'Analyzing...', stability: 'Stable' });

  const ANALYSIS_STEPS = useMemo(() => [
    { label: t('initializingLink'), icon: <Wifi className="w-5 h-5" /> },
    { label: t('forensicScan'), icon: <Search className="w-5 h-5" /> },
    { label: t('densityAnalysis'), icon: <Activity className="w-5 h-5" /> },
    { label: t('molecularCheck'), icon: <Droplets className="w-5 h-5" /> },
    { label: t('aiVerification'), icon: <Sparkles className="w-5 h-5" /> }
  ], [language]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.body.style.backgroundColor = isDarkMode ? '#0a0a0a' : '#f8fafc';
  }, [isDarkMode]);

  useEffect(() => {
    if (!hasStarted || scanState.isScanning || scanState.result) return;
    const interval = setInterval(() => {
      const lights = ['Optimum', 'High Contrast', 'Low Light Warning', 'Optimum'];
      const stabs = ['Stable', 'Motion Detected', 'Stable', 'Stable'];
      setEnvFeedback({
        light: lights[Math.floor(Math.random() * lights.length)],
        stability: stabs[Math.floor(Math.random() * stabs.length)]
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [hasStarted, scanState.isScanning, scanState.result]);

  const triggerHaptic = useCallback((type: 'tap' | 'success' | 'warning' | 'error' | 'alarm' | 'heavy') => {
    if (!('vibrate' in navigator)) return;
    switch (type) {
      case 'tap': navigator.vibrate(10); break;
      case 'success': navigator.vibrate([20, 50, 20]); break;
      case 'warning': navigator.vibrate([100, 50, 100]); break;
      case 'error': navigator.vibrate([200, 100, 200]); break;
      case 'alarm': navigator.vibrate([100, 50, 100, 50, 300]); break;
      case 'heavy': navigator.vibrate(50); break;
    }
  }, []);

  const toggleTheme = () => {
    triggerHaptic('tap');
    setIsDarkMode(!isDarkMode);
  };

  const startCamera = async () => {
    try {
      setScanState(prev => ({ ...prev, error: null }));

      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error("Camera requires HTTPS. Use localhost or setup SSL.");
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err: any) {
      console.error("Camera Error:", err);
      let message = "Camera connection failed.";

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "Permission denied. Allow camera access in browser settings.";
      } else if (err.name === 'NotFoundError') {
        message = "No camera found on this device.";
      } else if (err.name === 'NotReadableError') {
        message = "Camera is busy or hardware error.";
      } else if (err.message && err.message.length < 100) {
        message = err.message;
      }

      setScanState(prev => ({ ...prev, error: message }));
    }
  };

  const handleStartScanning = () => {
    triggerHaptic('heavy');
    setHasStarted(true);
    startCamera();
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const returnHome = () => {
    triggerHaptic('tap');
    stopCamera();
    setHasStarted(false);
    resetScan();
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stream]);

  const toggleSymptom = (id: string) => {
    triggerHaptic('tap');
    setSelectedSymptoms(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    triggerHaptic('heavy');
    setIsGuiding(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsGuiding(false);

    setScanState({ isScanning: true, result: null, error: null });
    setAnalysisStepIndex(0);
    setAnalysisProgress(0);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const MAX_DIM = 1200;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > height) {
      if (width > MAX_DIM) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      }
    } else {
      if (height > MAX_DIM) {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    const stepInterval = setInterval(() => {
      setAnalysisStepIndex(prev => {
        if (prev < ANALYSIS_STEPS.length - 1) {
          triggerHaptic('tap');
          return prev + 1;
        }
        return prev;
      });
    }, 1000);

    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => (prev < 90 ? prev + 1 : prev));
    }, 40);

    try {
      const result = await analyzeBeverage(base64Image, selectedSymptoms);
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setAnalysisStepIndex(ANALYSIS_STEPS.length - 1);

      if (result.status === SafetyStatus.SAFE) triggerHaptic('success');
      else if (result.status === SafetyStatus.WARNING) triggerHaptic('warning');
      else if (result.status === SafetyStatus.DANGER || result.status === SafetyStatus.CRITICAL) triggerHaptic('alarm');
      else triggerHaptic('tap');

      // Show Interstitial Result
      setScanState({ isScanning: false, result, error: null });
      setShowInterstitial(true);
      setHistory(prev => [result, ...prev].slice(0, 10));
      setShowSymptoms(false);

      // Auto-hide interstitial after delay
      setTimeout(() => {
        setShowInterstitial(false);
      }, 2500);
    } catch (err: any) {
      triggerHaptic('error');
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      setScanState({ isScanning: false, result: null, error: err.message || "Network timeout. Try again." });
    }
  };

  const resetScan = () => {
    triggerHaptic('tap');
    setScanState({ isScanning: false, result: null, error: null });
    setSelectedSymptoms([]);
    setAnalysisProgress(0);
    setAnalysisStepIndex(0);
  };

  const getStatusConfig = (status: SafetyStatus) => {
    switch (status) {
      case SafetyStatus.SAFE:
        return {
          icon: <ShieldCheck className="w-14 h-14 text-emerald-400" />,
          bg: 'bg-emerald-500/15',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400 success-text-shimmer',
          label: t('secure'),
          description: t('secureDesc')
        };
      case SafetyStatus.WARNING:
        return {
          icon: <AlertTriangle className="w-14 h-14 text-amber-400" />,
          bg: 'bg-amber-500/15',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          label: t('caution'),
          description: t('cautionDesc')
        };
      case SafetyStatus.DANGER:
        return {
          icon: <ShieldAlert className="w-14 h-14 text-rose-500" />,
          bg: 'bg-rose-500/15',
          border: 'border-rose-500/30',
          text: 'text-rose-500',
          label: t('highRisk'),
          description: t('highRiskDesc')
        };
      case SafetyStatus.CRITICAL:
        return {
          icon: <AlertOctagon className="w-14 h-14 text-red-600 animate-pulse" />,
          bg: 'bg-red-700/20',
          border: 'border-red-600/50',
          text: 'text-red-500 font-black',
          label: t('critical'),
          description: t('criticalDesc')
        };
      case SafetyStatus.INVALID:
        return {
          icon: <SearchX className="w-14 h-14 text-slate-400" />,
          bg: 'bg-slate-500/15',
          border: 'border-slate-500/30',
          text: 'text-slate-400',
          label: t('undetected'),
          description: t('undetectedDesc')
        };
      default:
        return {
          icon: <Info className="w-14 h-14 text-gray-400" />,
          bg: 'bg-gray-500/15',
          border: 'border-gray-500/30',
          text: 'text-gray-400',
          label: t('unknown'),
          description: t('unknownDesc')
        };
    }
  };

  if (!hasStarted) {
    return (
      <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-[#080a0c] text-white' : 'bg-[#E0F7FA] text-black'} font-sans items-center justify-center p-8 text-center animate-in fade-in duration-700 relative overflow-hidden`}>
        <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className={`p-3 rounded-full flex items-center gap-2 backdrop-blur-md transition-all shadow-lg ${isDarkMode
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-white/60 hover:bg-white/80 text-[#003366]'
                }`}
            >
              <span className="text-xl">{LANGUAGES.find(l => l.id === language)?.flag}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLangMenuOpen && (
              <div className={`absolute top-full right-0 mt-2 w-48 rounded-xl border backdrop-blur-xl shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto ${isDarkMode ? 'bg-[#111]/95 border-white/10' : 'bg-white/95 border-white/40'
                }`}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => toggleLanguage(lang.id)}
                    className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${language === lang.id
                      ? (isDarkMode ? 'bg-white/10' : 'bg-[#003366]/5')
                      : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-[#003366]/5')
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{lang.flag}</span>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-[#003366]'}`}>{lang.label}</span>
                    </div>
                    {language === lang.id && <Check className="w-4 h-4 text-[#3366FF]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className={`p-3 rounded-full ${isDarkMode ? 'bg-white/10 hover:bg-white/20 text-yellow-400' : 'bg-white/60 hover:bg-white/80 text-[#003366]'} transition-all shadow-lg backdrop-blur-md`}
          >
            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
        </div>

        <div className="relative mb-8 group">
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-cyan-500/10' : 'bg-white/40'} blur-[60px] rounded-full scale-150 transition-all duration-1000`} />
          <div className="relative transform hover:scale-105 transition-all duration-500">
            <SafeDrinkLogo className="h-40" isDarkMode={isDarkMode} />
          </div>
        </div>

        <div className={`w-full max-w-sm mb-12 space-y-6 animate-in slide-in-from-bottom-4 duration-1000 delay-300`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`h-[1px] w-8 ${isDarkMode ? 'bg-cyan-500/30' : 'bg-[#003366]/30'}`} />
            <h3 className={`text-[10px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-cyan-400' : 'text-[#003366]'}`}>{t('processProtocol')}</h3>
            <div className={`h-[1px] w-8 ${isDarkMode ? 'bg-cyan-500/30' : 'bg-[#003366]/30'}`} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Target className="w-5 h-5" />, label: t('target'), sub: t('targetSub') },
              { icon: <Zap className="w-5 h-5" />, label: t('scan'), sub: t('scanSub') },
              { icon: <ShieldCheck className="w-5 h-5" />, label: t('detect'), sub: t('detectSub') }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center group">
                <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/70 border-white'} border backdrop-blur-md shadow-xl transition-all group-hover:scale-110`}>
                  <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-md ${isDarkMode ? 'bg-cyan-400' : 'bg-[#003366]'}`} />
                  <div className={isDarkMode ? 'text-cyan-400' : 'text-[#003366]'}>{step.icon}</div>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-[#003366]'}`}>{step.label}</span>
                <span className={`text-[8px] font-bold ${isDarkMode ? 'text-white/40' : 'text-[#003366]/50'}`}>{step.sub}</span>
              </div>
            ))}
          </div>

          <div className={`${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white'} border rounded-3xl p-4 text-center backdrop-blur-md shadow-lg`}>
            <p className={`text-[11px] ${isDarkMode ? 'text-white' : 'text-[#003366]'} font-extrabold leading-relaxed tracking-tight`}>
              {t('aiToolPath')} <span className={isDarkMode ? 'text-cyan-400' : 'text-[#00A3E0]'}>{t('realTimeSafety')}</span> {t('and')} <span className="text-[#66CC33]">{t('spikeDetection')}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleStartScanning}
          className={`w-full max-w-xs py-5 ${isDarkMode ? 'bg-[#00A3E0]' : 'bg-[#003366]'} text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-2xl active:scale-95 hover:brightness-110 transition-all`}
        >
          {t('initializeScanner')}
          <ChevronRight className="w-5 h-5" />
        </button>

        <p className={`mt-8 text-[9px] ${isDarkMode ? 'text-white/20' : 'text-[#003366]/30'} font-black uppercase tracking-[0.3em]`}>
          Validated Forensic Intelligence
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-black' : 'bg-slate-900'} text-white font-sans overflow-hidden transition-colors`}>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={returnHome} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <SafeDrinkLogo className="h-8" hideText isDarkMode={true} />
            <span className="font-black text-white text-lg tracking-tighter">SafeDrink</span>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className={`p-2 rounded-full transition-colors flex items-center gap-2 ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}
            >
              <span className="text-lg">{LANGUAGES.find(l => l.id === language)?.flag}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLangMenuOpen && (
              <div className={`absolute top-full right-0 mt-2 w-48 rounded-xl border backdrop-blur-xl shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto z-50 ${isDarkMode ? 'bg-[#111]/95 border-white/10' : 'bg-white/95 border-black/10'
                }`}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => toggleLanguage(lang.id)}
                    className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${language === lang.id
                      ? (isDarkMode ? 'bg-white/10' : 'bg-black/5')
                      : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5')
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{lang.flag}</span>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>{lang.label}</span>
                    </div>
                    {language === lang.id && <Check className="w-4 h-4 text-[#3366FF]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white/10 text-white"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => { triggerHaptic('tap'); setShowSymptoms(true); }}
            className={`p-2 rounded-full transition-colors ${selectedSymptoms.length > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-white/10 text-cyan-400'}`}
          >
            <Stethoscope className="w-5 h-5" />
          </button>

        </div>
      </header>

      <main className="relative flex-1 flex flex-col items-center justify-center p-0 transition-all">
        <div className="relative w-full h-full md:max-w-md overflow-hidden bg-black flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[84%] rounded-[3.5rem] border-2 border-white/10" />

            {!scanState.isScanning && !scanState.result && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[60%] flex items-center justify-center">
                <div className="absolute w-8 h-[2px] bg-white/20 left-0" />
                <div className="absolute w-8 h-[2px] bg-white/20 right-0" />
                <div className="absolute w-[2px] h-8 bg-white/20 top-0" />
                <div className="absolute w-[2px] h-8 bg-white/20 bottom-0" />
                <div className="w-16 h-16 border-2 border-[#4FC3F7]/30 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-1.5 h-1.5 bg-[#4FC3F7] rounded-full shadow-[0_0_8px_#4FC3F7]" />
                </div>
                <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${isGuiding ? 'border-[#4FC3F7] w-12 h-12' : 'border-white/20'} transition-all duration-300 rounded-tl-xl`} />
                <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 ${isGuiding ? 'border-[#4FC3F7] w-12 h-12' : 'border-white/20'} transition-all duration-300 rounded-tr-xl`} />
                <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 ${isGuiding ? 'border-[#66CC33] w-12 h-12' : 'border-white/20'} transition-all duration-300 rounded-bl-xl`} />
                <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${isGuiding ? 'border-[#66CC33] w-12 h-12' : 'border-white/20'} transition-all duration-300 rounded-br-xl`} />
              </div>
            )}

            {!scanState.isScanning && !scanState.result && (
              <div className="absolute top-[12%] left-[10%] right-[10%] flex justify-between items-start">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md animate-in slide-in-from-left duration-500">
                    <div className={`w-2 h-2 rounded-full ${envFeedback.light.includes('Optimum') ? 'bg-[#66CC33] shadow-[0_0_8px_#66CC33]' : envFeedback.light.includes('Warning') ? 'bg-amber-500 animate-pulse' : 'bg-cyan-500'}`} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Light: {envFeedback.light}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md animate-in slide-in-from-left duration-700">
                    <div className={`w-2 h-2 rounded-full ${envFeedback.stability === 'Stable' ? 'bg-[#66CC33] shadow-[0_0_8px_#66CC33]' : 'bg-rose-500 animate-pulse'}`} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Grip: {envFeedback.stability}</span>
                  </div>
                </div>
                <div className="px-4 py-2 bg-[#4FC3F7]/10 border border-[#4FC3F7]/20 rounded-2xl backdrop-blur-md flex flex-col items-center">
                  <Target className="w-4 h-4 text-[#4FC3F7] mb-1" />
                  <span className="text-[8px] font-black text-[#4FC3F7] uppercase tracking-tighter">{t('centerDrink')}</span>
                </div>
              </div>
            )}

            <div className="absolute top-[8%] left-[5%] w-12 h-12 border-t-4 border-l-4 border-[#4FC3F7] rounded-tl-3xl shadow-[0_0_15px_#4FC3F7]" />
            <div className="absolute top-[8%] right-[5%] w-12 h-12 border-t-4 border-r-4 border-[#4FC3F7] rounded-tr-3xl shadow-[0_0_15px_#4FC3F7]" />
            <div className="absolute bottom-[8%] left-[5%] w-12 h-12 border-b-4 border-l-4 border-[#66CC33] rounded-bl-3xl shadow-[0_0_15px_#66CC33]" />
            <div className="absolute bottom-[8%] right-[5%] w-12 h-12 border-b-4 border-r-4 border-[#66CC33] rounded-br-3xl shadow-[0_0_15px_#66CC33]" />

            {isGuiding && (
              <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="w-24 h-24 border-2 border-dashed border-[#4FC3F7]/50 rounded-full flex items-center justify-center animate-[pulse_1.5s_infinite]">
                  <Focus className="w-8 h-8 text-[#4FC3F7]" />
                </div>
                <span className="mt-4 text-[10px] font-black tracking-widest uppercase text-white/60">{t('forensicLock')}</span>
              </div>
            )}

            {scanState.isScanning && <div className="scanner-line" />}

            <div className="absolute bottom-32 left-8 right-8 flex justify-between items-end opacity-40">
              <div className="flex flex-col gap-1">
                <div className="flex gap-2 items-center text-[8px] font-black tracking-widest uppercase"><Activity className="w-2.5 h-2.5" /> {t('linkStat')}</div>
                <div className="flex gap-2 items-center text-[8px] font-black tracking-widest uppercase"><Wifi className="w-2.5 h-2.5" /> {t('highDefFeed')}</div>
              </div>
              <div className="text-[8px] font-black tracking-widest uppercase">{t('coreV2')}</div>
            </div>
          </div>

          {scanState.isScanning && (
            <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center px-8 text-center">
              <div className="w-full max-w-xs space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-[#4FC3F7]/10 rounded-full" />
                    <div className="absolute inset-0 border-4 border-[#4FC3F7] border-t-transparent rounded-full animate-spin" />
                    <div className="p-5 bg-white/5 rounded-full backdrop-blur-md">
                      {React.cloneElement(ANALYSIS_STEPS[analysisStepIndex].icon as React.ReactElement<any>, { className: 'w-8 h-8 text-[#4FC3F7]' })}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black italic text-[#4FC3F7] tracking-tight uppercase">
                    {ANALYSIS_STEPS[analysisStepIndex].label}
                  </h3>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#4FC3F7] to-[#66CC33] transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,195,247,0.5)]"
                      style={{ width: `${analysisProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">
                    <span>{t('analysis')}: {analysisProgress}%</span>
                    <span>{t('step')} {analysisStepIndex + 1}/5</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {scanState.result && (
            <div className={`absolute inset-0 z-30 bg-[#080a0c] overflow-y-auto p-0 flex flex-col animate-in slide-in-from-bottom duration-500 pb-32`}>

              {/* INTERSTITIAL WARNING SCREEN */}
              {showInterstitial && (
                <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center animate-in fade-in duration-300 ${getStatusConfig(scanState.result.status).bg.replace('/15', '/95').replace('/20', '/95')} backdrop-blur-2xl`}>
                  <div className="scale-150 transform transition-all duration-1000 animate-pulse">
                    {React.cloneElement(getStatusConfig(scanState.result.status).icon as React.ReactElement<any>, { className: `w-32 h-32 ${getStatusConfig(scanState.result.status).text.split(' ')[0]} drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]` })}
                  </div>
                  <h1 className={`mt-12 text-6xl font-black tracking-tighter uppercase ${getStatusConfig(scanState.result.status).text} drop-shadow-2xl scale-125`}>
                    {getStatusConfig(scanState.result.status).label}
                  </h1>
                </div>
              )}
              <div className={`p-8 pb-10 rounded-b-[3.5rem] shadow-2xl relative overflow-hidden ${getStatusConfig(scanState.result.status).bg}`}>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <SafeDrinkLogo className="h-32" hideText isDarkMode />
                </div>

                {scanState.result.status === SafetyStatus.SAFE && <SuccessConfetti />}

                <div className="relative flex flex-col items-center text-center gap-6">
                  <div className={`p-5 rounded-3xl bg-black/20 border-2 ${getStatusConfig(scanState.result.status).border} shadow-2xl backdrop-blur-md ${scanState.result.status === SafetyStatus.SAFE ? 'success-glow-pulse' : ''}`}>
                    {getStatusConfig(scanState.result.status).icon}
                  </div>

                  <div className="space-y-1">
                    <h2 className={`text-5xl font-black tracking-tighter ${getStatusConfig(scanState.result.status).text} italic uppercase`}>
                      {getStatusConfig(scanState.result.status).label}
                    </h2>
                    <p className="text-white/60 text-sm font-bold tracking-tight uppercase">{getStatusConfig(scanState.result.status).description}</p>
                  </div>
                </div>
              </div>

              {/* Corrected Layout: Standard margin instead of negative to prevent box clipping */}
              <div className="px-6 mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`relative group overflow-hidden rounded-[2.5rem] p-6 border-2 transition-all shadow-[0_12px_40px_rgba(0,0,0,0.5)] ${isDarkMode ? 'bg-[#111] border-white/10' : 'bg-white border-black/5'}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#4FC3F7]/20 to-transparent opacity-50" />
                    <div className="relative z-10 flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 bg-[#4FC3F7]/10 rounded-2xl flex items-center justify-center text-[#4FC3F7]">
                        <GlassWater className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${isDarkMode ? 'text-white/30' : 'text-black/40'}`}>{t('drinkBase')}</span>
                        <p className={`text-xl font-black tracking-tighter leading-tight break-words ${isDarkMode ? 'text-white' : 'text-black'}`}>{scanState.result.drinkType}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`relative group overflow-hidden rounded-[2.5rem] p-6 border-2 transition-all shadow-[0_12px_40px_rgba(0,0,0,0.5)] ${isDarkMode ? 'bg-[#111] border-white/10' : 'bg-white border-black/5'}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#66CC33]/20 to-transparent opacity-50" />
                    <div className="relative z-10 flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 bg-[#66CC33]/10 rounded-2xl flex items-center justify-center text-[#66CC33]">
                        <ShieldHalf className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${isDarkMode ? 'text-white/30' : 'text-black/40'}`}>{t('aiAccuracy')}</span>
                        <div className="flex items-baseline justify-center gap-1">
                          <p className={`text-2xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>{Math.round(scanState.result.confidence * 100)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 space-y-6 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-[#4FC3F7]/10 text-[#4FC3F7] shadow-inner"><Search className="w-5 h-5" /></div>
                      <h4 className="text-sm font-black tracking-[0.1em] text-white/90 uppercase">{t('forensicEvidence')}</h4>
                    </div>
                  </div>

                  {scanState.result.detectedRedFlags.length > 0 && (
                    <div className="space-y-3">
                      {scanState.result.detectedRedFlags.map((flag, i) => (
                        <div key={`flag-${i}`} className="relative overflow-hidden p-5 rounded-3xl bg-rose-500/10 border-2 border-rose-500/40 shadow-xl animate-in fade-in slide-in-from-top duration-500">
                          <div className="absolute top-0 right-0 p-4 opacity-10"><Skull className="w-12 h-12 text-rose-500" /></div>
                          <div className="flex items-start gap-4 relative z-10">
                            <div className="mt-1 p-2 bg-rose-500/20 rounded-xl text-rose-500"><AlertOctagon className="w-6 h-6" /></div>
                            <div>
                              <span className="text-[10px] font-black text-rose-500/80 uppercase tracking-[0.2em] mb-1 block">Critical Detection</span>
                              <p className="text-lg font-black text-white leading-tight uppercase italic">{flag}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-4">
                    {scanState.result.observations.map((obs, i) => {
                      const isSymptomLink = obs.toUpperCase().includes("SYMPTOM ANALYSIS") || obs.toUpperCase().includes("SYMPTOM CORRELATION");
                      return (
                        <div key={`obs-${i}`} className={`flex gap-5 p-5 rounded-[2rem] border transition-all group ${isSymptomLink ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-black/40 border-white/5 hover:border-white/20'}`}>
                          <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 transition-all ${isSymptomLink ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-pulse' : 'bg-[#66CC33]/50 group-hover:bg-[#66CC33] shadow-[0_0_8px_rgba(102,204,51,0.5)]'}`} />
                          <div className="flex-1">
                            {isSymptomLink && <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-1 block">Symptom Link Identified</span>}
                            <p className={`text-sm font-medium leading-relaxed transition-colors ${isSymptomLink ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>{obs}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500"><ShieldIcon className="w-5 h-5" /></div>
                    <h4 className="text-sm font-black tracking-[0.1em] text-white/90 uppercase">{t('safetyProtocol')}</h4>
                  </div>
                  <div className="relative p-6 bg-black/40 border border-white/5 rounded-[2rem]">
                    <p className="text-sm font-semibold text-white/80 leading-relaxed italic">
                      "{scanState.result.recommendation}"
                    </p>
                  </div>
                </div>

                {(scanState.result.status === SafetyStatus.DANGER || scanState.result.status === SafetyStatus.CRITICAL) && (
                  <div className="bg-rose-600/20 border-2 border-rose-500/50 rounded-[3rem] p-8 animate-pulse shadow-2xl">
                    <div className="flex items-center gap-4 text-rose-500 font-black text-sm uppercase tracking-widest mb-5">
                      <AlertOctagon className="w-6 h-6" /> {t('urgentCountermeasures')}
                    </div>
                    <p className="text-lg font-black text-white leading-tight mb-8">{scanState.result.emergencyAction}</p>
                    <button className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-3xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                      <Navigation className="w-5 h-5" /> {t('findClinic')}
                    </button>
                  </div>
                )}
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#080a0c] via-[#080a0c]/95 to-transparent z-40">
                <button
                  onClick={resetScan}
                  className="w-full py-6 bg-white text-black font-black rounded-[2.5rem] flex items-center justify-center gap-4 active:scale-95 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.15)] hover:bg-slate-100"
                >
                  <RefreshCw className="w-6 h-6" /> {t('startNewScan')}
                </button>
              </div>
            </div>
          )}

          {scanState.error && (
            <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center p-10 text-center animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-8">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4 tracking-tight">{t('systemFault')}</h3>
              <p className="text-white/60 text-sm mb-12 leading-relaxed max-w-xs">{scanState.error}</p>
              <button onClick={resetScan} className="w-full max-w-xs py-5 bg-white/10 rounded-2xl font-black text-sm active:scale-95 transition-all border border-white/10 uppercase tracking-widest">{t('retryConnection')}</button>
            </div>
          )}
        </div>
      </main>

      {!scanState.result && !scanState.isScanning && !scanState.error && !isGuiding && (
        <footer className="absolute bottom-0 left-0 right-0 p-10 pb-16 flex flex-col items-center z-40">
          <div className="relative group">
            <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full group-active:scale-150 transition-all duration-500" />
            <button
              onClick={handleScan}
              className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all border-[6px] border-[#080a0c] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#00A3E0] to-[#66CC33] opacity-0 group-hover:opacity-10 transition-opacity" />
              <Camera className="w-10 h-10 text-black" />
            </button>
            <div className="absolute -top-4 -right-2 bg-[#66CC33] text-[9px] font-black text-black px-2 py-0.5 rounded-full uppercase tracking-tighter">{t('aiReady')}</div>
          </div>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{t('captureForensicData')}</p>
        </footer>
      )}

      {showSymptoms && (
        <div className={`fixed inset-0 z-[60] ${isDarkMode ? 'bg-black/98' : 'bg-slate-950/98'} p-8 flex flex-col backdrop-blur-3xl animate-in slide-in-from-right duration-300`}>
          <div className="flex items-center justify-between mb-10">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-[#4FC3F7] uppercase tracking-tight">{t('symptomMatrix')}</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('enhanceAccuracy')}</p>
            </div>
            <button onClick={() => { triggerHaptic('tap'); setShowSymptoms(false); }} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"><X className="w-6 h-6" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 overflow-y-auto mb-10 pr-2 custom-scrollbar">
            {SYMPTOMS.map((symp) => (
              <button
                key={symp.id}
                onClick={() => toggleSymptom(symp.id)}
                className={`p-5 rounded-3xl text-left border-2 transition-all flex items-center justify-between gap-4 ${selectedSymptoms.includes(symp.id)
                  ? 'bg-[#4FC3F7]/20 border-[#4FC3F7] text-white shadow-[0_0_20px_rgba(79,195,247,0.2)]'
                  : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'
                  }`}
              >
                <div className="flex flex-col gap-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${symp.severity === 'high' ? 'text-rose-500' : 'text-[#66CC33]'}`}>{symp.severity === 'high' ? t('highSeverity') : t('standardLog')}</span>
                  <span className="text-sm font-bold leading-tight">{symp.label}</span>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedSymptoms.includes(symp.id) ? 'bg-[#4FC3F7] border-[#4FC3F7]' : 'border-white/10'}`}>
                  {selectedSymptoms.includes(symp.id) && <CheckCircle2 className="w-4 h-4 text-black" />}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => { triggerHaptic('tap'); setShowSymptoms(false); }}
            className="mt-auto w-full py-6 bg-gradient-to-r from-[#00A3E0] to-[#66CC33] text-white font-black rounded-[2rem] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-sm"
          >
            {t('confirmReturn')}
          </button>
        </div>
      )}


      <canvas ref={canvasRef} className="hidden" />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
