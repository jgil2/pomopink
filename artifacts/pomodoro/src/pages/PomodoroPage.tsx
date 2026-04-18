import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TimerCircle } from "@/components/TimerCircle";
import { Character } from "@/components/Character";
import { SettingsModal } from "@/components/SettingsModal";
import { recordSession, loadSessions, countToday } from "@/lib/pomodoroStorage";

interface Settings {
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
}

const DEFAULT_SETTINGS: Settings = {
  workMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
};

type Phase = "work" | "break" | "longBreak";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function phaseLabel(phase: Phase) {
  if (phase === "work") return "Focus Time";
  if (phase === "break") return "Short Break";
  return "Long Break";
}

function phaseEmoji(phase: Phase) {
  if (phase === "work") return "🍅";
  if (phase === "break") return "☕";
  return "🌙";
}

function phaseFinishedMessage(phase: Phase) {
  if (phase === "work") return "Focus session done! Time for a break 🌸";
  if (phase === "break") return "Break's over! Back to focusing 🍅";
  return "Long break done! Ready to focus again 🍅";
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function loadState() {
  try {
    const today = todayStr();
    const cycleDate = localStorage.getItem("pomo-cycle-date");
    const cycleCount = cycleDate === today
      ? Number(localStorage.getItem("pomo-cycle-count") || "0")
      : 0;
    return {
      settings: (() => {
        const s = localStorage.getItem("pomo-settings");
        return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
      })(),
      dark: localStorage.getItem("pomo-dark") === "true",
      phase: (localStorage.getItem("pomo-phase") as Phase) || "work",
      cycleCount,
      endTime: Number(localStorage.getItem("pomo-end-time") || "0") || null,
      wasRunning: localStorage.getItem("pomo-running") === "true",
    };
  } catch {
    return {
      settings: DEFAULT_SETTINGS,
      dark: false,
      phase: "work" as Phase,
      cycleCount: 0,
      endTime: null as number | null,
      wasRunning: false,
    };
  }
}

function getTotalSeconds(phase: Phase, settings: Settings) {
  if (phase === "work") return settings.workMinutes * 60;
  if (phase === "break") return settings.breakMinutes * 60;
  return settings.longBreakMinutes * 60;
}

async function requestNotificationPermission() {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch (e) {
    console.error("Notification permission error", e);
    return false;
  }
}

async function scheduleTimerNotification(endTimeMs: number, phase: Phase) {
  // Always clear existing notifications first to prevent duplicates
  await cancelTimerNotification();

  await LocalNotifications.schedule({
    notifications: [
      {
        id: 1, // We use ID 1 so we can easily find and cancel it later
        title: "Pomopink ✨",
        body: phaseFinishedMessage(phase),
        schedule: { at: new Date(endTimeMs) },
        sound: null, // Uses default iOS notification sound
      }
    ]
  });
}

// 3. Cancel the Notification
async function cancelTimerNotification() {
  await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
}

export default function PomodoroPage() {
  const loaded = useRef(loadState());
  const init = loaded.current;

  const [settings, setSettings] = useState<Settings>(init.settings);
  const [dark, setDark] = useState(init.dark);
  const [phase, setPhase] = useState<Phase>(init.phase);
  const [cycleCount, setCycleCount] = useState(init.cycleCount);
  const [completedPomodoros, setCompletedPomodoros] = useState(() => countToday(loadSessions()));
  const [justFinished, setJustFinished] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifDenied, setNotifDenied] = useState(false);
  const [, setLocation] = useLocation();

  // endTime: the absolute timestamp when the current session ends (null = paused/stopped)
  const [endTime, setEndTime] = useState<number | null>(init.wasRunning ? init.endTime : null);

  // secondsLeft derived from endTime; initialised to whatever remains
  const getSecondsLeft = useCallback(
    (et: number | null, ph: Phase, sett: Settings) => {
      if (et === null) return getTotalSeconds(ph, sett);
      const remaining = Math.ceil((et - Date.now()) / 1000);
      return Math.max(0, Math.min(remaining, getTotalSeconds(ph, sett)));
    },
    []
  );

  const [secondsLeft, setSecondsLeft] = useState(() =>
    getSecondsLeft(init.wasRunning ? init.endTime : null, init.phase, init.settings)
  );

  const isRunning = endTime !== null;
  const totalSeconds = getTotalSeconds(phase, settings);
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const isBreak = phase !== "work";

  // Persist relevant state whenever it changes
  useEffect(() => {
    localStorage.setItem("pomo-phase", phase);
  }, [phase]);
  useEffect(() => {
    localStorage.setItem("pomo-cycle-count", String(cycleCount));
    localStorage.setItem("pomo-cycle-date", todayStr());
  }, [cycleCount]);
  useEffect(() => {
    if (endTime !== null) {
      localStorage.setItem("pomo-end-time", String(endTime));
      localStorage.setItem("pomo-running", "true");
    } else {
      localStorage.removeItem("pomo-end-time");
      localStorage.setItem("pomo-running", "false");
    }
  }, [endTime]);

  // Tab title
  useEffect(() => {
    document.title = `${formatTime(secondsLeft)} - ${phaseLabel(phase)} | Pomopink`;
  }, [secondsLeft, phase]);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("pomo-dark", String(dark));
  }, [dark]);

  const advancePhase = useCallback(
    (finishedPhase: Phase, currentCycle: number, currentSettings: Settings) => {
      setJustFinished(true);
      setTimeout(() => setJustFinished(false), 2500);

      if (finishedPhase === "work") {
        const newCycle = currentCycle + 1;
        recordSession(currentSettings.workMinutes);
        setCompletedPomodoros((p) => p + 1);
        if (newCycle >= currentSettings.cyclesBeforeLongBreak) {
          setCycleCount(0);
          setPhase("longBreak");
          setSecondsLeft(currentSettings.longBreakMinutes * 60);
        } else {
          setCycleCount(newCycle);
          setPhase("break");
          setSecondsLeft(currentSettings.breakMinutes * 60);
        }
      } else {
        setPhase("work");
        setSecondsLeft(currentSettings.workMinutes * 60);
      }
      setEndTime(null);
    },
    []
  );

  // Main tick: poll every 300ms using real clock
  useEffect(() => {
    if (!isRunning || endTime === null) return;

    const tick = () => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setSecondsLeft(0);
        // Capture current values to avoid stale closure issues
        setPhase((ph) => {
          setCycleCount((cc) => {
            setCompletedPomodoros((comp) => {
              setSettings((sett) => {
                advancePhase(ph, cc, sett);
                return sett;
              });
              return comp;
            });
            return cc;
          });
          return ph;
        });
      } else {
        setSecondsLeft(remaining);
      }
    };

    tick(); // immediate sync
    const interval = setInterval(tick, 300);

    // Sync immediately when page regains focus
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    
    // This catches the exact millisecond the iPhone brings the app back to the screen
    let appStateListener: any;
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        tick(); // Force a sync so the user never sees a lagging visual
      }
    }).then(listener => {
      appStateListener = listener;
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [isRunning, endTime, advancePhase]);

  const handlePlayPause = async () => {
    await requestNotificationPermission();
    if (isRunning) {
      // Pause: freeze secondsLeft, clear end time, CANCEL notification
      setEndTime(null);
      cancelTimerNotification();
    } else {
      // Resume/start: set end time, SCHEDULE notification
      const newEndTime = Date.now() + secondsLeft * 1000;
      setEndTime(newEndTime);
      scheduleTimerNotification(newEndTime, phase);
    }
  };

  const handleReset = () => {
    setEndTime(null);
    setSecondsLeft(totalSeconds);
    setJustFinished(false);
    cancelTimerNotification();
  };

  const handleSkip = () => {
    setEndTime(null);
    cancelTimerNotification();
    advancePhase(phase, cycleCount, settings);
  };

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem("pomo-settings", JSON.stringify(newSettings));
    setEndTime(null);
    setPhase("work");
    setSecondsLeft(newSettings.workMinutes * 60);
    setCycleCount(0);
    setShowSettings(false);
  };

  const dots = Array.from({ length: settings.cyclesBeforeLongBreak }, (_, i) => i < cycleCount);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{
        background: dark
          ? 'radial-gradient(ellipse at 30% 20%, hsl(270 30% 18%) 0%, hsl(270 30% 10%) 100%)'
          : 'radial-gradient(ellipse at 30% 20%, hsl(340 70% 95%) 0%, hsl(280 60% 95%) 100%)',
        transition: 'background 0.5s ease',
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute text-6xl opacity-10 top-10 left-10 float" style={{ animationDelay: '0s' }}>🌸</div>
        <div className="absolute text-5xl opacity-10 top-20 right-16 float" style={{ animationDelay: '1s' }}>🌷</div>
        <div className="absolute text-4xl opacity-10 bottom-20 left-20 float" style={{ animationDelay: '0.5s' }}>💜</div>
        <div className="absolute text-5xl opacity-10 bottom-10 right-10 float" style={{ animationDelay: '1.5s' }}>🌺</div>
        <div className="absolute text-3xl opacity-10 top-1/2 left-5 float" style={{ animationDelay: '2s' }}>⭐</div>
        <div className="absolute text-3xl opacity-10 top-1/3 right-5 float" style={{ animationDelay: '0.8s' }}>🌙</div>
      </div>

      <header className="w-full max-w-sm flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl" style={{ color: 'hsl(var(--primary))' }}>
          pomopink
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDark(!dark)}
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-lg hover:scale-110 transition-transform"
            aria-label="Toggle dark mode"
          >
            {dark ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-lg hover:scale-110 transition-transform"
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {notifDenied && (
        <div
          className="w-full max-w-sm mb-4 px-4 py-2 rounded-2xl text-xs font-bold text-center"
          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
        >
          Enable notifications in browser settings to get alerts when sessions end 🔔
        </div>
      )}

      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex gap-2">
          {(["work", "break", "longBreak"] as Phase[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setEndTime(null);
                setPhase(p);
                setSecondsLeft(getTotalSeconds(p, settings));
              }}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: phase === p ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                color: phase === p ? 'white' : 'hsl(var(--muted-foreground))',
                transform: phase === p ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {phaseEmoji(p)} {phaseLabel(p)}
            </button>
          ))}
        </div>

        <div className="glass rounded-3xl p-8 flex flex-col items-center gap-4 shadow-xl w-full">
          <TimerCircle progress={progress} isBreak={isBreak} isRunning={isRunning}>
            <div className="flex flex-col items-center gap-1">
              <Character isRunning={isRunning} isBreak={isBreak} timeUp={justFinished} />
              <div
                className="text-4xl font-black tabular-nums tracking-tight"
                style={{
                  color: `hsl(${isBreak ? 'var(--secondary)' : 'var(--primary)'})`,
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                {formatTime(secondsLeft)}
              </div>
            </div>
          </TimerCircle>

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleReset}
              className="w-11 h-11 rounded-full glass flex items-center justify-center text-lg hover:scale-110 active:scale-95 transition-transform"
              aria-label="Reset"
            >
              🔄
            </button>
            <button
              onClick={handlePlayPause}
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
              style={{
                background: `hsl(${isBreak ? 'var(--secondary)' : 'var(--primary)'})`,
                color: 'white',
                boxShadow: `0 8px 24px hsl(${isBreak ? 'var(--secondary)' : 'var(--primary)'} / 0.4)`,
              }}
              aria-label={isRunning ? "Pause" : "Start"}
            >
              {isRunning ? "⏸" : "▶"}
            </button>
            <button
              onClick={handleSkip}
              className="w-11 h-11 rounded-full glass flex items-center justify-center text-lg hover:scale-110 active:scale-95 transition-transform"
              aria-label="Skip"
            >
              ⏭
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">Round</span>
            <div className="flex gap-1.5">
              {dots.map((done, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full transition-all duration-300"
                  style={{
                    background: done ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                    transform: done ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: done ? '0 0 6px hsl(var(--primary) / 0.5)' : 'none',
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-muted-foreground">/ Long break</span>
          </div>

          <button
            onClick={() => setLocation("/stats")}
            className="glass rounded-2xl px-5 py-3 flex items-center gap-4 text-sm font-bold w-full justify-center hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
            style={{ border: "none", background: undefined }}
            aria-label="View stats"
          >
            <span>🍅 {completedPomodoros} pomodoro{completedPomodoros !== 1 ? 's' : ''} today</span>
            {completedPomodoros >= 4 && <span>🎊 great job!</span>}
            <span style={{ opacity: 0.5, fontSize: 11, marginLeft: "auto" }}>stats →</span>
          </button>
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
