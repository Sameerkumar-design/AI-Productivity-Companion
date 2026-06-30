import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Flame, 
  Coffee, 
  Compass, 
  TrendingUp, 
  History,
  Trash2,
  CheckCircle2,
  Plus
} from "lucide-react";
import { PomodoroSession, Task } from "../types";
import { addDocument, deleteDocument } from "../lib/firebase";
import DailyFocusTrends from "./DailyFocusTrends";

interface PomodoroTimerProps {
  tasks: Task[];
  sessions: PomodoroSession[];
  onSessionsChange: (sessions: PomodoroSession[]) => void;
}

export default function PomodoroTimer({ tasks, sessions, onSessionsChange }: PomodoroTimerProps) {
  // Timer settings
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'short_break' | 'long_break'>('focus');
  const [selectedTaskId, setSelectedTaskId] = useState("");

  // Sound Synth settings
  const [soundType, setSoundType] = useState<'none' | 'binaural' | 'waves' | 'rain'>('none');
  const [volume, setVolume] = useState(0.4);

  // Audio Context Ref for Web Audio Synth
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<any[]>([]); // holds oscillators/gain nodes

  // Timer logic
  useEffect(() => {
    let interval: any = null;

    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            handleTimerComplete();
            clearInterval(interval);
          } else {
            setMinutes(prev => prev - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(prev => prev - 1);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isActive, minutes, seconds]);

  // Handle switching presets
  const setPreset = (type: 'focus' | 'short_break' | 'long_break') => {
    setIsActive(false);
    setMode(type);
    setSeconds(0);
    if (type === 'focus') setMinutes(25);
    else if (type === 'short_break') setMinutes(5);
    else if (type === 'long_break') setMinutes(15);
  };

  // Timer completion
  const handleTimerComplete = async () => {
    setIsActive(false);
    stopSynth();

    // Trigger basic audio ding
    playSuccessChime();

    if (mode === 'focus') {
      const selectedTask = tasks.find(t => t.id === selectedTaskId);
      const sessionMinutes = 25; // hardcoded base focus

      const newSession: Omit<PomodoroSession, 'id'> = {
        duration: sessionMinutes,
        timestamp: new Date().toISOString(),
        taskId: selectedTaskId || undefined,
        taskTitle: selectedTask ? selectedTask.title : "General Focus Session"
      };

      const docId = await addDocument("pomodoro_sessions", newSession);
      onSessionsChange([{ ...newSession, id: docId }, ...sessions]);
      
      alert(`🎉 Focus session complete! Time for a well-deserved short break.`);
      setPreset('short_break');
    } else {
      alert(`⏱️ Break complete! Ready to slide back into focus?`);
      setPreset('focus');
    }
  };

  const toggleTimer = () => {
    if (!isActive) {
      setIsActive(true);
      startSynth();
    } else {
      setIsActive(false);
      stopSynth();
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    stopSynth();
    setPreset(mode);
  };

  // ------------------ WEB AUDIO API SYNTHESIZER ------------------

  const initAudioCtx = () => {
    if (!audioCtxRef.current) {
      // Create new audio context
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const startSynth = () => {
    if (soundType === 'none') {
      stopSynth();
      return;
    }

    try {
      initAudioCtx();
      stopSynth(); // clear any running synth nodes

      const ctx = audioCtxRef.current!;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      synthNodesRef.current.push(masterGain);

      if (soundType === 'binaural') {
        // Binaural focus beats: 100Hz and 104Hz oscillators -> theta wave 4Hz
        const oscLeft = ctx.createOscillator();
        const oscRight = ctx.createOscillator();
        const pannerLeft = ctx.createStereoPanner();
        const pannerRight = ctx.createStereoPanner();

        oscLeft.frequency.value = 110;
        oscRight.frequency.value = 114;

        pannerLeft.pan.value = -1; // far left
        pannerRight.pan.value = 1; // far right

        oscLeft.connect(pannerLeft).connect(masterGain);
        oscRight.connect(pannerRight).connect(masterGain);

        oscLeft.start();
        oscRight.start();

        synthNodesRef.current.push(oscLeft, oscRight);
      } else if (soundType === 'waves') {
        // Simulate soft rolling waves using custom White Noise filter sweeps
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 1;

        whiteNoise.connect(filter).connect(masterGain);
        whiteNoise.start();

        // Wave modulator sweep using a low-frequency oscillator
        const waveOsc = ctx.createOscillator();
        const waveGain = ctx.createGain();
        waveOsc.frequency.value = 0.12; // 12-second wave periods
        waveGain.gain.value = 350; // frequency sweep range
        
        // Offset frequency to rest around 400Hz
        filter.frequency.setValueAtTime(500, ctx.currentTime);

        waveOsc.connect(waveGain).connect(filter.frequency);
        waveOsc.start();

        synthNodesRef.current.push(whiteNoise, filter, waveOsc, waveGain);
      } else if (soundType === 'rain') {
        // Soft Pink/Brown Noise hum simulation for deep rain focus
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          // Pink noise filter coefficient approximation
          output[i] = (lastOut * 0.95 + white * 0.05);
          lastOut = output[i];
        }

        const pinkNoise = ctx.createBufferSource();
        pinkNoise.buffer = noiseBuffer;
        pinkNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 450; // dampen high squeaks

        pinkNoise.connect(filter).connect(masterGain);
        pinkNoise.start();

        synthNodesRef.current.push(pinkNoise, filter);
      }

    } catch (e) {
      console.warn("Audio Synthesizer initialization failed:", e);
    }
  };

  const stopSynth = () => {
    synthNodesRef.current.forEach(node => {
      try {
        node.stop();
      } catch (e) {}
      try {
        node.disconnect();
      } catch (e) {}
    });
    synthNodesRef.current = [];
  };

  // Simple pure-frequency chime for completion
  const playSuccessChime = () => {
    try {
      initAudioCtx();
      const ctx = audioCtxRef.current!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 note
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5 note
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5 note

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  };

  // Trigger synth sound switches dynamically
  useEffect(() => {
    if (isActive) {
      startSynth();
    } else {
      stopSynth();
    }
    return () => stopSynth();
  }, [soundType, volume]);

  const handleDeleteSession = async (id: string) => {
    await deleteDocument("pomodoro_sessions", id);
    onSessionsChange(sessions.filter(s => s.id !== id));
  };

  // Helper formatting numbers
  const formatTime = (val: number) => String(val).padStart(2, '0');

  // Sum total productive minutes
  const totalProductiveMinutes = sessions.reduce((acc, curr) => acc + curr.duration, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: The Clock Interface (7 columns) */}
      <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center">
        
        {/* Preset Buttons */}
        <div className="flex gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-2xl mb-8 w-full max-w-md justify-between">
          <button
            onClick={() => setPreset('focus')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              mode === 'focus' 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "text-slate-600 hover:bg-slate-100/60"
            }`}
          >
            <Flame size={14} />
            Focus Hour
          </button>
          <button
            onClick={() => setPreset('short_break')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              mode === 'short_break' 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "text-slate-600 hover:bg-slate-100/60"
            }`}
          >
            <Coffee size={14} />
            Short Break
          </button>
          <button
            onClick={() => setPreset('long_break')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              mode === 'long_break' 
                ? "bg-teal-600 text-white shadow-sm" 
                : "text-slate-600 hover:bg-slate-100/60"
            }`}
          >
            <Compass size={14} />
            Long Break
          </button>
        </div>

        {/* Circular Display */}
        <div className="relative flex items-center justify-center w-64 h-64 rounded-full border-4 border-slate-50 shadow-inner bg-slate-50/20 mb-8 select-none">
          {/* Animated pulsing glow during focus */}
          {isActive && (
            <div className={`absolute inset-2 rounded-full filter blur-xl opacity-10 animate-pulse ${
              mode === 'focus' ? 'bg-indigo-500' : 'bg-emerald-500'
            }`}></div>
          )}

          <div className="text-center z-10">
            <span className="text-5xl font-mono font-black text-slate-800 tracking-tight">
              {formatTime(minutes)}:{formatTime(seconds)}
            </span>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1.5">
              {mode === 'focus' ? 'In Focus Mode' : 'On Break'}
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={resetTimer}
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 text-slate-600 rounded-full transition-all"
            title="Reset Pomodoro"
          >
            <RotateCcw size={18} />
          </button>
          
          <button
            onClick={toggleTimer}
            className={`p-5 text-white rounded-full transition-transform hover:scale-105 shadow-md flex items-center justify-center ${
              mode === 'focus' 
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' 
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
            }`}
          >
            {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
          </button>

          <div className="w-11"></div> {/* Balancing spacer */}
        </div>

        {/* Associated Task selector */}
        {mode === 'focus' && (
          <div className="w-full max-w-sm border-t border-slate-50 pt-6">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Associate Active Session with Task
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600"
            >
              <option value="">No task selected (General Focus)</option>
              {tasks.filter(t => !t.completed).map(task => (
                <option key={task.id} value={task.id}>{task.title}</option>
              ))}
            </select>
          </div>
        )}

      </div>

      {/* RIGHT COLUMN: Focus Ambient Synthesizer & Focus Logs (5 columns) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* SYNTHESIZER PANEL */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
            <Volume2 className="text-indigo-500" size={17} />
            Binaural & Focus Synthesizer
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            Activate clinical-grade neural binaural tones, coastal waves, or pink rain to silence surrounding distraction natively.
          </p>

          <div className="space-y-3">
            {[
              { id: 'none', label: '🔇 No Background Sound' },
              { id: 'binaural', label: '🧘 Binaural Beats (4Hz Theta waves)' },
              { id: 'waves', label: '🌊 Rolling Ocean Waves' },
              { id: 'rain', label: '🌧️ Static Warm Rain Hum' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setSoundType(item.id as any)}
                className={`w-full py-2.5 px-4 text-left rounded-xl border text-xs font-semibold transition-all ${
                  soundType === item.id 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Volume control */}
          {soundType !== 'none' && (
            <div className="mt-5 pt-4 border-t border-slate-50">
              <div className="flex justify-between items-center text-xs mb-1.5 text-slate-500 font-medium">
                <span>Ambient Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <VolumeX size={14} className="text-slate-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <Volume2 size={14} className="text-indigo-500" />
              </div>
            </div>
          )}
        </div>

        {/* FOCUS ANALYTICS LOGS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <History className="text-slate-500" size={17} />
              Session Focus Logs
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <TrendingUp size={10} />
              {totalProductiveMinutes} mins total
            </span>
          </div>

          {/* History scroll list */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
            {sessions.map(session => (
              <div 
                key={session.id} 
                className="flex items-center justify-between p-2.5 bg-slate-50/60 border border-slate-100 rounded-xl"
              >
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-slate-800 truncate">
                    {session.taskTitle || "General Focus Session"}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {session.duration} mins focus
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="p-1 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">Your focus logs are empty. Start the timer to lock in records!</p>
            )}
          </div>
        </div>

      </div>

      </div>

      <DailyFocusTrends sessions={sessions} />
    </div>
  );
}
