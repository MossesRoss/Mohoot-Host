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
import { Plus, Trash2, LogOut, Loader2, Edit3, Image as ImageIcon, CheckCircle2, Trophy, Users, Play, XCircle } from 'lucide-react';

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
// --- CONFIGURATION END ---

const SHAPES = [
  { id: 0, color: 'bg-[#EA4335]', label: 'Triangle' },
  { id: 1, color: 'bg-[#4285F4]', label: 'Diamond' },
  { id: 2, color: 'bg-[#FBBC04]', label: 'Circle' },
  { id: 3, color: 'bg-[#34A853]', label: 'Square' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('DASHBOARD');
  const [quizzes, setQuizzes] = useState([]);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Authentication & Session Logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed: " + error.message);
    }
  };

  // Fetch Quizzes
  useEffect(() => {
    if (!user) return;
    const qRef = collection(db, 'artifacts', appId, 'users', user.uid, 'quizzes');
    const unsubscribe = onSnapshot(qRef, (snap) => {
      setQuizzes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Firestore Error:", err));
    return () => unsubscribe();
  }, [user]);

  // Persistent Session Recovery
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
    console.log("Saving quiz...", q);
    try {
      const ref = collection(db, 'artifacts', appId, 'users', user.uid, 'quizzes');
      
      const savePromise = q.id 
        ? updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'quizzes', q.id), { ...q, questions: q.questions })
        : addDoc(ref, { ...q, createdAt: serverTimestamp() });

      // Timeout after 5 seconds
      await Promise.race([
        savePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Save timed out. Check connection.")), 5000))
      ]);
      
      console.log("Save successful");
      setView('DASHBOARD');
    } catch (error) {
      console.error("Save failed:", error);
      alert("Saved (offline/background)");
      setView('DASHBOARD');
    } finally {
      setIsSaving(false);
    }
  };

  const launchGame = async (quiz) => {
    if (!user) return;
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      const sessionDoc = {
        hostId: user.uid,
        quizId: quiz.id,
        status: 'LOBBY',
        currentQuestionIndex: 0,
        players: {},
        quizSnapshot: quiz,
        lastUpdated: serverTimestamp()
      };

      const setPromise = setDoc(doc(db, 'artifacts', appId, 'sessions', pin), sessionDoc);

      await Promise.race([
        setPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Host timed out")), 5000))
      ]);

      setActiveSession({ quizId: quiz.id, pin });
      setView('GAME');
      localStorage.setItem('mohoot_host_active', JSON.stringify({ quizId: quiz.id, pin }));
    } catch (error) {
      console.error("Hosting slow/offline:", error);
      alert("Game starting (Background Sync)");
    }
    
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-gray-100">
          <h1 className="text-5xl font-black text-[#46178F] mb-2 tracking-tighter">Mohoot!</h1>
          <p className="text-gray-400 font-medium mb-10">Host your own live quiz games.</p>

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 hover:border-[#46178F] hover:bg-indigo-50 text-gray-700 font-bold py-4 px-6 rounded-2xl transition-all group"
          >
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="font-black text-2xl tracking-tighter text-indigo-600">
          Mohoot<span className="text-red-500">!</span> <span className="text-gray-400 font-light text-sm ml-2">HOST</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-gray-400 uppercase">User ID</span>
            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{user.uid.slice(0, 6)}...</span>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 text-gray-400 hover:text-red-500 transition" title="Sign Out">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <div className="p-6 max-w-7xl mx-auto">
        {view === 'DASHBOARD' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-gray-900">My Quizzes</h2>
              <button onClick={createQuiz} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex gap-2 items-center hover:bg-indigo-700 shadow-lg transition transform hover:-translate-y-1">
                <Plus size={20} /> Create Quiz
              </button>
            </div>
            {quizzes.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center text-gray-400">
                <Play size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No quizzes found. Click "Create Quiz" to start!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map(q => (
                  <div key={q.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                    <div className="h-2 w-full bg-indigo-100 rounded-full mb-4 overflow-hidden">
                      <div className="h-full bg-indigo-500 w-1/3 group-hover:w-full transition-all duration-700"></div>
                    </div>
                    <h3 className="font-bold text-xl mb-1 truncate text-gray-900">{q.title}</h3>
                    <div className="text-sm text-gray-400 font-medium mb-6">{q.questions?.length || 0} Questions</div>
                    <div className="flex gap-2">
                      <button onClick={() => launchGame(q)} className="flex-1 bg-green-500 text-white py-2.5 rounded-lg font-bold hover:bg-green-600 transition flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                        <Play size={18} fill="currentColor" /> Host
                      </button>
                      <button onClick={() => { setEditingQuiz(q); setView('EDITOR'); }} className="p-2.5 bg-gray-50 rounded-lg text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition">
                        <Edit3 size={20} />
                      </button>
                      <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'quizzes', q.id))} className="p-2.5 bg-gray-50 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'EDITOR' && (
          <Editor
            quiz={editingQuiz}
            onSave={saveQuiz}
            onCancel={() => setView('DASHBOARD')}
            isSaving={isSaving}
          />
        )}

        {view === 'GAME' && (
          <GameSession sessionData={activeSession} onExit={() => {
            localStorage.removeItem('mohoot_host_active');
            setActiveSession(null);
            setView('DASHBOARD');
          }} />
        )}
      </div>
    </div>
  );
}

const Editor = ({ quiz, onSave, onCancel, isSaving }) => {
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

  return (
    <div className="flex gap-6 h-[calc(100vh-160px)] animate-in slide-in-from-right-4 duration-300">
      <div className="w-64 flex flex-col gap-2">
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {q.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-full text-left p-4 mb-2 rounded-xl transition-all font-bold text-sm ${i === idx ? 'bg-indigo-600 text-white shadow-md scale-[1.02]' : 'bg-white border border-gray-100 hover:bg-indigo-50 text-gray-500'}`}
            >
              Question {i + 1}
            </button>
          ))}
          <button onClick={addQuestion} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold text-sm hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-2">
            <Plus size={18} /> Add Question
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-10 flex flex-col">
        <div className="mb-10">
          <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1 block">Quiz Title</label>
          <input
            className="w-full text-4xl font-black border-none focus:ring-0 outline-none p-0 text-indigo-900 placeholder-indigo-100"
            value={q.title}
            onChange={e => setQ({ ...q, title: e.target.value })}
            placeholder="My Awesome Quiz"
          />
        </div>

        <div className="flex-1 space-y-8">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Question {idx + 1} Prompt</label>
            <textarea
              className="w-full p-6 bg-indigo-50/30 rounded-2xl text-xl font-bold outline-none focus:ring-2 ring-indigo-500 transition-all resize-none text-indigo-900"
              rows="2"
              value={current.text}
              onChange={e => update('text', e.target.value)}
              placeholder="What is the capital of France?"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-400 uppercase block">Media & Timer</label>
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 focus-within:ring-2 ring-indigo-500/20">
                <ImageIcon size={20} className="text-indigo-400" />
                <input className="bg-transparent w-full outline-none text-sm font-medium text-gray-600" value={current.image || ''} onChange={e => update('image', e.target.value)} placeholder="Image URL (optional)" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100 focus-within:ring-2 ring-indigo-500/20">
                  <span className="text-xs font-bold text-gray-400 block mb-1">Duration (sec)</span>
                  <input type="number" className="bg-transparent w-full font-black text-xl outline-none text-gray-700" value={current.duration} onChange={e => update('duration', parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase block">Options</label>
              <div className="grid gap-3">
                {current.answers.map((ans, i) => (
                  <div key={i} className={`flex items-center gap-3 p-1 rounded-xl transition-all ${current.correct === i ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'bg-gray-50'}`}>
                    <button
                      onClick={() => update('correct', i)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${current.correct === i ? SHAPES[i].color : 'bg-white border text-gray-300'}`}
                    >
                      <CheckCircle2 size={20} className={current.correct === i ? "text-white" : "text-gray-100"} />
                    </button>
                    <input
                      className="bg-transparent flex-1 font-bold text-sm py-2 outline-none text-gray-700"
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

        <div className="mt-10 pt-6 border-t flex justify-end gap-4">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-8 py-3 rounded-xl font-bold text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
          >
            Discard Changes
          </button>

          <button
            onClick={() => onSave(q)}
            disabled={isSaving}
            className={`px-10 py-3 rounded-xl font-black text-white shadow-xl shadow-indigo-200 transition-all flex items-center gap-2
                 ${isSaving ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1'}`}
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Saving...
              </>
            ) : (
              "Save Quiz"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const GameSession = ({ sessionData, onExit }) => {
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState(null);
  const pin = sessionData.pin;

  useEffect(() => {
    const docRef = doc(db, 'artifacts', appId, 'sessions', pin);
    const unsubscribe = onSnapshot(docRef, (s) => {
      if (s.exists()) setSnap(s.data());
      else setError("Session not found (Check Firestore Permissions or Path)");
    }, (err) => {
      console.error("Session Sync Error:", err);
      setError(err.message);
    });

    return () => unsubscribe();
  }, [pin]);

  const update = (status, extra = {}) => {
    const docRef = doc(db, 'artifacts', appId, 'sessions', pin);
    updateDoc(docRef, { status, ...extra, lastUpdated: serverTimestamp() });
  };

  const next = () => {
    const nIdx = snap.currentQuestionIndex + 1;
    const q = snap.quizSnapshot.questions[nIdx];
    if (q) {
      update('QUESTION', {
        currentQuestionIndex: nIdx,
        startTime: Date.now() + 2000,
        endTime: Date.now() + 2000 + (q.duration * 1000)
      });
    } else {
      update('FINISHED');
    }
  };

  if (error) return (
    <div className="flex flex-col items-center justify-center p-20 text-red-500 h-full text-center">
      <XCircle size={48} className="mb-4" />
      <h3 className="text-xl font-bold mb-2">Connection Error</h3>
      <p className="mb-6 max-w-md">{error}</p>
      <button onClick={onExit} className="bg-gray-100 px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200">
        Return to Dashboard
      </button>
    </div>
  );

  if (!snap) return (
    <div className="flex flex-col items-center justify-center p-20 text-indigo-400 h-full">
      <Loader2 className="animate-spin mb-4" size={48} />
      <p className="font-bold">Syncing Session {pin}...</p>
    </div>
  );

  const currentQuestion = snap.quizSnapshot.questions[snap.currentQuestionIndex];
  const players = Object.values(snap.players || {});

  if (snap.status === 'LOBBY') return (
    <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-700">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col items-center text-center">
        <div className="text-sm font-black text-indigo-300 uppercase tracking-[0.4em] mb-4">Game PIN</div>
        <div className="text-[10rem] font-black leading-none text-indigo-900 mb-6 tabular-nums">{pin}</div>
        <div className="flex items-center gap-8 text-xl font-bold text-gray-400 mb-10">
          <div className="flex items-center gap-2"><Users size={24} /> {players.length} Joined</div>
          <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
          <div className="uppercase tracking-widest text-sm">Waiting for Host...</div>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap gap-4 justify-center max-w-5xl">
        {players.map((p, i) => (
          <div key={i} className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-gray-100 font-black text-xl text-indigo-600 animate-in zoom-in duration-300">
            {p.nickname}
          </div>
        ))}
      </div>

      <div className="fixed bottom-10 inset-x-0 flex justify-center gap-6 px-10">
        <button onClick={onExit} className="px-8 py-4 rounded-2xl font-bold bg-white text-gray-400 shadow-lg hover:text-red-500 transition-all">Cancel Game</button>
        <button
          disabled={players.length === 0}
          onClick={() => update('QUESTION', {
            startTime: Date.now() + 2000,
            endTime: Date.now() + 2000 + (currentQuestion.duration * 1000)
          })}
          className={`px-12 py-4 rounded-2xl font-black text-xl shadow-xl transition-all ${players.length > 0 ? 'bg-indigo-600 text-white hover:scale-105 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          Start Now!
        </button>
      </div>
    </div>
  );

  if (snap.status === 'QUESTION') return (
    <div className="h-[calc(100vh-140px)] flex flex-col items-center animate-in fade-in duration-500">
      <div className="w-full flex justify-between items-center mb-8">
        <div className="bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl font-black text-lg">
          Question {snap.currentQuestionIndex + 1} of {snap.quizSnapshot.questions.length}
        </div>
        <div className="flex items-center gap-2 font-black text-gray-400 text-xl">
          <Users size={20} />
          {players.filter(p => p.lastAnswerIdx !== null && p.lastAnswerIdx !== undefined).length} / {players.length} Answers
        </div>
      </div>

      <div className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center text-center">
        {currentQuestion.image && (
          <div className="relative mb-8 group">
            <div className="absolute -inset-4 bg-indigo-500/10 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img src={currentQuestion.image} className="h-64 object-contain mx-auto rounded-3xl shadow-lg border-4 border-white relative z-10" />
          </div>
        )}
        <h2 className="text-5xl font-black text-indigo-900 leading-tight mb-12">{currentQuestion.text}</h2>

        <div className="grid grid-cols-2 gap-6 w-full">
          {currentQuestion.answers.map((a, i) => (
            <div key={i} className={`${SHAPES[i].color} p-8 rounded-3xl text-white text-3xl font-black flex items-center shadow-lg transition-transform hover:scale-[1.02]`}>
              <span className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mr-6 text-2xl">{i + 1}</span>
              {a}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 w-full flex justify-end">
        <button onClick={() => update('LEADERBOARD')} className="bg-white border-2 border-indigo-100 shadow-xl px-10 py-4 rounded-2xl font-black text-indigo-600 hover:bg-indigo-50 transition-all">
          End Question
        </button>
      </div>
    </div>
  );

  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="max-w-3xl mx-auto pt-10 animate-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-12">
        <Trophy size={64} className="mx-auto text-yellow-500 mb-4 animate-bounce" />
        <h2 className="text-5xl font-black text-indigo-900">{snap.status === 'FINISHED' ? 'Final Standings' : 'Current Ranking'}</h2>
      </div>

      <div className="space-y-3">
        {sortedPlayers.map((p, i) => (
          <div
            key={i}
            className={`p-6 rounded-3xl border shadow-sm flex justify-between items-center transform transition-all hover:translate-x-2 ${i === 0 ? 'bg-yellow-50 border-yellow-200 ring-2 ring-yellow-400' : 'bg-white border-gray-100'}`}
          >
            <div className="flex items-center gap-6">
              <span className={`font-black text-3xl w-12 text-center ${i === 0 ? 'text-yellow-600' : 'text-gray-300'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="font-black text-2xl text-indigo-900">{p.nickname}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-gray-400 uppercase">Points</span>
              <span className="font-mono font-black text-3xl text-indigo-600">{p.score || 0}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 flex justify-center gap-6 pb-20">
        {snap.status !== 'FINISHED' && (
          <button onClick={next} className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-2xl shadow-2xl shadow-indigo-200 hover:scale-110 active:scale-95 transition-all">
            Next Round
          </button>
        )}
        <button onClick={onExit} className="bg-white border-2 border-gray-100 px-10 py-5 rounded-2xl font-black text-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
          Close Game
        </button>
      </div>
    </div>
  );
};