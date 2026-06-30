import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  ListTodo, 
  Flame, 
  BookOpen, 
  FileText, 
  RefreshCw, 
  Clock, 
  Layers, 
  AlertCircle,
  TrendingUp,
  User,
  ExternalLink,
  Target
} from "lucide-react";
import TaskPlanner from "./components/TaskPlanner";
import PomodoroTimer from "./components/PomodoroTimer";
import SmartNotepad from "./components/SmartNotepad";
import FlashcardPro from "./components/FlashcardPro";
import WorkspaceSync from "./components/WorkspaceSync";
import { Task, Goal, PomodoroSession, Flashcard, FlashcardDeck, Note } from "./types";
import { getCollectionData, addDocument } from "./lib/firebase";

export default function App() {
  const [activeTab, setActiveTab] = useState<'planner' | 'pomodoro' | 'notebook' | 'flashcards' | 'sync'>('planner');
  const [currentTime, setCurrentTime] = useState<string>("");

  // Global Collections State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [loading, setLoading] = useState(true);

  // Update dynamic clock in the header (formatted simply)
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setCurrentTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial Firestore / Local fallback datasets on mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const loadedTasks = await getCollectionData("tasks");
        const loadedGoals = await getCollectionData("goals");
        const loadedSessions = await getCollectionData("pomodoro_sessions");
        const loadedDecks = await getCollectionData("flashcard_decks");
        const loadedCards = await getCollectionData("flashcards");
        const loadedNotes = await getCollectionData("notes");

        setTasks(loadedTasks);
        setGoals(loadedGoals);
        setSessions(loadedSessions);
        setDecks(loadedDecks);
        setCards(loadedCards);
        setNotes(loadedNotes);
      } catch (e) {
        console.error("Error fetching collections:", e);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  // Sync / Import tasks from Workspace connected tools
  const handleImportTasks = async (newImportedTasks: Omit<Task, 'id' | 'createdAt'>[]) => {
    const newlyCreated: Task[] = [];
    for (const item of newImportedTasks) {
      const taskObj = {
        ...item,
        createdAt: new Date().toISOString()
      };
      const docId = await addDocument("tasks", taskObj);
      newlyCreated.push({ ...taskObj, id: docId });
    }
    setTasks(prev => [...prev, ...newlyCreated]);
  };

  // Helper callback allowing other tabs to inject tasks easily (e.g., AI Notepad task extractor)
  const handleAddTaskExternal = async (title: string, duration: number, category: string) => {
    const taskObj: Omit<Task, 'id'> = {
      title,
      completed: false,
      deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days
      priority: 'medium',
      duration,
      category,
      createdAt: new Date().toISOString()
    };
    const docId = await addDocument("tasks", taskObj);
    setTasks(prev => [...prev, { ...taskObj, id: docId }]);
  };

  // Quick stats calculations for visual top panel
  const activeTasksCount = tasks.filter(t => !t.completed).length;
  const overdueCount = tasks.filter(t => {
    if (t.completed) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(t.deadline);
    due.setHours(0,0,0,0);
    return due.getTime() < today.getTime();
  }).length;

  const totalGoalsCompleted = goals.filter(g => g.progress === 100).length;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-700 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-16">
      
      {/* Sleek Header Dashboard Banner */}
      <header className="bg-white border-b border-slate-100/80 sticky top-0 z-40 shadow-2xs backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-100 flex items-center justify-center">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">FocusCompanion AI</h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span>karnsameer30@gmail.com</span>
                <span>• Active Productivity Loop</span>
              </p>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
              <ListTodo size={14} className="text-slate-500" />
              <span className="text-slate-500 font-medium">Tasks:</span>
              <span className="font-bold text-slate-800">{activeTasksCount} Active</span>
              {overdueCount > 0 && (
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md animate-pulse">
                  {overdueCount} Overdue
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
              <Target size={14} className="text-slate-500" />
              <span className="text-slate-500 font-medium">Goals:</span>
              <span className="font-bold text-indigo-600">{goals.length} Tracked</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
              <Clock size={14} className="text-indigo-600 animate-spin-slow" />
              <span className="font-mono font-bold text-slate-700 tracking-wide">{currentTime || "00:00:00"} UTC</span>
            </div>

          </div>

        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Navigation Tab Menu */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-white border border-slate-100 shadow-2xs rounded-2xl mb-8 max-w-3xl">
          {[
            { id: 'planner', label: '📋 AI Planner & Board', icon: <ListTodo size={15} /> },
            { id: 'pomodoro', label: '⏱️ Pomodoro Arena', icon: <Flame size={15} /> },
            { id: 'notebook', label: '📝 Notepad Refiner', icon: <FileText size={15} /> },
            { id: 'flashcards', label: '🧠 Flashcard Pro', icon: <Layers size={15} /> },
            { id: 'sync', label: '🔌 Connected Workspace', icon: <RefreshCw size={15} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id 
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100" 
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Tab Views Rendering */}
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="mx-auto text-indigo-600 animate-spin mb-3" size={32} />
            <p className="text-sm text-slate-400 font-medium">Synchronizing Cloud Firestore databases... Readying AI workspace...</p>
          </div>
        ) : (
          <div className="transition-all duration-300">
            {activeTab === 'planner' && (
              <TaskPlanner 
                tasks={tasks} 
                goals={goals} 
                onTasksChange={setTasks} 
                onGoalsChange={setGoals} 
              />
            )}

            {activeTab === 'pomodoro' && (
              <PomodoroTimer 
                tasks={tasks}
                sessions={sessions}
                onSessionsChange={setSessions}
              />
            )}

            {activeTab === 'notebook' && (
              <SmartNotepad 
                notes={notes}
                onNotesChange={setNotes}
                onAddTaskExternal={handleAddTaskExternal}
              />
            )}

            {activeTab === 'flashcards' && (
              <FlashcardPro 
                decks={decks}
                cards={cards}
                onDecksChange={setDecks}
                onCardsChange={setCards}
              />
            )}

            {activeTab === 'sync' && (
              <WorkspaceSync 
                onImportTasks={handleImportTasks}
                existingTasks={tasks}
              />
            )}
          </div>
        )}

      </main>

    </div>
  );
}
