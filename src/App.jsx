import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, setDoc, updateDoc, onSnapshot, collection, addDoc, serverTimestamp, deleteDoc
} from 'firebase/firestore';
import {
  Plus, Trash2, Loader2, Image as ImageIcon,
  CheckCircle2, Trophy, Users, Play, XCircle, User as UserIcon, Lock, Sparkles
} from 'lucide-react';

// --- CONFIG ---
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const firebaseConfig = (typeof __firebase_config !== 'undefined')
  ? JSON.parse(__firebase_config)
  : envConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
const appId = typeof __app_id !== 'undefined' ? __app_id : 'mohoot-prod';

// --- COSMOS THEME ---
const THEME = {
  bg: 'bg-[#020617]',
  glassCard: 'bg-[#0F172A]/60 backdrop-blur-xl border border-white/10 shadow-2xl',
  primaryGradient: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-500/20',
  textGradient: 'text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400',
  input: 'bg-[#020617] border border-white/10 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all',
  danger: 'text-rose-400 hover:bg-rose-500/10',
};

const SHAPES = [
  { id: 0, color: 'bg-rose-600' },
  { id: 1, color: 'bg-blue-600' },
  { id: 2, color: 'bg-amber-500' },
  { id: 3, color: 'bg-emerald-600' },
];

const CARD_THEMES = [
  { bg: 'bg-slate-900', border: 'border-violet-500/30', glow: 'shadow-violet-900/20' },
  { bg: 'bg-slate-900', border: 'border-fuchsia-500/30', glow: 'shadow-fuchsia-900/20' },
  { bg: 'bg-slate-900', border: 'border-cyan-500/30', glow: 'shadow-cyan-900/20' },
];

// --- COMPONENTS ---

// Simple Confetti Component
const Confetti = () => {
  const particles = Array.from({ length: 50 }).map((_, i) => ({
    left: Math.random() * 100 + '%',
    animationDelay: Math.random() * 5 + 's',
    backgroundColor: ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)]
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute top-0 w-3 h-3 rounded-full animate-[fall_5s_linear_infinite]"
          style={{
            left: p.left,
            animationDelay: p.animationDelay,
            backgroundColor: p.backgroundColor,
            opacity: 0.7
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export const QuizCard = ({ quiz, index, onHost, onEdit }) => {
  const style = CARD_THEMES[index % CARD_THEMES.length];
  return (
    <div
      onDoubleClick={() => onEdit(quiz)}
      className={`${style.bg} border ${style.border} ${style.glow} h-64 rounded-3xl p-6 relative flex flex-col items-center justify-between shadow-lg cursor-pointer hover:scale-[1.02] transition-all select-none group`}
    >
      <div className={`absolute top-4 left-4 bg-white/5 border border-white/10 backdrop-blur-md font-bold px-3 py-1 rounded-full text-[10px] text-slate-300 uppercase tracking-widest`}>
        {quiz.questions?.length || 0} Qs
      </div>
      <div className="flex-1 flex items-center justify-center w-full text-center mt-4 px-2">
        <h3 className="font-bold text-2xl text-white leading-tight break-words line-clamp-3 group-hover:text-violet-200 transition-colors">
          {quiz.title || "Untitled"}
        </h3>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onHost(quiz); }}
        className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all ${THEME.primaryGradient}`}
      >
        <Play size={18} fill="currentColor" /> HOST LIVE
      </button>
    </div>
  );
};

export const DashboardHeader = ({ user, onSignOut }) => (
  <nav className="bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-8 py-5 flex justify-between items-center sticky top-0 z-20">
    <div className="font-black text-2xl tracking-tighter">
      <span className="text-white">Mo</span><span className={THEME.textGradient}>hoot</span><span className="text-violet-500">.</span>
    </div>
    <div className="flex items-center gap-4">
      <button onClick={onSignOut} className="relative group rounded-full transition-all focus:outline-none" title="Sign Out">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
        <div className="relative rounded-full ring-2 ring-white/10 group-hover:ring-transparent bg-[#020617] p-0.5 transition-all">
          {user?.photoURL ? <img src={user.photoURL} className="w-9 h-9 rounded-full object-cover" alt="Profile" /> : <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-violet-400"><UserIcon size={18} /></div>}
        </div>
      </button>
    </div>
  </nav>
);

export const HostHeader = ({ onClose }) => (
  <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 pointer-events-none">
    <div className="font-black text-xl tracking-tighter text-white/20 pointer-events-auto select-none">M<span className="text-white/10">ohoot</span></div>
    <div className="pointer-events-auto group relative">
      <button onClick={onClose} className="bg-black/40 backdrop-blur border border-white/10 p-3 rounded-full text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50 transition-all">
        <XCircle size={24} />
      </button>
    </div>
  </div>
);

// --- GAME VIEWS ---

export const LobbyView = ({ pin, players, onStart, onClose }) => (
  <div className={`min-h-screen ${THEME.bg} flex flex-col items-center justify-center relative overflow-hidden`}>
    <HostHeader onClose={onClose} />
    <div className="absolute top-0 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px]"></div>
    <div className="absolute bottom-0 -right-40 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[128px]"></div>
    <div className={`${THEME.glassCard} p-12 rounded-[2.5rem] flex flex-col items-center text-center relative z-10 mb-10 animate-in fade-in zoom-in duration-500`}>
      <div className="text-xs font-bold text-violet-400 uppercase tracking-[0.4em] mb-6">Join at mohoot.sbs</div>
      <div className="text-[7rem] md:text-[9rem] font-black leading-none text-white tabular-nums tracking-tighter drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]">{pin}</div>
      <div className="mt-8 flex items-center gap-3 text-slate-400 font-bold bg-white/5 px-6 py-2 rounded-full border border-white/5">
        <Users size={18} /> {players.length} Players Ready
      </div>
    </div>
    <div className="flex flex-wrap gap-3 justify-center max-w-5xl mb-24 relative z-10 px-4">
      {players.map((p, i) => (
        <div key={i} className="bg-[#1e293b]/80 border border-violet-500/20 px-5 py-2.5 rounded-xl shadow-lg font-bold text-base text-violet-200 animate-in zoom-in duration-300">
          {p.nickname}
        </div>
      ))}
    </div>
    <div className="fixed bottom-10 z-20">
      <button disabled={players.length === 0} onClick={onStart} className={`px-16 py-5 rounded-2xl font-black text-xl tracking-wide shadow-2xl transition-all ${players.length > 0 ? THEME.primaryGradient + ' hover:scale-105 hover:shadow-violet-500/40' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
        START GAME
      </button>
    </div>
  </div>
);

export const QuestionView = ({ snap, players, timeLeft, onSkip, onClose }) => {
  const currentQ = snap.quizSnapshot.questions[snap.currentQuestionIndex];
  const [imgError, setImgError] = useState(false);

  // FIX: Separate lock for finishing to prevent race conditions
  const [isFinishing, setIsFinishing] = useState(false);

  // LOGIC: Snackbar State
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const prevCountRef = useRef(0);
  const prevAnsweredIdsRef = useRef(new Set());
  
  // FIX: Count answers only for the current round
  const currentAnsweredPlayers = players.filter(p => p.lastAnsweredRoundId === snap.roundId);
  const answerCount = currentAnsweredPlayers.length;

  // EFFECT: Handle Image Error reset
  useEffect(() => setImgError(false), [currentQ]);

  // EFFECT: Detect new answers for Snackbar
  useEffect(() => {
    // Only show if count increased and we aren't at 0
    if (answerCount > prevCountRef.current && answerCount > 0) {
      const newAnswerer = currentAnsweredPlayers.find(p => !prevAnsweredIdsRef.current.has(p.uid || p.nickname)); // Fallback to nickname if uid missing in some contexts
      
      if (newAnswerer) {
        setSnackbarMsg(`${newAnswerer.nickname} answered!`);
        setShowSnackbar(true);
        const timer = setTimeout(() => setShowSnackbar(false), 3000); // Hide after 3s
        return () => clearTimeout(timer);
      }
    }
    
    // Update refs
    prevCountRef.current = answerCount;
    prevAnsweredIdsRef.current = new Set(currentAnsweredPlayers.map(p => p.uid || p.nickname));
  }, [answerCount, currentAnsweredPlayers]);

  // EFFECT: Auto-Advance Logic (FIXED - Separated State & Action)
  useEffect(() => {
    if (players.length > 0 && answerCount === players.length && !isFinishing) {
      setIsFinishing(true); // Lock it
    }
  }, [answerCount, players.length, isFinishing]);

  useEffect(() => {
    if (isFinishing) {
      const t = setTimeout(() => {
        // Force end time to now, which triggers the main loop to move to LEADERBOARD
        updateDoc(doc(db, 'artifacts', appId, 'sessions', snap.pin), { endTime: Date.now() });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isFinishing, snap.pin]);

  return (
    <div className={`min-h-screen ${THEME.bg} relative flex flex-col`}>
      <HostHeader onClose={onClose} />
      <div className="flex-1 flex flex-col items-center pt-20 px-6 animate-in fade-in">

        <div className="w-full flex justify-between items-center max-w-6xl mb-8">
          {/* FIX: Reduced Opacity for Q Indicator */}
          <div className="text-white/30 font-black text-2xl tracking-widest drop-shadow-sm">Q{snap.currentQuestionIndex + 1}</div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl opacity-50 blur group-hover:opacity-75 transition duration-1000"></div>
            <div className="relative text-5xl font-black text-white bg-[#020617] px-8 py-3 rounded-xl border border-white/10">
              {timeLeft}
            </div>
          </div>

          {/* REPLACED: No number counter on right, empty div for spacing balance */}
          <div className="w-10"></div>
        </div>

        <div className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center text-center pb-20">

          {currentQ.image && !imgError && (
            <div className="relative mb-8 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl opacity-20 blur"></div>
              <img
                src={currentQ.image}
                onError={() => setImgError(true)}
                className="relative max-h-[35vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/10 bg-black/40"
              />
            </div>
          )}

          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-12 drop-shadow-lg max-w-4xl">
            {currentQ.text}
          </h2>

          <div className="grid grid-cols-2 gap-4 w-full">
            {currentQ.answers.map((a, i) => (
              <div key={i} className={`${SHAPES[i].color} p-8 rounded-2xl text-white text-2xl font-black flex items-center justify-center shadow-lg border-2 border-white/10 transform transition-transform`}>
                {a}
              </div>
            ))}
          </div>
        </div>

        {/* NEW: Premium Snackbar */}
        {showSnackbar && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-violet-500/30 text-white pl-6 pr-6 py-3 rounded-full shadow-[0_0_30px_rgba(124,58,237,0.3)] flex items-center gap-3">
              <span className="font-bold text-sm tracking-wide">{snackbarMsg}</span>
            </div>
          </div>
        )}

        {/* Skip button moved slightly to avoid snackbar overlap */}
        <div className="fixed bottom-6 right-6">
          <button onClick={onSkip} className="text-slate-500 hover:text-white px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors">Skip &raquo;</button>
        </div>
      </div>
    </div>
  );
};

export const LeaderboardView = ({ snap, sortedPlayers, onNext, onClose }) => {
  const questionsLeft = snap.quizSnapshot.questions.length - (snap.currentQuestionIndex + 1);
  const isFinalStretch = questionsLeft < 3 && questionsLeft >= 0;

  const [timer, setTimer] = useState(5);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (timer > 0 && !paused) {
      const t = setTimeout(() => setTimer(t => t - 1), 1000);
      return () => clearTimeout(t);
    } else if (timer === 0 && !paused) {
      onNext();
    }
  }, [timer, paused]);

  return (
    <div className={`min-h-screen ${THEME.bg} pt-20 px-6 relative`}>
      <HostHeader onClose={onClose} />
      <div className="max-w-3xl mx-auto pt-10 animate-in slide-in-from-bottom-8">
        <div className="text-center mb-12">
          <Trophy size={56} className="mx-auto text-yellow-500 mb-6 drop-shadow-[0_0_25px_rgba(234,179,8,0.4)]" />
          <h2 className="text-5xl font-black text-white tracking-tight">Leaderboard</h2>
        </div>

        {isFinalStretch && (
          <div className="bg-violet-900/20 border border-violet-500/50 p-4 rounded-xl mb-6 text-center text-violet-300 font-bold uppercase tracking-widest animate-pulse">
            <Lock size={16} className="inline mr-2 mb-1" /> The Podium is Hidden...
          </div>
        )}

        <div className="space-y-3 mb-20">
          {sortedPlayers.slice(0, 5).map((p, i) => {
            if (isFinalStretch && i < 3) {
              return (
                <div key={i} className="p-4 rounded-xl flex justify-between items-center bg-[#020617] border border-white/5 opacity-50">
                  <div className="flex items-center gap-6">
                    <span className="font-black text-xl w-10 text-center text-slate-700">?</span>
                    <span className="font-bold text-xl text-slate-700">----------------</span>
                  </div>
                </div>
              )
            }

            return (
              <div key={i} className={`p-4 rounded-xl flex justify-between items-center border transition-all ${i === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30' : 'bg-slate-900/50 border-white/5'}`}>
                <div className="flex items-center gap-6">
                  <span className={`font-black text-xl w-10 text-center ${i === 0 ? 'text-yellow-400' : 'text-slate-600'}`}>
                    {i === 0 ? <Trophy size={20} className="mx-auto" /> : i + 1}
                  </span>
                  <span className="font-bold text-xl text-white">{p.nickname}</span>
                </div>
                <span className={`font-mono font-black text-xl ${i === 0 ? 'text-yellow-400' : 'text-violet-400'}`}>{p.score}</span>
              </div>
            )
          })}
        </div>

        <div className="fixed bottom-10 inset-x-0 flex justify-center">
          <button
            onClick={() => paused ? onNext() : setPaused(true)}
            className={`group relative ${THEME.primaryGradient} pl-8 pr-10 py-4 rounded-2xl font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 overflow-hidden`}
          >
            <span className="relative z-10">
              {(!paused && timer > 0) ? `Auto Next (${timer}s)` : "Next Round"}
            </span>
            <Play size={18} fill="currentColor" className="relative z-10" />
            {(!paused && timer > 0) && (
              <div className="absolute bottom-0 left-0 h-1 bg-white/40 transition-all duration-1000 ease-linear w-full" style={{ width: `${(timer / 5) * 100}%` }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const FinishedView = ({ sortedPlayers, onClose }) => {
  const top3 = sortedPlayers.slice(0, 3);
  return (
    <div className={`min-h-screen ${THEME.bg} flex flex-col items-center justify-center pt-10 overflow-hidden relative`}>
      <HostHeader onClose={onClose} />
      <Confetti />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-slate-950 to-slate-950 pointer-events-none"></div>
      
      <div className="relative z-20 mb-8 text-center animate-in slide-in-from-top-10 duration-1000">
         <div className="text-yellow-400 font-black text-lg tracking-[0.5em] uppercase mb-2">The Champions</div>
         <h1 className="text-6xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">PODIUM</h1>
      </div>

      <div className="flex items-end justify-center gap-4 md:gap-8 w-full max-w-5xl px-4 mb-20 relative z-10">
        {top3[1] && (
          <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-20 duration-[1500ms]">
            <div className="text-xl font-black text-slate-400 mb-4">{top3[1].nickname}</div>
            <div className="w-full h-44 bg-slate-800 rounded-t-2xl flex items-end justify-center pb-4 border-t border-slate-600 relative shadow-2xl">
              <span className="text-5xl font-black text-white/10">2</span>
              <div className="absolute top-0 inset-x-0 h-1 bg-slate-500 shadow-[0_0_20px_rgba(100,116,139,0.5)]"></div>
            </div>
            <div className="mt-4 font-bold text-slate-500">{top3[1].score} pts</div>
          </div>
        )}
        {top3[0] && (
          <div className="flex flex-col items-center w-1/3 -mt-10 z-10 animate-in slide-in-from-bottom-32 duration-[2000ms]">
            <div className="relative">
              <Trophy size={80} className="text-yellow-400 mb-6 drop-shadow-[0_0_50px_rgba(250,204,21,0.6)] animate-bounce" fill="currentColor" />
              <div className="absolute -top-10 -right-10 bg-yellow-500 text-black font-black text-xs px-2 py-1 rounded rotate-12">MVP!</div>
            </div>
            <div className="text-4xl font-black text-white mb-4 tracking-tight drop-shadow-md">{top3[0].nickname}</div>
            <div className="w-full h-72 bg-gradient-to-b from-yellow-500 to-yellow-700 rounded-t-3xl flex items-end justify-center pb-6 border-t-4 border-yellow-300 shadow-[0_0_80px_rgba(234,179,8,0.4)] relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
              <span className="text-8xl font-black text-white drop-shadow-xl relative z-10">1</span>
            </div>
            <div className="mt-6 font-black text-3xl text-yellow-400 bg-yellow-900/10 px-8 py-3 rounded-2xl border border-yellow-500/20 backdrop-blur-md shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                {top3[0].score}
            </div>
          </div>
        )}
        {top3[2] && (
          <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-16 duration-[1200ms]">
            <div className="text-xl font-black text-amber-700 mb-4">{top3[2].nickname}</div>
            <div className="w-full h-36 bg-amber-900/20 rounded-t-2xl flex items-end justify-center pb-4 border-t border-amber-800 relative shadow-xl">
              <span className="text-5xl font-black text-white/10">3</span>
            </div>
            <div className="mt-4 font-bold text-slate-500">{top3[2].score} pts</div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN WRAPPER ---
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('DASHBOARD');
  const [quizzes, setQuizzes] = useState([]);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'quizzes'),
      (snap) => setQuizzes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  useEffect(() => {
    const saved = localStorage.getItem('mohoot_host_active');
    if (saved && user) {
      try {
        const { quizId, pin } = JSON.parse(saved);
        setActiveSession({ quizId, pin });
        setView('GAME');
      } catch (e) { }
    }
  }, [user]);

  const createQuiz = () => {
    setEditingQuiz({ title: "Untitled Quiz", questions: [{ text: "", image: "", answers: ["", "", "", ""], correct: 0, duration: 20 }] });
    setView('EDITOR');
  };

  const saveQuiz = async (q) => {
    const ref = collection(db, 'artifacts', appId, 'users', user.uid, 'quizzes');
    if (q.id) await updateDoc(doc(ref, q.id), { ...q });
    else await addDoc(ref, { ...q, createdAt: serverTimestamp() });
    setView('DASHBOARD');
  };

  const launchGame = async (quiz) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    await setDoc(doc(db, 'artifacts', appId, 'sessions', pin), {
      hostId: user.uid, quizId: quiz.id, status: 'LOBBY', currentQuestionIndex: 0,
      players: {}, quizSnapshot: quiz, lastUpdated: serverTimestamp()
    });
    setActiveSession({ quizId: quiz.id, pin });
    setView('GAME');
    localStorage.setItem('mohoot_host_active', JSON.stringify({ quizId: quiz.id, pin }));
  };

  if (loading) return <div className={`h-screen ${THEME.bg} flex items-center justify-center`}><Loader2 className="animate-spin text-violet-500" /></div>;

  if (!user) return (
    <div className={`min-h-screen ${THEME.bg} flex flex-col items-center justify-center p-4 relative overflow-hidden`}>
      <div className={`${THEME.glassCard} p-12 rounded-3xl text-center max-w-md w-full relative z-10`}>
        <h1 className={`text-5xl font-black mb-4 tracking-tighter ${THEME.textGradient}`}>Mohoot!</h1>
        <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className={`w-full ${THEME.primaryGradient} py-4 rounded-xl font-bold`}>Sign in with Google</button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${THEME.bg} text-white font-sans selection:bg-violet-500/30`}>
      {view === 'DASHBOARD' && (
        <>
          <DashboardHeader user={user} onSignOut={() => signOut(auth)} />
          <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-4xl font-black text-white tracking-tight">Library</h2>
              <button onClick={createQuiz} className={`${THEME.primaryGradient} px-6 py-3 rounded-xl font-bold flex gap-2 items-center`}>
                <Plus size={20} /> Create New
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quizzes.map((q, i) => <QuizCard key={q.id} quiz={q} index={i} onHost={launchGame} onEdit={(quiz) => { setEditingQuiz(quiz); setView('EDITOR'); }} />)}
            </div>
          </div>
        </>
      )}

      {view === 'EDITOR' && (
        <Editor user={user} quiz={editingQuiz} onSave={saveQuiz} onCancel={() => setView('DASHBOARD')} />
      )}

      {view === 'GAME' && (
        <GameSession user={user} sessionData={activeSession} onExit={() => { localStorage.removeItem('mohoot_host_active'); setActiveSession(null); setView('DASHBOARD'); }} />
      )}
    </div>
  );
}

// --- EDITOR WITH SIDEBAR FIX ---
const Editor = ({ user, quiz, onSave, onCancel }) => {
  const [q, setQ] = useState(quiz);
  const [idx, setIdx] = useState(0);
  const current = q.questions[idx];

  const update = (field, val) => {
    const qs = [...q.questions];
    qs[idx] = { ...current, [field]: val };
    setQ({ ...q, questions: qs });
  };
  
  // FIX: Better image handling
  const handleImagePaste = (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('Text');
    if (pastedData) {
        update('image', pastedData);
    }
  };

  const addQuestion = () => {
    setQ({ ...q, questions: [...q.questions, { text: "", image: "", answers: ["", "", "", ""], correct: 0, duration: 20 }] });
    setIdx(q.questions.length);
  };

  return (
    <div className="flex gap-6 h-screen p-6 bg-[#020617]">
      <div className="w-64 flex flex-col gap-2">
        <h2 className="text-slate-500 font-bold mb-4 px-2 uppercase text-xs tracking-widest">Outline</h2>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
          {q.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-full text-left p-4 rounded-r-xl border-l-4 transition-all font-bold text-sm ${i === idx ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              Question {i + 1}
            </button>
          ))}
          <button onClick={addQuestion} className="w-full py-4 border border-dashed border-slate-800 rounded-xl text-slate-600 font-bold text-sm hover:border-violet-500/50 hover:text-violet-400 transition-all flex items-center justify-center gap-2">
            <Plus size={16} /> Add New
          </button>
        </div>
      </div>

      <div className={`${THEME.glassCard} flex-1 rounded-3xl p-10 flex flex-col overflow-y-auto`}>
        <div className="mb-8 border-b border-white/5 pb-8">
          <input className="w-full text-4xl font-black bg-transparent border-none focus:ring-0 outline-none text-white placeholder-slate-700" value={q.title} onChange={e => setQ({ ...q, title: e.target.value })} placeholder="Enter Quiz Title..." />
        </div>
        <div className="flex-1 space-y-8">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">Question Text</label>
            <textarea className={`${THEME.input} w-full p-6 rounded-2xl text-xl font-bold resize-none`} rows="2" value={current.text} onChange={e => update('text', e.target.value)} placeholder="What is the meaning of..." />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase block tracking-wider">Settings</label>
              <div className={`${THEME.input} flex flex-col gap-3 p-4 rounded-xl`}>
                <div className="flex items-center gap-3">
                    <ImageIcon size={20} className="text-violet-400" />
                    <input 
                        className="bg-transparent w-full outline-none text-sm text-white placeholder-slate-600" 
                        value={current.image || ''} 
                        onChange={e => update('image', e.target.value)} 
                        onPaste={handleImagePaste}
                        placeholder="Paste Image Link Here" 
                    />
                </div>
                {/* Image Preview for Verification */}
                {current.image && (
                    <div className="relative mt-2 w-full h-32 bg-black/20 rounded-lg overflow-hidden border border-white/5 group">
                        <img src={current.image} className="w-full h-full object-contain" onError={(e) => { e.target.style.display='none'; }} />
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-rose-400 font-bold bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity">
                           Preview
                        </div>
                    </div>
                )}
              </div>
              <div className={`${THEME.input} p-4 rounded-xl`}>
                <span className="text-xs font-bold text-slate-500 block mb-1">Duration (Seconds)</span>
                <input type="number" className="bg-transparent w-full font-black text-xl outline-none text-white" value={current.duration} onChange={e => update('duration', parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase block tracking-wider">Answer Options</label>
              <div className="grid gap-3">
                {current.answers.map((ans, i) => (
                  <div key={i} className={`flex items-center gap-3 p-1.5 rounded-xl border transition-all ${current.correct === i ? 'bg-violet-500/10 border-violet-500/50' : 'bg-[#020617] border-white/5'}`}>
                    <button onClick={() => update('correct', i)} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${current.correct === i ? SHAPES[i].color : 'bg-slate-800 text-slate-600 hover:text-slate-400'}`}>
                      <CheckCircle2 size={20} className={current.correct === i ? "text-white" : "text-current"} />
                    </button>
                    <input className="bg-transparent flex-1 font-bold text-sm py-2 outline-none text-white placeholder-slate-700" value={ans} onChange={e => { const newAns = [...current.answers]; newAns[i] = e.target.value; update('answers', newAns); }} placeholder={`Option ${i + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-between items-center pt-6 border-t border-white/5">
          {q.id && (<button onClick={async () => { if (confirm("Delete?")) { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'quizzes', q.id)); onCancel(); } }} className={THEME.danger + " font-bold px-4 py-2 rounded-lg transition flex items-center gap-2"}><Trash2 size={18} /> Delete</button>)}
          <div className="flex gap-4 ml-auto">
            <button onClick={onCancel} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-white transition">Discard</button>
            <button onClick={() => onSave(q)} className={`${THEME.primaryGradient} px-8 py-3 rounded-xl font-bold`}>Save Quiz</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GameSession = ({ user, sessionData, onExit }) => {
  const [snap, setSnap] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const pin = sessionData.pin;

  useEffect(() => {
    return onSnapshot(doc(db, 'artifacts', 'mohoot-prod', 'sessions', pin), s => s.exists() ? setSnap({ ...s.data(), pin }) : onExit());
  }, [pin]);

  useEffect(() => {
    if (snap?.status === 'QUESTION') {
      const timer = setInterval(() => {
        const remaining = Math.ceil((snap.endTime - Date.now()) / 1000);
        setTimeLeft(Math.max(0, remaining));
        if (remaining <= 0) {
          updateDoc(doc(db, 'artifacts', 'mohoot-prod', 'sessions', pin), { status: 'LEADERBOARD', lastUpdated: serverTimestamp() });
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, [snap?.status, snap?.endTime]);

  const next = () => {
    const nIdx = snap.currentQuestionIndex + 1;
    const q = snap.quizSnapshot.questions[nIdx];
    const payload = q
      ? { status: 'QUESTION', currentQuestionIndex: nIdx, roundId: Date.now(), startTime: Date.now() + 2000, endTime: Date.now() + 2000 + (q.duration * 1000) }
      : { status: 'FINISHED' };
    updateDoc(doc(db, 'artifacts', 'mohoot-prod', 'sessions', pin), { ...payload, lastUpdated: serverTimestamp() });
  };

  if (!snap) return <div className={`h-screen flex items-center justify-center ${THEME.bg}`}><Loader2 className="animate-spin text-violet-500" /></div>;

  const players = Object.values(snap.players || {});
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  if (snap.status === 'LOBBY') return <LobbyView pin={pin} players={players} onStart={() => next()} onClose={() => deleteDoc(doc(db, 'artifacts', 'mohoot-prod', 'sessions', pin))} />;
  if (snap.status === 'QUESTION') return <QuestionView snap={snap} players={players} timeLeft={timeLeft} onSkip={() => updateDoc(doc(db, 'artifacts', 'mohoot-prod', 'sessions', pin), { status: 'LEADERBOARD', lastUpdated: serverTimestamp() })} onClose={() => onExit()} />;
  if (snap.status === 'LEADERBOARD') return <LeaderboardView snap={snap} sortedPlayers={sortedPlayers} onNext={next} onClose={() => onExit()} />;
  if (snap.status === 'FINISHED') return <FinishedView sortedPlayers={sortedPlayers} onClose={() => onExit()} />;
  return null;
};