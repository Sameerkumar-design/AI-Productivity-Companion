import React from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";
import { PomodoroSession } from "../types";
import { TrendingUp, Award, Calendar } from "lucide-react";

interface DailyFocusTrendsProps {
  sessions: PomodoroSession[];
}

export default function DailyFocusTrends({ sessions }: DailyFocusTrendsProps) {
  // Generate the last 7 days in chronological order
  const chartData = React.useMemo(() => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      // We will match based on local date string (YYYY-MM-DD)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;
      
      const label = date.toLocaleDateString(undefined, { weekday: "short" }); // e.g. "Mon"
      const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" }); // e.g. "Jun 30"
      
      // Filter sessions that occurred on this specific local date
      const daySessions = sessions.filter(session => {
        if (!session.timestamp) return false;
        try {
          const sDate = new Date(session.timestamp);
          const sYear = sDate.getFullYear();
          const sMonth = String(sDate.getMonth() + 1).padStart(2, "0");
          const sDay = String(sDate.getDate()).padStart(2, "0");
          return `${sYear}-${sMonth}-${sDay}` === dateKey;
        } catch (e) {
          return false;
        }
      });
      
      const sessionCount = daySessions.length;
      const totalMinutes = daySessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      
      days.push({
        dateKey,
        label,
        dateStr,
        sessions: sessionCount,
        minutes: totalMinutes,
      });
    }
    
    return days;
  }, [sessions]);

  // Calculations for stats
  const totalSessionsLast7Days = chartData.reduce((acc, curr) => acc + curr.sessions, 0);
  const totalMinutesLast7Days = chartData.reduce((acc, curr) => acc + curr.minutes, 0);
  const avgSessionsPerDay = (totalSessionsLast7Days / 7).toFixed(1);
  const mostActiveDay = [...chartData].sort((a, b) => b.sessions - a.sessions)[0];

  return (
    <div id="daily-focus-trends" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      
      {/* Header with quick stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-50 pb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="text-indigo-600" size={17} />
            Daily Focus Trends
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Visualizing Pomodoro sessions completed over the last 7 days
          </p>
        </div>
        
        {/* Quick metrics */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-slate-50/60 border border-slate-100 px-3 py-1.5 rounded-xl text-center min-w-[75px]">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Completed</span>
            <span className="text-sm font-bold text-slate-800">{totalSessionsLast7Days} {totalSessionsLast7Days === 1 ? 'session' : 'sessions'}</span>
          </div>
          <div className="bg-indigo-50/40 border border-indigo-50/80 px-3 py-1.5 rounded-xl text-center min-w-[75px]">
            <span className="text-[10px] font-bold text-indigo-500/70 block uppercase tracking-wider">Focus Time</span>
            <span className="text-sm font-bold text-indigo-600">{totalMinutesLast7Days} mins</span>
          </div>
          <div className="bg-slate-50/60 border border-slate-100 px-3 py-1.5 rounded-xl text-center min-w-[75px]">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Daily Avg</span>
            <span className="text-sm font-bold text-slate-800">{avgSessionsPerDay}</span>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="relative w-full h-[260px] mb-4">
        {totalSessionsLast7Days === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px] rounded-xl text-center p-4">
            <Calendar className="text-slate-300 mb-2 animate-bounce" size={28} />
            <p className="text-xs font-semibold text-slate-600">No sessions recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Your 7-day visualization trend will populate as you complete focus segments.</p>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl shadow-md text-white">
                      <p className="text-[10px] font-bold text-slate-400">{data.dateStr}</p>
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          Sessions: <span className="font-bold text-white">{data.sessions}</span>
                        </p>
                        <p className="text-[10px] text-slate-300 pl-2.5">
                          Duration: {data.minutes} mins
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="sessions"
              stroke="#4f46e5"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorSessions)"
              activeDot={{ r: 5, strokeWidth: 0, fill: "#4f46e5" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Insight */}
      {totalSessionsLast7Days > 0 && mostActiveDay && mostActiveDay.sessions > 0 && (
        <div className="flex items-center gap-2 bg-indigo-50/30 border border-indigo-50/50 p-3 rounded-xl">
          <Award size={15} className="text-indigo-600 shrink-0" />
          <p className="text-[11px] text-indigo-700/90 leading-relaxed">
            Nice work! Your most active day was <span className="font-bold">{mostActiveDay.dateStr}</span> with <span className="font-bold">{mostActiveDay.sessions} focus {mostActiveDay.sessions === 1 ? 'session' : 'sessions'}</span>. Keep up the high cognitive momentum!
          </p>
        </div>
      )}
    </div>
  );
}
