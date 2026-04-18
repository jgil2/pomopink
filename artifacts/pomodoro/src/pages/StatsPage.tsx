import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  loadSessions,
  filterSessions,
  totalMinutes,
  buildChartData,
  type Range,
} from "@/lib/pomodoroStorage";

const RANGES: { key: Range; label: string }[] = [
  { key: "day", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "alltime", label: "All Time" },
];

function formatHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function useDark() {
  return localStorage.getItem("pomo-dark") === "true";
}

const CustomTooltip = ({ active, payload, label, dark }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: dark ? "hsl(270 30% 18%)" : "white",
        border: `1px solid hsl(340 60% 85%)`,
        borderRadius: 12,
        padding: "8px 14px",
        fontSize: 12,
        fontFamily: "Nunito, sans-serif",
        fontWeight: 700,
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      }}
    >
      <p style={{ color: dark ? "hsl(340 60% 80%)" : "hsl(340 50% 50%)", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.dataKey === "hours" ? `${p.value}h` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function StatsPage() {
  const [, setLocation] = useLocation();
  const [range, setRange] = useState<Range>("week");
  const dark = useDark();

  const allSessions = useMemo(() => loadSessions(), []);
  const filtered = useMemo(() => filterSessions(allSessions, range), [allSessions, range]);
  const chartData = useMemo(() => buildChartData(allSessions, range), [allSessions, range]);

  const sessionCount = filtered.length;
  const mins = totalMinutes(filtered);

  const primaryColor = "hsl(340 70% 65%)";
  const secondaryColor = "hsl(270 50% 65%)";
  const mutedBg = dark ? "hsl(270 25% 20%)" : "hsl(340 60% 97%)";
  const cardBg = dark ? "hsl(270 25% 16%)" : "rgba(255,255,255,0.7)";
  const textColor = dark ? "hsl(340 40% 85%)" : "hsl(340 30% 35%)";
  const mutedText = dark ? "hsl(270 20% 60%)" : "hsl(270 20% 55%)";
  const gridColor = dark ? "hsl(270 20% 25%)" : "hsl(340 30% 90%)";
  const axisColor = dark ? "hsl(270 20% 50%)" : "hsl(270 20% 60%)";

  // Determine how many ticks to show based on data length
  const tickCount = chartData.length > 12 ? Math.ceil(chartData.length / 4) : undefined;
  const xTickFormatter = tickCount
    ? (_: string, i: number) => (i % tickCount === 0 ? chartData[i]?.label ?? "" : "")
    : undefined;

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{
        background: dark
          ? "radial-gradient(ellipse at 30% 20%, hsl(270 30% 18%) 0%, hsl(270 30% 10%) 100%)"
          : "radial-gradient(ellipse at 30% 20%, hsl(340 70% 95%) 0%, hsl(280 60% 95%) 100%)",
        fontFamily: "Nunito, sans-serif",
        color: textColor,
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setLocation("/")}
            style={{
              background: mutedBg,
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 18,
              flexShrink: 0,
            }}
            aria-label="Back"
          >
            ←
          </button>
          <h1
            style={{
              fontFamily: "Pacifico, cursive",
              fontSize: 28,
              color: primaryColor,
              margin: 0,
            }}
          >
            stats ✨
          </h1>
        </header>

        {/* Range tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
            background: mutedBg,
            borderRadius: 999,
            padding: 4,
          }}
        >
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 13,
                transition: "all 0.2s",
                background: range === key ? primaryColor : "transparent",
                color: range === key ? "white" : mutedText,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          <div
            style={{
              background: cardBg,
              borderRadius: 20,
              padding: "18px 20px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 4 }}>🍅</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: primaryColor, lineHeight: 1 }}>
              {sessionCount}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: mutedText, marginTop: 4 }}>
              pomodoros
            </div>
          </div>
          <div
            style={{
              background: cardBg,
              borderRadius: 20,
              padding: "18px 20px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 4 }}>⏱️</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: secondaryColor, lineHeight: 1 }}>
              {formatHours(mins)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: mutedText, marginTop: 4 }}>
              focused
            </div>
          </div>
        </div>

        {/* Sessions chart */}
        <div
          style={{
            background: cardBg,
            borderRadius: 20,
            padding: "20px 12px 12px",
            marginBottom: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            backdropFilter: "blur(12px)",
          }}
        >
          <h2
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              color: mutedText,
              margin: "0 0 16px 8px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            🍅 Sessions
          </h2>
          {sessionCount === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: mutedText, fontSize: 14 }}>
              No sessions yet — start your first pomodoro! 🌸
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={range === "alltime" ? 8 : 14}>
                <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontFamily: "Nunito", fill: axisColor, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={xTickFormatter}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fontFamily: "Nunito", fill: axisColor, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip content={<CustomTooltip dark={dark} />} cursor={{ fill: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", radius: 6 }} />
                <Bar dataKey="sessions" name="Sessions" fill={primaryColor} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Hours chart */}
        <div
          style={{
            background: cardBg,
            borderRadius: 20,
            padding: "20px 12px 12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            backdropFilter: "blur(12px)",
          }}
        >
          <h2
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              color: mutedText,
              margin: "0 0 16px 8px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            ⏱️ Hours focused
          </h2>
          {sessionCount === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: mutedText, fontSize: 14 }}>
              No sessions yet — start your first pomodoro! 🌸
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={range === "alltime" ? 8 : 14}>
                <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontFamily: "Nunito", fill: axisColor, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={xTickFormatter}
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: "Nunito", fill: axisColor, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip content={<CustomTooltip dark={dark} />} cursor={{ fill: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", radius: 6 }} />
                <Bar dataKey="hours" name="Hours" fill={secondaryColor} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: mutedText, marginTop: 24, fontWeight: 700 }}>
          All data is stored locally on your device 🔒
        </p>
      </div>
    </div>
  );
}
