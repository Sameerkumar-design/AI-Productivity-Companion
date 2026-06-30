import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  BookOpen, 
  Clock, 
  FileText, 
  Zap, 
  Copy, 
  Check, 
  Split,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import Markdown from "react-markdown";
import { Note } from "../types";
import { addDocument, deleteDocument, saveDocument } from "../lib/firebase";

interface SmartNotepadProps {
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
  onAddTaskExternal: (title: string, duration: number, category: string) => void;
}

export default function SmartNotepad({ notes, onNotesChange, onAddTaskExternal }: SmartNotepadProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedStatus, setSavedStatus] = useState("Saved");

  // AI states
  const [aiAction, setAiAction] = useState<'summarize' | 'refine' | 'extract-tasks'>('summarize');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  // Sync state to form when a note is selected
  useEffect(() => {
    if (selectedNote) {
      setNoteTitle(selectedNote.title);
      setNoteContent(selectedNote.content);
      setSavedStatus("Saved");
      setAiResult(null); // clear old AI results when switching
    } else {
      setNoteTitle("");
      setNoteContent("");
    }
  }, [selectedNoteId]);

  // Handle autosave
  useEffect(() => {
    if (!selectedNoteId) return;
    
    setSavedStatus("Saving...");
    const timeout = setTimeout(async () => {
      const updatedNotes = notes.map(n => {
        if (n.id === selectedNoteId) {
          return { ...n, title: noteTitle, content: noteContent, updatedAt: new Date().toISOString() };
        }
        return n;
      });
      onNotesChange(updatedNotes);
      await saveDocument("notes", selectedNoteId, { title: noteTitle, content: noteContent, updatedAt: new Date().toISOString() });
      setSavedStatus("Saved");
    }, 1000);

    return () => clearTimeout(timeout);
  }, [noteTitle, noteContent]);

  // Create Note
  const handleCreateNote = async () => {
    const newNote: Omit<Note, 'id'> = {
      title: "Untitled Snippet",
      content: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docId = await addDocument("notes", newNote);
    onNotesChange([...notes, { ...newNote, id: docId }]);
    setSelectedNoteId(docId);
  };

  // Delete Note
  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteDocument("notes", id);
    onNotesChange(notes.filter(n => n.id !== id));
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }
  };

  // Invoke Gemini AI Notepad Tool
  const handleAIAction = async () => {
    if (!noteContent.trim()) {
      alert("Please write some notes first before requesting AI enhancements!");
      return;
    }

    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/ai/notepad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent,
          action: aiAction
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data.result);
      } else {
        setAiResult("Failed to generate AI response. Please check server connections.");
      }
    } catch (e: any) {
      console.error(e);
      setAiResult("An error occurred during note refinement: " + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyResult = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract task logic helper from AI output
  // We look for bullet lines e.g. "- [ ] Task" or "- Task" and add them
  const handleAutoInsertTasks = () => {
    if (!aiResult) return;
    
    // Parse lines
    const lines = aiResult.split("\n");
    let addedCount = 0;
    
    lines.forEach(line => {
      // Look for tasks in bullets
      const cleanLine = line.replace(/^[-*+]\s+/, "").trim();
      if (cleanLine && cleanLine.length > 5 && !cleanLine.startsWith("#") && !line.includes("Return a JSON")) {
        // Simple heuristic: If line contains a length, add it as task
        const durationMatch = cleanLine.match(/(\d+)\s*(min|minute|hour)/i);
        let duration = 30;
        if (durationMatch) {
          const val = parseInt(durationMatch[1]);
          duration = cleanLine.toLowerCase().includes("hour") ? val * 60 : val;
        }

        // Clean out duration text e.g. "(30 min)"
        const cleanTitle = cleanLine.replace(/\(\d+\s*(min|minute|hour)s?\)/i, "").trim();
        onAddTaskExternal(cleanTitle.substring(0, 100), duration, "Work");
        addedCount++;
      }
    });

    alert(`Successfully identified and inserted ${addedCount} task(s) directly into your active checklist board!`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT COLUMN: Note Selector Panel (4 columns) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-md font-semibold text-slate-800 flex items-center gap-1.5">
              <FileText className="text-indigo-600" size={18} />
              My Draft Notebook
            </h2>
            <button
              onClick={handleCreateNote}
              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
              title="Add Note"
            >
              <Plus size={15} />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {notes.map(note => (
              <div
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedNoteId === note.id
                    ? "bg-indigo-50/50 border-indigo-200 text-indigo-900 shadow-xs"
                    : "bg-slate-50/50 border-slate-100 hover:border-slate-200 text-slate-700"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <h3 className="font-semibold text-xs truncate">
                    {note.title || "Untitled Note"}
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {note.content ? note.content.substring(0, 45) : "Empty content..."}
                  </p>
                  <span className="text-[9px] text-slate-400 block mt-2 font-mono">
                    Modified: {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDeleteNote(note.id, e)}
                  className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">Your notepad is empty. Create a draft above.</p>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Editor & AI Refiner Workspace (8 columns) */}
      <div className="lg:col-span-8 space-y-6">
        {selectedNoteId ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Note Editor Area (7 columns) */}
            <div className="md:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[520px]">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note Title"
                  className="font-bold text-base text-slate-800 focus:outline-none w-full border-none"
                />
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                  savedStatus === "Saved" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                }`}>
                  {savedStatus}
                </span>
              </div>

              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Start typing draft logs, scratchpads, or outline goals here... We'll handle automatic saving."
                className="w-full flex-1 resize-none bg-transparent focus:outline-none text-sm text-slate-700 leading-relaxed custom-scrollbar"
              />
            </div>

            {/* AI Refiner Sidebar Actions (5 columns) */}
            <div className="md:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[520px] overflow-hidden">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <Sparkles className="text-yellow-500 animate-pulse" size={17} />
                Gemini AI Refiner
              </h3>
              
              <div className="flex flex-col gap-2 mb-4">
                <select
                  value={aiAction}
                  onChange={(e) => setAiAction(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600 font-semibold"
                >
                  <option value="summarize">📋 Summarize Markdown</option>
                  <option value="refine">✨ Rewrite & Polish Copy</option>
                  <option value="extract-tasks">⚡ Extract Action To-Dos</option>
                </select>

                <button
                  onClick={handleAIAction}
                  disabled={aiLoading}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="animate-spin" size={13} />
                      Analyzing content...
                    </>
                  ) : (
                    <>
                      <Zap size={13} />
                      Enhance Notes
                    </>
                  )}
                </button>
              </div>

              {/* Scrollable Response Canvas */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50 border border-slate-100 rounded-xl p-4 text-xs text-slate-700 relative custom-scrollbar">
                {aiResult ? (
                  <div className="space-y-4">
                    <div className="markdown-body leading-relaxed prose prose-sm text-xs font-sans text-slate-600">
                      <Markdown>{aiResult}</Markdown>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={handleCopyResult}
                        className="flex items-center gap-1 py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold transition-colors"
                      >
                        {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        {copied ? "Copied" : "Copy"}
                      </button>

                      {aiAction === "extract-tasks" && (
                        <button
                          onClick={handleAutoInsertTasks}
                          className="flex items-center gap-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-semibold transition-colors shadow-2xs"
                        >
                          <Plus size={11} />
                          Add Checklist Items
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-4">
                    <Sparkles size={24} className="text-slate-300 mb-2 animate-bounce-slow" />
                    <p className="leading-relaxed font-sans font-medium text-[11px]">
                      Generate beautifully formatted summaries, check to-dos, or sharpen draft writing instantaneously.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 py-24 text-center">
            <BookOpen className="mx-auto text-slate-300 mb-2" size={36} />
            <h3 className="text-sm font-semibold text-slate-700">Open or Create Note Drafts</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
              Activate an existing note snippet on the left panel or click '+' to start autosaving Markdown ideas.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
