import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import {
  Plus, Trash2, LogOut, Loader2, Image as ImageIcon,
  CheckCircle2, Trophy, Users, Play, XCircle
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
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

// --- CONSTANTS ---
const SHAPES = [
  { id: 0, color: 'bg-[#EA4335]', label: 'Triangle' },
  { id: 1, color: 'bg-[#4285F4]', label: 'Diamond' },
  { id: 2, color: 'bg-[#FBBC04]', label: 'Circle' },
  { id: 3, color: 'bg-[#34A853]', label: 'Square' },
];

const CARD_THEMES = [
  { bg: 'bg-rose-500', shadow: 'shadow-rose-900/20', badge: 'bg-rose-700/20 text-white', text: 'text-white' },
  { bg: 'bg-orange-400', shadow: 'shadow-orange-900/20', badge: 'bg-orange-700/20 text-white', text: 'text-white' },
  { bg: 'bg-emerald-500', shadow: 'shadow-emerald-900/20', badge: 'bg-emerald-700/20 text-white', text: 'text-white' },
  { bg: 'bg-blue-500', shadow: 'shadow-blue-900/20', badge: 'bg-blue-700/20 text-white', text: 'text-white' },
  { bg: 'bg-yellow-400', shadow: 'shadow-yellow-900/20', badge: 'bg-yellow-600/20 text-slate-900', text: 'text-slate-900' },
];

// --- SUB-COMPONENTS (Fixes White Screen) ---

const QuizCard = ({ quiz, index, onHost, onEdit }) => {
  const theme = CARD_THEMES[index % CARD_THEMES.length];
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 2000);
  };

  return (
    <div
      onDoubleClick={() => onEdit(quiz)}
      onClick={handleClick}
      className={`${theme.bg} ${theme.shadow} h-64 rounded-3xl p-6 relative flex flex-col items-center justify-between shadow-xl cursor-pointer hover:scale-[1.02] transition-transform select-none group`}
    >
      {/* Badge (Top Left) */}
      <div className={`absolute top-4 left-4 ${theme.badge} backdrop-blur-md font-black px-3 py-1 rounded-xl text-xs uppercase tracking-wider`}>
        {quiz.questions?.length || 0} Qs
      </div>

      {/* Title (Center) */}
      <div className="flex-1 flex items-center justify-center w-full text-center mt-4 px-2">
        <h3 className={`font-black text-3xl leading-none drop-shadow-md break-words line-clamp-3 ${theme.text}`}>
          {quiz.title || "Untitled"}
        </h3>
      </div>

      {/* Play Button (Bottom Center) */}
      <button
        onClick={(e) => { e.stopPropagation(); onHost(quiz); }}
        className="bg-white text-slate-900 w-full py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all"
      >
        <Play size={24} fill="currentColor" /> HOST
      </button>

      {/* Hint Overlay */}
      {clicked && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-3xl flex items-center justify-center animate-in fade-in duration-200 z-10">
          <span className="text-white font-bold text-sm">Double-click to Edit</span>
        </div>
      )}
    </div>
  );
};

const DashboardHeader = ({ user, onSignOut }) => (
  <nav className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-8 py-4 flex justify-between items-center sticky top-0 z-20">
    <div className="font-black text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
      Mohoot<span className="text-white">!</span>
    </div>
    <div className="flex items-center gap-4">
      <span className="text-xs font-mono bg-slate-800 px-3 py-1 rounded text-slate-400 border border-white/5">
        {user?.uid.slice(0, 6)}...
      </span>
      <button onClick={onSignOut} className="p-2 text-slate-500 hover:text-rose-400 transition" title="Sign Out">
        <LogOut size={20} />
      </button>
    </div>
  </nav>
);

const HostHeader = ({ onClose }) => (
  <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 pointer-events-none">
    <div className="font-black text-2xl tracking-tighter text-white/10 pointer-events-auto select-none">
      Mohoot<span className="text-white/20">!</span>
    </div>
    <div className="pointer-events-auto group relative">
      <button onClick={onClose} className="bg-slate-800/80 backdrop-blur border border-slate-700 p-3 rounded-full text-slate-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 shadow-xl transition-all">
        <XCircle size={24} />
      </button>
    </div>
  </div>
);

// --- MAIN COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('DASHBOARD');
  const [quizzes, setQuizzes] = useState([]);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Quizzes
  useEffect(() => {
    if (!user) return;
    const qRef = collection(db, 'artifacts', appId, 'users', user.uid, 'quizzes');
    const unsubscribe = onSnapshot(qRef, (snap) => {
      setQuizzes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // Restore Active Session
  useEffect(() => {
    const saved = localStorage.getItem('mohoot_host_active');
    if (saved && user) {
      try {
        const { quizId, pin } = JSON.parse(saved);
        setActiveSession({ quizId, pin });
        setView('GAME');
      } catch (e) {
        localStorage.removeItem('mohoot_host_active');
      }
    }
  }, [user]);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (error) { alert("Login failed: " + error.message); }
  };

  const createQuiz = () => {
    setEditingQuiz({
      title: "Untitled Quiz",
      questions: [{ text: "", image: "", answers: ["", "", "", ""], correct: 0, duration: 20 }]
    });
    setView('EDITOR');
  };

  const saveQuiz = async (q) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const ref = collection(db, 'artifacts', appId, 'users', user.uid, 'quizzes');
      if (q.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'quizzes', q.id), { ...q });
      } else {
        await addDoc(ref, { ...q, createdAt: serverTimestamp() });
      }
      setView('DASHBOARD');
    } catch (error) {
      alert("Error saving: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const launchGame = async (quiz) => {
    if (!user) return;
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await setDoc(doc(db, 'artifacts', appId, 'sessions', pin), {
        hostId: user.uid,
        quizId: quiz.id,
        status: 'LOBBY',
        currentQuestionIndex: 0,
        players: {},
        quizSnapshot: quiz,
        lastUpdated: serverTimestamp()
      });
      setActiveSession({ quizId: quiz.id, pin });
      setView('GAME');
      localStorage.setItem('mohoot_host_active', JSON.stringify({ quizId: quiz.id, pin }));
    } catch (error) {
      alert("Failed to start game: " + error.message);
    }
  };

  if (loading) return <div className="h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-10 rounded-3xl shadow-2xl text-center max-w-md w-full">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2 tracking-tighter">Mohoot!</h1>
        <button onClick={handleLogin} className="w-full mt-8 bg-white text-slate-900 font-bold py-4 rounded-2xl hover:bg-slate-100 transition-all">
          Sign in with Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-indigo-500/30">

      {view === 'DASHBOARD' && (
        <>
          <DashboardHeader user={user} onSignOut={() => signOut(auth)} />
          <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-4xl font-black text-white tracking-tight">My Quizzes</h2>
              <button onClick={createQuiz} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold flex gap-2 items-center hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition transform hover:-translate-y-1">
                <Plus size={20} /> Create New
              </button>
            </div>

            {quizzes.length === 0 ? (
              <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-3xl p-20 text-center text-slate-500">
                <Play size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No quizzes found. Click "Create New" to start!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {quizzes.map((q, index) => (
                  <QuizCard
                    key={q.id}
                    quiz={q}
                    index={index}
                    onHost={launchGame}
                    onEdit={(quiz) => { setEditingQuiz(quiz); setView('EDITOR'); }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {view === 'EDITOR' && (
        <Editor
          user={user}
          quiz={editingQuiz}
          onSave={saveQuiz}
          onCancel={() => setView('DASHBOARD')}
          isSaving={isSaving}
        />
      )}

      {view === 'GAME' && (
        <GameSession
          user={user}
          sessionData={activeSession}
          onExit={() => {
            localStorage.removeItem('mohoot_host_active');
            setActiveSession(null);
            setView('DASHBOARD');
          }}
        />
      )}
    </div>
  );
}

// --- EDITOR COMPONENT ---
const Editor = ({ user, quiz, onSave, onCancel, isSaving }) => {
  const [q, setQ] = useState(quiz);
  const [idx, setIdx] = useState(0);
  const current = q.questions[idx];

  const update = (field, val) => {
    const qs = [...q.questions];
    qs[idx] = { ...current, [field]: val };
    setQ({ ...q, questions: qs });
  };

  const addQuestion = () => {
    const newQs = [...q.questions, { text: "", image: "", answers: ["", "", "", ""], correct: 0, duration: 20 }];
    setQ({ ...q, questions: newQs });
    setIdx(newQs.length - 1);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this quiz completely?")) {
      try {
        if (q.id) {
          const appId = 'mohoot-prod';
          await deleteDoc(doc(getFirestore(), 'artifacts', appId, 'users', user.uid, 'quizzes', q.id));
        }
        onCancel();
      } catch (e) { alert(e.message); }
    }
  };

  return (
    <div className="flex gap-6 h-screen p-6 bg-slate-900 animate-in slide-in-from-right-4 duration-300">
      <div className="w-64 flex flex-col gap-2">
        <h2 className="text-slate-400 font-bold mb-4 px-2">Questions</h2>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
          {q.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-full text-left p-4 rounded-xl transition-all font-bold text-sm ${i === idx ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              Question {i + 1}
            </button>
          ))}
          <button onClick={addQuestion} className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 font-bold text-sm hover:border-indigo-500/50 hover:text-indigo-400 transition-all flex items-center justify-center gap-2">
            <Plus size={18} /> Add Question
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-800/30 rounded-3xl border border-slate-700/50 p-10 flex flex-col overflow-y-auto">
        <div className="mb-8 border-b border-white/5 pb-8">
          <input
            className="w-full text-4xl font-black bg-transparent border-none focus:ring-0 outline-none text-white placeholder-slate-600"
            value={q.title}
            onChange={e => setQ({ ...q, title: e.target.value })}
            placeholder="Quiz Title..."
          />
        </div>

        <div className="flex-1 space-y-8">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Question Text</label>
            <textarea
              className="w-full p-6 bg-slate-950 rounded-2xl text-xl font-bold outline-none focus:ring-2 ring-indigo-500 text-white resize-none"
              rows="2"
              value={current.text}
              onChange={e => update('text', e.target.value)}
              placeholder="What is...?"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-400 uppercase block">Settings</label>
              <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl">
                <ImageIcon size={20} className="text-indigo-400" />
                <input className="bg-transparent w-full outline-none text-sm text-white" value={current.image || ''} onChange={e => update('image', e.target.value)} placeholder="Image URL (Optional)" />
              </div>
              <div className="bg-slate-950 p-4 rounded-xl">
                <span className="text-xs font-bold text-slate-500 block mb-1">Time Limit (Seconds)</span>
                <input type="number" className="bg-transparent w-full font-black text-xl outline-none text-white" value={current.duration} onChange={e => update('duration', parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase block">Answers</label>
              <div className="grid gap-3">
                {current.answers.map((ans, i) => (
                  <div key={i} className={`flex items-center gap-3 p-1 rounded-xl ${current.correct === i ? 'bg-indigo-500/20 ring-1 ring-indigo-500' : 'bg-slate-900'}`}>
                    <button
                      onClick={() => update('correct', i)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${current.correct === i ? SHAPES[i].color : 'bg-slate-800 text-slate-500'}`}
                    >
                      <CheckCircle2 size={20} className={current.correct === i ? "text-white" : "text-slate-600"} />
                    </button>
                    <input
                      className="bg-transparent flex-1 font-bold text-sm py-2 outline-none text-white"
                      value={ans}
                      onChange={e => {
                        const newAns = [...current.answers];
                        newAns[i] = e.target.value;
                        update('answers', newAns);
                      }}
                      placeholder={`Option ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center pt-6 border-t border-white/5">
          {q.id && (
            <button onClick={handleDelete} className="text-rose-400 font-bold hover:bg-rose-500/10 px-4 py-2 rounded-lg transition flex items-center gap-2">
              <Trash2 size={18} /> Delete Quiz
            </button>
          )}
          <div className="flex gap-4 ml-auto">
            <button onClick={onCancel} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white transition">Discard</button>
            <button onClick={() => onSave(q)} disabled={isSaving} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 flex items-center gap-2">
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : "Save Quiz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- GAME SESSION COMPONENT ---
const GameSession = ({ user, sessionData, onExit }) => {
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const pin = sessionData.pin;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'artifacts', 'mohoot-prod', 'sessions', pin),
      (s) => s.exists() ? setSnap(s.data()) : setError("Session ended"),
      (err) => setError(err.message)
    );
    return () => unsub();
  }, [pin]);

  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (snap?.status === 'QUESTION' && snap.endTime) {
      const timer = setInterval(() => {
        const remaining = Math.ceil((snap.endTime - Date.now()) / 1000);
        setTimeLeft(Math.max(0, remaining));
        if (remaining <= 0) update('LEADERBOARD');
      }, 100);
      return () => clearInterval(timer);
    }
  }, [snap?.status, snap?.endTime]);

  const update = (status, extra = {}) => {
    updateDoc(doc(db, 'artifacts', 'mohoot-prod', 'sessions', pin), { status, ...extra, lastUpdated: serverTimestamp() });
  };

  const gracefulShutdown = async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    try {
      await deleteDoc(doc(db, 'artifacts', 'mohoot-prod', 'sessions', pin));
    } catch (e) { console.error(e); }
    finally { onExit(); }
  };

  const next = () => {
    const nIdx = snap.currentQuestionIndex + 1;
    const q = snap.quizSnapshot.questions[nIdx];
    if (q) {
      update('QUESTION', {
        currentQuestionIndex: nIdx,
        roundId: Date.now(),
        startTime: Date.now() + 2000,
        endTime: Date.now() + 2000 + (q.duration * 1000)
      });
    } else {
      update('FINISHED');
    }
  };

  if (error) return <div className="h-screen flex items-center justify-center text-rose-500 font-bold bg-slate-900">{error}</div>;
  if (!snap) return <div className="h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-indigo-500" /></div>;

  const players = Object.values(snap.players || {});
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const currentQ = snap.quizSnapshot.questions[snap.currentQuestionIndex];

  if (snap.status === 'LOBBY') return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
      <HostHeader onClose={gracefulShutdown} />
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

      <div className="bg-slate-800/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-slate-700 flex flex-col items-center text-center relative z-10 mb-10">
        <div className="text-sm font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Game PIN</div>
        <div className="text-[8rem] font-black leading-none text-white tabular-nums tracking-tighter drop-shadow-2xl">{pin}</div>
        <div className="mt-8 flex items-center gap-4 text-slate-400 font-bold">
          <Users size={20} /> {players.length} Players Joined
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-center max-w-5xl mb-20 relative z-10">
        {players.map((p, i) => (
          <div key={i} className="bg-slate-800 px-6 py-3 rounded-xl shadow-lg border border-slate-700 font-black text-lg text-cyan-400 animate-in zoom-in">{p.nickname}</div>
        ))}
      </div>

      <div className="fixed bottom-10 z-20">
        <button
          disabled={players.length === 0}
          onClick={() => update('QUESTION', { roundId: Date.now(), startTime: Date.now() + 2000, endTime: Date.now() + 2000 + (currentQ.duration * 1000) })}
          className={`px-12 py-5 rounded-2xl font-black text-2xl shadow-xl transition-all ${players.length > 0 ? 'bg-indigo-600 text-white hover:scale-105' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
        >
          Start Game
        </button>
      </div>
    </div>
  );

  if (snap.status === 'QUESTION') return (
    <div className="min-h-screen bg-slate-900 relative flex flex-col">
      <HostHeader onClose={gracefulShutdown} />
      <div className="flex-1 flex flex-col items-center pt-24 px-6 animate-in fade-in">
        <div className="w-full flex justify-between items-center max-w-6xl mb-8">
          <div className="text-indigo-400 font-bold text-xl">Q {snap.currentQuestionIndex + 1}</div>
          <div className="text-5xl font-black text-white bg-slate-800 px-8 py-2 rounded-2xl shadow-lg border border-slate-700">{timeLeft}</div>
          <div className="text-slate-400 font-bold text-xl">{players.filter(p => p.lastAnswerIdx !== undefined).length} Answers</div>
        </div>

        <div className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center text-center pb-20">
          {currentQ.image && <img src={currentQ.image} className="h-56 object-contain rounded-2xl shadow-2xl mb-8 bg-black/20" />}
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-12">{currentQ.text}</h2>

          <div className="grid grid-cols-2 gap-6 w-full">
            {currentQ.answers.map((a, i) => (
              <div key={i} className={`${SHAPES[i].color} p-6 rounded-2xl text-white text-2xl font-black flex items-center shadow-lg border-4 border-white/10`}>
                <span className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center mr-4 text-lg">{i + 1}</span>
                {a}
              </div>
            ))}
          </div>
        </div>

        <div className="fixed bottom-6 right-6">
          <button onClick={() => update('LEADERBOARD')} className="bg-slate-800 text-indigo-400 px-6 py-3 rounded-xl font-bold hover:bg-slate-700">Skip Timer</button>
        </div>
      </div>
    </div>
  );

  if (snap.status === 'LEADERBOARD') {
    const isFinalStretch = (snap.quizSnapshot.questions.length - (snap.currentQuestionIndex + 1)) < 3;
    const playersToShow = isFinalStretch ? sortedPlayers.slice(5) : sortedPlayers;

    const [timer, setTimer] = useState(5);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
      if (timer > 0 && !paused) {
        const t = setTimeout(() => setTimer(t => t - 1), 1000);
        return () => clearTimeout(t);
      } else if (timer === 0 && !paused) {
        next();
      }
    }, [timer, paused]);

    const handleBtnClick = () => {
      if (!paused && timer > 0) {
        setPaused(true);
      } else {
        next();
      }
    };

    return (
      <div className="min-h-screen bg-slate-900 pt-20 px-6 relative">
        <HostHeader onClose={gracefulShutdown} />
        <div className="max-w-3xl mx-auto pt-10 animate-in slide-in-from-bottom-8">
          <div className="text-center mb-10">
            <Trophy size={64} className="mx-auto text-yellow-500 mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
            <h2 className="text-5xl font-black text-white">Current Ranking</h2>
          </div>

          <div className="space-y-3 mb-20">
            {playersToShow.map((p, i) => {
              const rank = isFinalStretch ? i + 5 : i;
              return (
                <div key={i} className={`p-5 rounded-2xl flex justify-between items-center ${rank === 0 ? 'bg-yellow-500/10 border border-yellow-500/50' : 'bg-slate-800 border border-slate-700'}`}>
                  <div className="flex items-center gap-6">
                    <span className={`font-black text-2xl w-12 text-center flex justify-center ${rank === 0 ? 'text-yellow-400' : 'text-slate-500'}`}>{rank === 0 ? <Trophy size={24} /> : `#${rank + 1}`}</span>
                    <span className="font-bold text-2xl text-white">{p.nickname}</span>
                  </div>
                  <span className="font-mono font-black text-2xl text-cyan-400">{p.score}</span>
                </div>
              )
            })}
          </div>

          <div className="fixed bottom-10 inset-x-0 flex justify-center">
            <button
              onClick={handleBtnClick}
              className="group relative bg-indigo-600 text-white pl-8 pr-10 py-4 rounded-2xl font-black text-xl shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 overflow-hidden"
            >
              <span className="relative z-10">
                {(!paused && timer > 0) ? `Auto Next (${timer}s)` : "Next Round"}
              </span>
              <Play size={20} fill="currentColor" className="relative z-10" />
              {(!paused && timer > 0) && (
                <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-1000 ease-linear w-full" style={{ width: `${(timer / 5) * 100}%` }} />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (snap.status === 'FINISHED') {
    const top3 = sortedPlayers.slice(0, 3);
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center pt-10">
        <HostHeader onClose={gracefulShutdown} />

        <div className="flex items-end justify-center gap-4 md:gap-8 w-full max-w-4xl px-4 mb-20">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-20 duration-[1500ms]">
              <div className="text-2xl font-black text-slate-400 mb-4">{top3[1].nickname}</div>
              <div className="w-full h-40 bg-slate-700 rounded-t-2xl flex items-end justify-center pb-4 border-t-4 border-slate-500 relative">
                <span className="text-5xl font-black text-white/10">2</span>
              </div>
              <div className="mt-4 font-bold text-slate-500">{top3[1].score} pts</div>
            </div>
          )}

          {/* 1st Place (No Bounce, No Title) */}
          {top3[0] && (
            <div className="flex flex-col items-center w-1/3 -mt-10 z-10 animate-in slide-in-from-bottom-32 duration-[2000ms]">
              <Trophy size={64} className="text-yellow-400 mb-6 drop-shadow-[0_0_25px_rgba(250,204,21,0.6)]" fill="currentColor" />
              <div className="text-4xl font-black text-white mb-4">{top3[0].nickname}</div>
              <div className="w-full h-64 bg-gradient-to-b from-yellow-600 to-yellow-800 rounded-t-3xl flex items-end justify-center pb-6 border-t-4 border-yellow-400 shadow-2xl shadow-yellow-900/40">
                <span className="text-7xl font-black text-white text-shadow-lg">1</span>
              </div>
              <div className="mt-6 font-black text-3xl text-yellow-400 bg-yellow-900/20 px-6 py-2 rounded-xl border border-yellow-500/20">{top3[0].score} pts</div>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-16 duration-[1200ms]">
              <div className="text-2xl font-black text-amber-700 mb-4">{top3[2].nickname}</div>
              <div className="w-full h-32 bg-amber-900/40 rounded-t-2xl flex items-end justify-center pb-4 border-t-4 border-amber-700 relative">
                <span className="text-5xl font-black text-white/10">3</span>
              </div>
              <div className="mt-4 font-bold text-slate-500">{top3[2].score} pts</div>
            </div>
          )}
        </div>
      </div>
    );
  }
};