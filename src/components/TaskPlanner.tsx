import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Flag, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  AlertTriangle,
  Zap,
  CheckCircle2,
  Circle,
  HelpCircle,
  BarChart3,
  ListTodo
} from "lucide-react";
import { Task, Goal, ProductivityBrief } from "../types";
import { addDocument, deleteDocument, saveDocument } from "../lib/firebase";

interface TaskPlannerProps {
  tasks: Task[];
  goals: Goal[];
  onTasksChange: (tasks: Task[]) => void;
  onGoalsChange: (goals: Goal[]) => void;
}

export default function TaskPlanner({ tasks, goals, onTasksChange, onGoalsChange }: TaskPlannerProps) {
  // Task state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("Work");
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>("medium");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskDuration, setTaskDuration] = useState(30);
  const [taskGoalId, setTaskGoalId] = useState("");

  // Goal state
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState("Work");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalDesc, setGoalDesc] = useState("");

  // UI state
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [activeTab, setActiveTab] = useState<'tasks' | 'goals'>('tasks');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  
  // AI states
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [brief, setBrief] = useState<ProductivityBrief | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState<string | null>(null);

  // Subtask local maps (or stored inside Task objects as any type extensions)
  const [taskSubtasks, setTaskSubtasks] = useState<Record<string, { title: string, duration: number, completed: boolean }[]>>({});

  // Populate subtasks map from tasks list when loaded
  useEffect(() => {
    const map: Record<string, any> = {};
    tasks.forEach(task => {
      // If tasks have embedded subtasks
      if ((task as any).subtasks) {
        map[task.id] = (task as any).subtasks;
      }
    });
    setTaskSubtasks(map);
  }, [tasks]);

  // Request AI Productivity Brief
  const fetchProductivityBrief = async () => {
    setLoadingBrief(true);
    try {
      const simplifiedHistory = tasks.filter(t => t.completed).slice(0, 10).map(t => ({
        title: t.title,
        category: t.category,
        completedAt: t.completedAt,
        duration: t.duration
      }));

      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: tasks.filter(t => !t.completed),
          goals,
          history: simplifiedHistory
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBrief(data);
      }
    } catch (e) {
      console.error("Failed to load brief:", e);
    } finally {
      setLoadingBrief(false);
    }
  };

  // Request Proactive Task Recommendations
  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const res = await fetch("/api/ai/recommend-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: tasks.filter(t => t.completed).slice(0, 5),
          currentTasks: tasks.filter(t => !t.completed),
          goals
        })
      });

      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (e) {
      console.error("Failed to fetch task recommendations:", e);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Auto-fetch on component mount
  useEffect(() => {
    fetchProductivityBrief();
    fetchRecommendations();
  }, [tasks.length, goals.length]);

  // Handle task adding
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const deadlineStr = taskDeadline || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    const newTask: Omit<Task, 'id'> = {
      title: taskTitle,
      completed: false,
      deadline: deadlineStr,
      priority: taskPriority,
      duration: Number(taskDuration),
      category: taskCategory,
      createdAt: new Date().toISOString()
    };

    if (taskGoalId) {
      newTask.goalId = taskGoalId;
    }

    const docId = await addDocument("tasks", newTask);
    onTasksChange([...tasks, { ...newTask, id: docId }]);
    
    // Reset form
    setTaskTitle("");
    setTaskDeadline("");
    setTaskDuration(30);
    setTaskGoalId("");
  };

  // Handle goals adding
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    const targetStr = goalTargetDate || new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];

    const newGoal: Omit<Goal, 'id'> = {
      title: goalTitle,
      description: goalDesc,
      targetDate: targetStr,
      category: goalCategory,
      progress: 0,
      createdAt: new Date().toISOString()
    };

    const docId = await addDocument("goals", newGoal);
    onGoalsChange([...goals, { ...newGoal, id: docId }]);

    // Reset
    setGoalTitle("");
    setGoalDesc("");
    setGoalTargetDate("");
  };

  // Delete items
  const handleDeleteTask = async (id: string) => {
    await deleteDocument("tasks", id);
    onTasksChange(tasks.filter(t => t.id !== id));
  };

  const handleDeleteGoal = async (id: string) => {
    await deleteDocument("goals", id);
    onGoalsChange(goals.filter(g => g.id !== id));
  };

  // Toggle tasks
  const handleToggleTask = async (id: string) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        const completed = !t.completed;
        return {
          ...t,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined
        };
      }
      return t;
    });

    onTasksChange(updated);
    const item = updated.find(t => t.id === id);
    if (item) {
      await saveDocument("tasks", id, { 
        completed: item.completed, 
        completedAt: item.completedAt || null 
      });

      // Recalculate linked goal progress
      if (item.goalId) {
        recalculateGoalProgress(item.goalId, updated);
      }
    }
  };

  // Calculate dynamic Goal Progress
  const recalculateGoalProgress = async (goalId: string, currentTasksList: Task[]) => {
    const goalTasks = currentTasksList.filter(t => t.goalId === goalId);
    if (goalTasks.length === 0) return;

    const completed = goalTasks.filter(t => t.completed).length;
    const percentage = Math.round((completed / goalTasks.length) * 100);

    const updatedGoals = goals.map(g => {
      if (g.id === goalId) {
        return { ...g, progress: percentage };
      }
      return g;
    });

    onGoalsChange(updatedGoals);
    await saveDocument("goals", goalId, { progress: percentage });
  };

  // Trigger AI breakdown
  const handleAIBreakdown = async (task: Task) => {
    setBreakdownLoading(task.id);
    try {
      const res = await fetch("/api/ai/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description || "",
          category: task.category
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Save subtasks inside the Task in Firestore
        const mappedSubtasks = (data.subtasks || []).map((st: any) => ({
          title: st.title,
          duration: st.duration,
          completed: false
        }));

        const updatedTasks = tasks.map(t => {
          if (t.id === task.id) {
            return { ...t, subtasks: mappedSubtasks } as any;
          }
          return t;
        });

        onTasksChange(updatedTasks);
        setTaskSubtasks(prev => ({ ...prev, [task.id]: mappedSubtasks }));
        
        // Persist to document
        await saveDocument("tasks", task.id, { subtasks: mappedSubtasks });
      }
    } catch (e) {
      console.error("Failed to breakdown task:", e);
    } finally {
      setBreakdownLoading(null);
    }
  };

  // Toggle Subtask Checked State
  const handleToggleSubtask = async (taskId: string, index: number) => {
    const currentSubs = [...(taskSubtasks[taskId] || [])];
    currentSubs[index].completed = !currentSubs[index].completed;

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, subtasks: currentSubs } as any;
      }
      return t;
    });

    onTasksChange(updatedTasks);
    setTaskSubtasks(prev => ({ ...prev, [taskId]: currentSubs }));
    await saveDocument("tasks", taskId, { subtasks: currentSubs });
  };

  // Quick-add recommended task
  const handleAddRecommendedTask = async (rec: any) => {
    const deadlineStr = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]; // default to 2 days
    const newTask: Omit<Task, 'id'> = {
      title: rec.title,
      description: rec.description,
      completed: false,
      deadline: deadlineStr,
      priority: rec.priority || 'medium',
      duration: rec.duration || 30,
      category: rec.category || 'Work',
      createdAt: new Date().toISOString()
    };

    const docId = await addDocument("tasks", newTask);
    onTasksChange([...tasks, { ...newTask, id: docId }]);
    
    // Remove from recommendations
    setRecommendations(prev => prev.filter(r => r.title !== rec.title));
  };

  // Helper: Format Deadline Badge
  const getDeadlineBadge = (deadline: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(deadline);
    due.setHours(0,0,0,0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full animate-pulse">
          <AlertTriangle size={10} />
          Overdue
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full animate-pulse">
          <Clock size={10} />
          Due Today
        </span>
      );
    } else if (diffDays === 1) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
          Tomorrow
        </span>
      );
    } else if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
          {diffDays} days left
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {deadline}
        </span>
      );
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesCategory = filterCategory === "All" || task.category === filterCategory;
    const matchesPriority = filterPriority === "All" || task.priority === filterPriority;
    return matchesCategory && matchesPriority;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT COLUMN: AI Planning Hub & Goals (5 span) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* AI PLANNING HUB */}
        <div className="bg-radial from-slate-900 to-indigo-950 text-white rounded-2xl shadow-md border border-indigo-900 p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="text-yellow-400 animate-pulse" size={20} />
              AI Planning & Daily Coach
            </h2>
            <button 
              onClick={fetchProductivityBrief} 
              disabled={loadingBrief}
              className="p-1.5 rounded-lg bg-indigo-900/60 border border-indigo-800 text-indigo-200 hover:text-white transition-all text-xs flex items-center gap-1"
            >
              <Zap size={12} className={loadingBrief ? "animate-bounce" : ""} />
              Re-Analyze
            </button>
          </div>

          {loadingBrief ? (
            <div className="space-y-3 py-4">
              <div className="h-4 bg-indigo-900/40 rounded-full animate-pulse w-3/4"></div>
              <div className="h-4 bg-indigo-900/40 rounded-full animate-pulse w-5/6"></div>
              <div className="h-4 bg-indigo-900/40 rounded-full animate-pulse w-2/3"></div>
            </div>
          ) : brief ? (
            <div className="space-y-4">
              <p className="text-sm text-indigo-100 leading-relaxed font-sans font-normal border-l-2 border-indigo-400 pl-3">
                {brief.summary}
              </p>

              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-300 font-bold">Suggested Focus Priorities:</span>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-200">
                  {brief.priorities?.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-300 font-bold">Proactive Coach Tips:</span>
                <div className="mt-2 space-y-2 text-xs text-slate-300 bg-indigo-950/60 border border-indigo-900 p-3 rounded-xl">
                  {brief.proactiveTips?.map((tip, i) => (
                    <p key={i} className="leading-relaxed font-sans">{tip}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <HelpCircle className="mx-auto text-slate-400 mb-2" size={28} />
              <p className="text-xs text-slate-300">Generate your personalized productivity breakdown coaching brief.</p>
              <button 
                onClick={fetchProductivityBrief}
                className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold"
              >
                Analyze My Workspace
              </button>
            </div>
          )}
        </div>

        {/* PROACTIVE SUGGESTIONS PANEL */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-md font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Zap className="text-amber-500" size={18} />
            Smart Tasks Recommendations
          </h2>

          {loadingRecommendations ? (
            <div className="space-y-3">
              <div className="h-12 bg-slate-50 rounded-xl animate-pulse"></div>
              <div className="h-12 bg-slate-50 rounded-xl animate-pulse"></div>
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-xl flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-bold uppercase rounded">
                        {rec.category || "Study"}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-800 leading-tight">
                        {rec.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddRecommendedTask(rec)}
                    title="Add task to board"
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 self-center"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              Your calendar is perfectly structured! No missing prerequisites identified by the AI.
            </p>
          )}
        </div>

        {/* GOAL TRACKER */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-md font-semibold text-slate-800 flex items-center gap-2">
              <Target className="text-indigo-600" size={18} />
              Goal Trackers
            </h2>
            <div className="text-xs text-slate-400">{goals.length} Active Goals</div>
          </div>

          {/* Goal List */}
          <div className="space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-1 mb-6">
            {goals.map(goal => {
              const linkedTasks = tasks.filter(t => t.goalId === goal.id);
              return (
                <div key={goal.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1.5 py-0.5 bg-slate-200/50 rounded">
                        {goal.category}
                      </span>
                      <h3 className="font-semibold text-xs text-slate-800 mt-1">
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="text-slate-400">Target: {goal.targetDate}</span>
                      <span className="font-bold text-indigo-600">{goal.progress}% Done</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-4">No long-term objectives established yet.</p>
            )}
          </div>

          {/* New Goal Form */}
          <form onSubmit={handleAddGoal} className="space-y-3 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Add New Objective
            </span>
            <input
              type="text"
              placeholder="e.g. Master React Native"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={goalCategory}
                onChange={(e) => setGoalCategory(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Work">Work</option>
                <option value="Study">Study</option>
                <option value="Personal">Personal</option>
                <option value="Health">Health</option>
                <option value="Finance">Finance</option>
              </select>
              <input
                type="date"
                value={goalTargetDate}
                onChange={(e) => setGoalTargetDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-500"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-950 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus size={13} />
              Establish Goal
            </button>
          </form>
        </div>

      </div>

      {/* RIGHT COLUMN: Tasks Checklist & Controls (7 span) */}
      <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        
        {/* Filters and Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-50 mb-6">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ListTodo className="text-indigo-600" size={22} />
            My Active Workspace
          </h2>

          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Work">Work</option>
              <option value="Study">Study</option>
              <option value="Personal">Personal</option>
              <option value="Health">Health</option>
              <option value="Finance">Finance</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Task Form */}
        <form onSubmit={handleAddTask} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 mb-6 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-7 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Task Title</label>
            <input
              type="text"
              placeholder="What are you focusing on?"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-5 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
            <select
              value={taskCategory}
              onChange={(e) => setTaskCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Work">Work</option>
              <option value="Study">Study</option>
              <option value="Personal">Personal</option>
              <option value="Health">Health</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Priority</label>
            <select
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="high">🔥 High</option>
              <option value="medium">⚡ Medium</option>
              <option value="low">💤 Low</option>
            </select>
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Deadline</label>
            <input
              type="date"
              value={taskDeadline}
              onChange={(e) => setTaskDeadline(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-500"
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Goal Alignment</label>
            <select
              value={taskGoalId}
              onChange={(e) => setTaskGoalId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-500"
            >
              <option value="">None</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-12">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Task to Board
            </button>
          </div>
        </form>

        {/* Task List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredTasks.map(task => {
            const isExpanded = expandedTask === task.id;
            const subList = taskSubtasks[task.id] || [];
            const completedSubs = subList.filter(s => s.completed).length;

            return (
              <div 
                key={task.id} 
                className={`border rounded-xl transition-all ${
                  task.completed 
                    ? "bg-slate-50/70 border-slate-100" 
                    : "bg-white border-slate-100 hover:border-slate-200"
                }`}
              >
                {/* Task Header info */}
                <div className="p-4 flex items-start gap-3 justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="mt-1 shrink-0 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {task.completed ? (
                        <CheckCircle className="text-emerald-500" size={19} />
                      ) : (
                        <Circle className="text-slate-300" size={19} />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          task.priority === "high" 
                            ? "bg-rose-50 text-rose-700 border border-rose-100" 
                            : task.priority === "medium" 
                            ? "bg-amber-50 text-amber-700 border border-amber-100" 
                            : "bg-slate-50 text-slate-600"
                        }`}>
                          {task.priority}
                        </span>
                        
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                          {task.category}
                        </span>

                        {task.goalId && (
                          <span className="inline-flex items-center gap-1 text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
                            <Target size={9} />
                            Goal Aligned
                          </span>
                        )}
                      </div>

                      <h3 className={`text-sm font-semibold text-slate-800 mt-1.5 ${task.completed ? "line-through text-slate-400" : ""}`}>
                        {task.title}
                      </h3>
                      
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2">
                        {getDeadlineBadge(task.deadline)}
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={11} />
                          {task.duration} mins
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 hover:bg-slate-50 text-slate-300 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details: AI Subtask planner & breakdown */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-50 bg-slate-50/40 rounded-b-xl">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-500" />
                        AI Breakdown Subtasks {subList.length > 0 && `(${completedSubs}/${subList.length})`}
                      </h4>

                      {subList.length === 0 && (
                        <button
                          onClick={() => handleAIBreakdown(task)}
                          disabled={breakdownLoading === task.id}
                          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-[10px] font-semibold transition-all shadow-2xs"
                        >
                          <Sparkles size={11} />
                          {breakdownLoading === task.id ? "Analyzing..." : "Generate Action Plan"}
                        </button>
                      )}
                    </div>

                    {subList.length > 0 ? (
                      <div className="space-y-1.5">
                        {subList.map((st, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => handleToggleSubtask(task.id, idx)}
                            className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <button className="text-slate-400 hover:text-indigo-600">
                                {st.completed ? (
                                  <CheckCircle className="text-emerald-500" size={14} />
                                ) : (
                                  <Circle className="text-slate-300" size={14} />
                                )}
                              </button>
                              <span className={`text-xs font-medium text-slate-700 truncate ${st.completed ? 'line-through text-slate-400' : ''}`}>
                                {st.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {st.duration} min
                            </span>
                          </div>
                        ))}
                        
                        <div className="pt-2 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 italic">
                            💡 Sequential action-plan prepared by Gemini Proactive Planner
                          </span>
                          <button
                            onClick={() => handleAIBreakdown(task)}
                            disabled={breakdownLoading === task.id}
                            className="text-[10px] font-semibold text-indigo-600 hover:underline"
                          >
                            Regenerate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-white rounded-lg border border-slate-100/60 text-center text-xs text-slate-400">
                        {breakdownLoading === task.id ? (
                          <div className="flex items-center justify-center gap-2 text-indigo-600">
                            <Sparkles className="animate-spin" size={14} />
                            Analyzing with Gemini... formulating action items...
                          </div>
                        ) : (
                          "Need help planning? Generate a sequential bite-sized action plan using AI."
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filteredTasks.length === 0 && (
            <div className="py-12 text-center text-slate-400 border border-dashed border-slate-100 rounded-2xl">
              <Calendar className="mx-auto text-slate-300 mb-2" size={32} />
              <p className="text-sm font-medium">All clear! No tasks found match these parameters.</p>
              <p className="text-xs text-slate-400 mt-1">Add a task above to begin tracking.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
