import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Trello, 
  Layers, 
  CheckSquare, 
  RefreshCw, 
  Plus, 
  Link, 
  Unlink, 
  AlertCircle,
  Clock,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { ExternalTask, Task } from "../types";

interface WorkspaceSyncProps {
  onImportTasks: (tasks: Omit<Task, 'id' | 'createdAt'>[]) => void;
  existingTasks: Task[];
}

export default function WorkspaceSync({ onImportTasks, existingTasks }: WorkspaceSyncProps) {
  const [connections, setConnections] = useState({
    google_calendar: { connected: true, lastSynced: "Just now", count: 3 },
    jira: { connected: true, lastSynced: "10 mins ago", count: 2 },
    trello: { connected: false, lastSynced: "Never", count: 0 },
    notion: { connected: false, lastSynced: "Never", count: 0 }
  });

  // Simulated external repository of tasks that are "waiting" on the servers
  const [externalTasks, setExternalTasks] = useState<ExternalTask[]>([
    {
      id: "ext-1",
      title: "🗓️ Q3 Project Kickoff Meeting",
      source: "google_calendar",
      status: "todo",
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days out
      synced: false
    },
    {
      id: "ext-2",
      title: "🛠️ Fix high-priority security bug in Auth Controller",
      source: "jira",
      status: "in_progress",
      dueDate: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0], // tomorrow
      synced: false
    },
    {
      id: "ext-3",
      title: "📝 Draft Q3 Content Strategy Plan",
      source: "notion",
      status: "todo",
      dueDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
      synced: false
    },
    {
      id: "ext-4",
      title: "📊 Prepare Financial Review slides",
      source: "trello",
      status: "todo",
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      synced: false
    },
    {
      id: "ext-5",
      title: "🦷 Dentist Appointment",
      source: "google_calendar",
      status: "todo",
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      synced: false
    }
  ]);

  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncAlert, setSyncAlert] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // Auto-clear notification alert
  useEffect(() => {
    if (syncAlert) {
      const timer = setTimeout(() => setSyncAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [syncAlert]);

  // Synchronize available tasks from active connections
  const triggerSync = (sourceKey?: keyof typeof connections) => {
    const targetSource = sourceKey || "all";
    setSyncing(targetSource);

    setTimeout(() => {
      // Find eligible items to sync (from connected platforms that aren't already imported)
      const activeSources = Object.entries(connections)
        .filter(([_, conf]) => conf.connected)
        .map(([src]) => src);

      const itemsToSync = externalTasks.filter(item => {
        const matchesSource = targetSource === "all" ? activeSources.includes(item.source) : item.source === targetSource;
        const alreadyInMainList = existingTasks.some(existing => existing.title.includes(item.title));
        return matchesSource && !item.synced && !alreadyInMainList;
      });

      if (itemsToSync.length > 0) {
        // Map external task scheme to client Task input scheme
        const mapped: Omit<Task, 'id' | 'createdAt'>[] = itemsToSync.map(item => ({
          title: item.title,
          description: `Synced from ${getSourceLabel(item.source)}. Original deadline: ${item.dueDate}`,
          completed: false,
          deadline: item.dueDate,
          priority: item.source === "jira" ? "high" : "medium",
          duration: item.source === "google_calendar" ? 60 : 120,
          category: item.source === "google_calendar" ? "Personal" : "Work"
        }));

        onImportTasks(mapped);

        // Mark items as synced in simulator
        setExternalTasks(prev => 
          prev.map(item => 
            itemsToSync.some(syncedItem => syncedItem.id === item.id) 
              ? { ...item, synced: true } 
              : item
          )
        );

        // Update connection metadata
        setConnections(prev => {
          const updated = { ...prev };
          if (targetSource === "all") {
            Object.keys(updated).forEach(k => {
              const key = k as keyof typeof connections;
              if (updated[key].connected) {
                updated[key] = {
                  ...updated[key],
                  lastSynced: "Just now",
                  count: 0
                };
              }
            });
          } else {
            updated[targetSource] = {
              ...updated[targetSource],
              lastSynced: "Just now",
              count: 0
            };
          }
          return updated;
        });

        setSyncAlert({
          message: `Successfully synced ${itemsToSync.length} task${itemsToSync.length > 1 ? 's' : ''} into your active board.`,
          type: "success"
        });
      } else {
        setSyncAlert({
          message: "All tasks are already fully synchronized.",
          type: "info"
        });
      }

      setSyncing(null);
    }, 1500);
  };

  const toggleConnection = (sourceKey: keyof typeof connections) => {
    setConnections(prev => {
      const isConnecting = !prev[sourceKey].connected;
      const unSyncedCount = externalTasks.filter(t => t.source === sourceKey && !t.synced).length;
      
      return {
        ...prev,
        [sourceKey]: {
          ...prev[sourceKey],
          connected: isConnecting,
          lastSynced: isConnecting ? "Just now" : "Never",
          count: isConnecting ? unSyncedCount : 0
        }
      };
    });
  };

  const getSourceIcon = (source: string, size = 20) => {
    switch (source) {
      case "google_calendar":
        return <Calendar size={size} className="text-blue-500" />;
      case "jira":
        return <Layers size={size} className="text-blue-600" />;
      case "trello":
        return <Trello size={size} className="text-sky-500" />;
      case "notion":
        return <CheckSquare size={size} className="text-zinc-700" />;
      default:
        return <Calendar size={size} />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "google_calendar": return "Google Calendar";
      case "jira": return "Atlassian JIRA";
      case "trello": return "Trello Board";
      case "notion": return "Notion Workspace";
      default: return source;
    }
  };

  // Allow simulated user to submit a fake task to third party tool first
  const [newFakeTitle, setNewFakeTitle] = useState("");
  const [newFakeSource, setNewFakeSource] = useState<'google_calendar' | 'jira' | 'trello' | 'notion'>("google_calendar");

  const addSimulatedExternalTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFakeTitle.trim()) return;

    const sourceLabel = getSourceLabel(newFakeSource);
    const newTask: ExternalTask = {
      id: `ext-${Date.now()}`,
      title: `${newFakeSource === 'google_calendar' ? '🗓️' : newFakeSource === 'jira' ? '🛠️' : '📝'} ${newFakeTitle}`,
      source: newFakeSource,
      status: "todo",
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      synced: false
    };

    setExternalTasks(prev => [newTask, ...prev]);
    setNewFakeTitle("");

    // Update notification counts if connected
    if (connections[newFakeSource].connected) {
      setConnections(prev => ({
        ...prev,
        [newFakeSource]: {
          ...prev[newFakeSource],
          count: prev[newFakeSource].count + 1
        }
      }));
    }

    setSyncAlert({
      message: `Created an external ticket inside ${sourceLabel}. Run 'Sync Workspace' to import it here!`,
      type: "info"
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-50">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <RefreshCw className="text-emerald-500 animate-spin-slow" size={22} />
            Workspace Connect
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Simulate connections and synchronize schedules with popular calendars and project managers.
          </p>
        </div>
        
        <button
          onClick={() => triggerSync()}
          disabled={syncing !== null}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-sm font-medium shadow-sm transition-all self-start"
        >
          <RefreshCw className={`w-4 h-4 ${syncing === "all" ? "animate-spin" : ""}`} />
          {syncing === "all" ? "Syncing..." : "Sync All Workspaces"}
        </button>
      </div>

      {syncAlert && (
        <div className={`p-4 mb-6 rounded-xl border flex items-start gap-3 transition-all ${
          syncAlert.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
          <div className="text-sm">{syncAlert.message}</div>
        </div>
      )}

      {/* Grid of integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Object.entries(connections).map(([key, item]) => {
          const sourceKey = key as keyof typeof connections;
          return (
            <div 
              key={key} 
              className={`p-4 rounded-xl border transition-all ${
                item.connected 
                  ? "bg-slate-50/50 border-slate-200/80 hover:border-slate-300" 
                  : "bg-white border-dashed border-slate-200 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                  {getSourceIcon(key)}
                </div>
                <button
                  onClick={() => toggleConnection(sourceKey)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${
                    item.connected 
                      ? "bg-emerald-50 text-emerald-600 hover:bg-red-50 hover:text-red-600 group"
                      : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600"
                  }`}
                >
                  {item.connected ? (
                    <>
                      <Link size={12} className="group-hover:hidden" />
                      <Unlink size={12} className="hidden group-hover:block" />
                      <span className="group-hover:hidden">Active</span>
                      <span className="hidden group-hover:inline">Disconnect</span>
                    </>
                  ) : (
                    <>
                      <Link size={12} />
                      <span>Connect</span>
                    </>
                  )}
                </button>
              </div>
              
              <h3 className="font-semibold text-slate-800 text-sm">
                {getSourceLabel(key)}
              </h3>
              
              <div className="mt-4 flex justify-between items-center text-xs text-slate-400">
                <span>Last Synced: {item.lastSynced}</span>
                {item.count > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold">
                    {item.count} new
                  </span>
                )}
              </div>

              {item.connected && item.count > 0 && (
                <button
                  onClick={() => triggerSync(sourceKey)}
                  disabled={syncing !== null}
                  className="mt-3 w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={12} className={syncing === sourceKey ? "animate-spin" : ""} />
                  Sync {item.count} Tasks
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Simulation form */}
      <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
          <Clock size={16} className="text-indigo-500" />
          Integration Sandbox Simulator
        </h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          simulate working with team members or having tasks assigned to you on your other workspaces (Jira backlog, Slack actions, or Calendar events). Add them here to watch the system catch deadlines!
        </p>

        <form onSubmit={addSimulatedExternalTask} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <input
              type="text"
              placeholder="e.g. Code Review: Merge Pull Request #402"
              value={newFakeTitle}
              onChange={(e) => setNewFakeTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="md:col-span-4">
            <select
              value={newFakeSource}
              onChange={(e) => setNewFakeSource(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="google_calendar">Google Calendar Event</option>
              <option value="jira">Jira Sprint Ticket</option>
              <option value="trello">Trello Board Card</option>
              <option value="notion">Notion Database Row</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-950 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={15} />
              Assign Externally
            </button>
          </div>
        </form>

        {/* List of currently waiting external tasks */}
        <div className="mt-5 pt-4 border-t border-slate-200/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pending External Workspace Backlog
            </span>
            <span className="text-xs text-slate-500">
              {externalTasks.filter(t => !t.synced).length} unsynced items
            </span>
          </div>
          
          <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {externalTasks.map(item => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg shadow-2xs hover:border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {getSourceIcon(item.source, 16)}
                  <span className={`text-xs font-medium ${item.synced ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {item.title}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Due: {item.dueDate}
                  </span>
                  {item.synced ? (
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <CheckCircle2 size={10} />
                      Synced
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <AlertCircle size={10} />
                      Unsynced
                    </span>
                  )}
                </div>
              </div>
            ))}
            {externalTasks.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-3">No pending tasks in the connected workspaces.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
