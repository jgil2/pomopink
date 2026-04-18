export interface PomodoroSession {
  timestamp: number;
  durationMinutes: number;
}

const KEY = "pomo-sessions";

export function loadSessions(): PomodoroSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordSession(durationMinutes: number) {
  const sessions = loadSessions();
  sessions.push({ timestamp: Date.now(), durationMinutes });
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff).getTime();
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1).getTime();
}

export type Range = "day" | "week" | "month" | "year" | "alltime";

export function filterSessions(sessions: PomodoroSession[], range: Range) {
  const now = new Date();
  let from = 0;
  if (range === "day") from = startOfDay(now);
  else if (range === "week") from = startOfWeek(now);
  else if (range === "month") from = startOfMonth(now);
  else if (range === "year") from = startOfYear(now);
  return sessions.filter((s) => s.timestamp >= from);
}

export function countToday(sessions: PomodoroSession[]) {
  const from = startOfDay(new Date());
  return sessions.filter((s) => s.timestamp >= from).length;
}

export function totalMinutes(sessions: PomodoroSession[]) {
  return sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
}

export interface ChartPoint {
  label: string;
  sessions: number;
  hours: number;
}

export function buildChartData(sessions: PomodoroSession[], range: Range): ChartPoint[] {
  const now = new Date();

  if (range === "day") {
    const points: ChartPoint[] = Array.from({ length: 24 }, (_, h) => {
      const label = h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
      return { label, sessions: 0, hours: 0 };
    });
    const from = startOfDay(now);
    sessions.filter((s) => s.timestamp >= from).forEach((s) => {
      const h = new Date(s.timestamp).getHours();
      points[h].sessions += 1;
      points[h].hours = Math.round((points[h].hours + s.durationMinutes / 60) * 100) / 100;
    });
    return points;
  }

  if (range === "week") {
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const points: ChartPoint[] = dayNames.map((label) => ({ label, sessions: 0, hours: 0 }));
    const from = startOfWeek(now);
    sessions.filter((s) => s.timestamp >= from).forEach((s) => {
      const d = new Date(s.timestamp).getDay();
      const idx = d === 0 ? 6 : d - 1;
      points[idx].sessions += 1;
      points[idx].hours = Math.round((points[idx].hours + s.durationMinutes / 60) * 100) / 100;
    });
    return points;
  }

  if (range === "month") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const points: ChartPoint[] = Array.from({ length: daysInMonth }, (_, i) => ({
      label: String(i + 1),
      sessions: 0,
      hours: 0,
    }));
    const from = startOfMonth(now);
    sessions.filter((s) => s.timestamp >= from).forEach((s) => {
      const d = new Date(s.timestamp).getDate() - 1;
      points[d].sessions += 1;
      points[d].hours = Math.round((points[d].hours + s.durationMinutes / 60) * 100) / 100;
    });
    return points;
  }

  if (range === "year") {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const points: ChartPoint[] = monthNames.map((label) => ({ label, sessions: 0, hours: 0 }));
    const from = startOfYear(now);
    sessions.filter((s) => s.timestamp >= from).forEach((s) => {
      const m = new Date(s.timestamp).getMonth();
      points[m].sessions += 1;
      points[m].hours = Math.round((points[m].hours + s.durationMinutes / 60) * 100) / 100;
    });
    return points;
  }

  // alltime: group by month, last 24 months
  const points: ChartPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
    points.push({ label, sessions: 0, hours: 0 });
  }
  sessions.forEach((s) => {
    const sd = new Date(s.timestamp);
    const monthsAgo =
      (now.getFullYear() - sd.getFullYear()) * 12 + (now.getMonth() - sd.getMonth());
    if (monthsAgo >= 0 && monthsAgo < 24) {
      const idx = 23 - monthsAgo;
      points[idx].sessions += 1;
      points[idx].hours = Math.round((points[idx].hours + s.durationMinutes / 60) * 100) / 100;
    }
  });
  return points;
}
