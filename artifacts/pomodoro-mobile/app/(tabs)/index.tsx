import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  StatusBar,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

type Phase = "work" | "break" | "longBreak";

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

const SETTINGS_KEY = "@pomopink_settings";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function phaseLabel(phase: Phase): string {
  if (phase === "work") return "Focus";
  if (phase === "break") return "Break";
  return "Long Break";
}

function getCharacterIcon(
  isRunning: boolean,
  isBreak: boolean,
  justFinished: boolean
): keyof typeof Ionicons.glyphMap {
  if (justFinished) return "star";
  if (isBreak) return "leaf";
  if (isRunning) return "flame";
  return "moon";
}

// Settings number picker row
function SettingRow({
  label,
  value,
  onDecrement,
  onIncrement,
  colors,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={settingsStyles.row}>
      <Text style={[settingsStyles.label, { color: colors.foreground }]}>
        {label}
      </Text>
      <View style={settingsStyles.stepper}>
        <TouchableOpacity
          onPress={onDecrement}
          style={[settingsStyles.stepBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[settingsStyles.stepValue, { color: colors.foreground }]}>
          {value}
        </Text>
        <TouchableOpacity
          onPress={onIncrement}
          style={[settingsStyles.stepBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PomodoroScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [localSettings, setLocalSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>("work");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SETTINGS.workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [justFinished, setJustFinished] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted settings
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((val) => {
      if (val) {
        try {
          const saved = { ...DEFAULT_SETTINGS, ...JSON.parse(val) };
          setSettings(saved);
          setLocalSettings(saved);
          setSecondsLeft(saved.workMinutes * 60);
        } catch {}
      }
    });
  }, []);

  const totalSeconds = (() => {
    if (phase === "work") return settings.workMinutes * 60;
    if (phase === "break") return settings.breakMinutes * 60;
    return settings.longBreakMinutes * 60;
  })();

  const progress = (totalSeconds - secondsLeft) / totalSeconds;
  const isBreak = phase !== "work";

  const SIZE = 260;
  const STROKE = 10;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeOffset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)));

  const timerColor = isBreak ? colors.timerBreak : colors.timerWork;

  const advancePhase = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJustFinished(true);
    setTimeout(() => setJustFinished(false), 2500);

    if (phase === "work") {
      const newCycle = cycleCount + 1;
      setCompletedPomodoros((p) => p + 1);
      if (newCycle >= settings.cyclesBeforeLongBreak) {
        setCycleCount(0);
        setPhase("longBreak");
        setSecondsLeft(settings.longBreakMinutes * 60);
      } else {
        setCycleCount(newCycle);
        setPhase("break");
        setSecondsLeft(settings.breakMinutes * 60);
      }
    } else {
      setPhase("work");
      setSecondsLeft(settings.workMinutes * 60);
    }
    setIsRunning(false);
  }, [phase, cycleCount, settings]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            advancePhase();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, advancePhase]);

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning((r) => !r);
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
    setJustFinished(false);
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(false);
    advancePhase();
  };

  const switchPhase = (p: Phase) => {
    Haptics.selectionAsync();
    setIsRunning(false);
    setPhase(p);
    setSecondsLeft(
      p === "work"
        ? settings.workMinutes * 60
        : p === "break"
        ? settings.breakMinutes * 60
        : settings.longBreakMinutes * 60
    );
  };

  const saveSettings = async () => {
    const validated: Settings = {
      workMinutes: Math.max(1, Math.min(99, localSettings.workMinutes)),
      breakMinutes: Math.max(1, Math.min(60, localSettings.breakMinutes)),
      longBreakMinutes: Math.max(1, Math.min(60, localSettings.longBreakMinutes)),
      cyclesBeforeLongBreak: Math.max(1, Math.min(10, localSettings.cyclesBeforeLongBreak)),
    };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(validated));
    setSettings(validated);
    setPhase("work");
    setSecondsLeft(validated.workMinutes * 60);
    setCycleCount(0);
    setIsRunning(false);
    setShowSettings(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const openSettings = () => {
    setLocalSettings(settings);
    setShowSettings(true);
  };

  const charIcon = getCharacterIcon(isRunning, isBreak, justFinished);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const gradStart = scheme === "dark" ? "#1f1530" : "#fce8f4";
  const gradEnd = scheme === "dark" ? "#1a1228" : "#ecdff8";

  return (
    <LinearGradient
      colors={[gradStart, gradEnd]}
      style={[styles.container, { paddingTop: topPad, paddingBottom: botPad + 16 }]}
    >
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.appName, { color: colors.primary, fontFamily: "Nunito_800ExtraBold" }]}>
          pomopink
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={openSettings}
            style={[styles.iconBtn, { backgroundColor: colors.card + "cc" }]}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-sharp" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Phase tabs */}
      <View style={[styles.phaseTabs, { backgroundColor: colors.muted + "80" }]}>
        {(["work", "break", "longBreak"] as Phase[]).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => switchPhase(p)}
            style={[
              styles.phaseTab,
              {
                backgroundColor:
                  phase === p ? (p === "work" ? colors.primary : colors.secondary) : "transparent",
              },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.phaseTabText,
                {
                  color: phase === p ? "#fff" : colors.mutedForeground,
                  fontFamily: phase === p ? "Nunito_700Bold" : "Nunito_400Regular",
                },
              ]}
            >
              {phaseLabel(p)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timer circle */}
      <View style={styles.circleWrapper}>
        <Svg
          width={SIZE}
          height={SIZE}
          style={[styles.svg, { transform: [{ rotate: "-90deg" }] }]}
        >
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={colors.muted}
            strokeWidth={STROKE}
            opacity={0.6}
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={timerColor}
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
          />
        </Svg>
        <View
          style={[
            styles.circleInner,
            {
              width: SIZE - STROKE * 5,
              height: SIZE - STROKE * 5,
              borderRadius: (SIZE - STROKE * 5) / 2,
              backgroundColor: colors.card + "e0",
            },
          ]}
        >
          {/* Character icon */}
          <View
            style={[
              styles.charIconWrapper,
              {
                backgroundColor:
                  justFinished
                    ? "#f5c842" + "22"
                    : isBreak
                    ? colors.secondary + "22"
                    : isRunning
                    ? colors.primary + "22"
                    : colors.muted,
              },
            ]}
          >
            <Ionicons
              name={charIcon}
              size={34}
              color={
                justFinished
                  ? "#f5c842"
                  : isBreak
                  ? colors.secondary
                  : isRunning
                  ? colors.primary
                  : colors.mutedForeground
              }
            />
          </View>
          {/* Time */}
          <Text
            style={[
              styles.timeText,
              {
                color: isBreak ? colors.secondary : colors.primary,
                fontFamily: "Nunito_800ExtraBold",
              },
            ]}
          >
            {formatTime(secondsLeft)}
          </Text>
          {/* Status label */}
          <Text
            style={[
              styles.statusLabel,
              { color: colors.mutedForeground, fontFamily: "Nunito_400Regular" },
            ]}
          >
            {justFinished
              ? "well done!"
              : isRunning
              ? isBreak
                ? "relaxing..."
                : "focusing!"
              : isBreak
              ? "break time"
              : "ready?"}
          </Text>
        </View>
      </View>

      {/* Control buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handleReset}
          style={[styles.sideBtn, { backgroundColor: colors.card + "cc" }]}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePlayPause}
          style={[
            styles.mainBtn,
            {
              backgroundColor: isBreak ? colors.secondary : colors.primary,
              shadowColor: isBreak ? colors.secondary : colors.primary,
            },
          ]}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isRunning ? "pause" : "play"}
            size={32}
            color="#fff"
            style={isRunning ? undefined : { marginLeft: 3 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          style={[styles.sideBtn, { backgroundColor: colors.card + "cc" }]}
          activeOpacity={0.7}
        >
          <Ionicons name="play-skip-forward" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Cycle dots */}
      <View style={styles.cycleRow}>
        <Text style={[styles.cycleLabel, { color: colors.mutedForeground, fontFamily: "Nunito_600SemiBold" }]}>
          Round
        </Text>
        <View style={styles.dots}>
          {Array.from({ length: settings.cyclesBeforeLongBreak }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < cycleCount ? colors.primary : colors.muted,
                  transform: [{ scale: i < cycleCount ? 1.2 : 1 }],
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.cycleLabel, { color: colors.mutedForeground, fontFamily: "Nunito_600SemiBold" }]}>
          Long break
        </Text>
      </View>

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.card + "cc", borderColor: colors.border }]}>
        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
        <Text style={[styles.statsText, { color: colors.foreground, fontFamily: "Nunito_700Bold" }]}>
          {completedPomodoros} pomodoro{completedPomodoros !== 1 ? "s" : ""} today
        </Text>
        {completedPomodoros >= 4 && (
          <Ionicons name="trophy" size={16} color="#f5c842" />
        )}
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowSettings(false)}
            activeOpacity={1}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: botPad + 20 }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.muted }]} />
            <Text style={[styles.modalTitle, { color: colors.primary, fontFamily: "Nunito_800ExtraBold" }]}>
              Settings
            </Text>

            <SettingRow
              label="Focus time (min)"
              value={localSettings.workMinutes}
              onDecrement={() => setLocalSettings((p) => ({ ...p, workMinutes: Math.max(1, p.workMinutes - 1) }))}
              onIncrement={() => setLocalSettings((p) => ({ ...p, workMinutes: Math.min(99, p.workMinutes + 1) }))}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              label="Short break (min)"
              value={localSettings.breakMinutes}
              onDecrement={() => setLocalSettings((p) => ({ ...p, breakMinutes: Math.max(1, p.breakMinutes - 1) }))}
              onIncrement={() => setLocalSettings((p) => ({ ...p, breakMinutes: Math.min(60, p.breakMinutes + 1) }))}
              colors={colors}
            />
            <SettingRow
              label="Long break (min)"
              value={localSettings.longBreakMinutes}
              onDecrement={() => setLocalSettings((p) => ({ ...p, longBreakMinutes: Math.max(1, p.longBreakMinutes - 1) }))}
              onIncrement={() => setLocalSettings((p) => ({ ...p, longBreakMinutes: Math.min(60, p.longBreakMinutes + 1) }))}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              label="Cycles before long break"
              value={localSettings.cyclesBeforeLongBreak}
              onDecrement={() => setLocalSettings((p) => ({ ...p, cyclesBeforeLongBreak: Math.max(1, p.cyclesBeforeLongBreak - 1) }))}
              onIncrement={() => setLocalSettings((p) => ({ ...p, cyclesBeforeLongBreak: Math.min(10, p.cyclesBeforeLongBreak + 1) }))}
              colors={colors}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowSettings(false)}
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground, fontFamily: "Nunito_600SemiBold" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveSettings}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalSaveText, { fontFamily: "Nunito_700Bold" }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const settingsStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  label: {
    fontSize: 15,
    flex: 1,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 28,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 8,
  },
  appName: {
    fontSize: 28,
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseTabs: {
    flexDirection: "row",
    borderRadius: 24,
    padding: 4,
    marginBottom: 28,
    gap: 4,
  },
  phaseTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  phaseTabText: {
    fontSize: 13,
  },
  circleWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  svg: {
    position: "absolute",
  },
  circleInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  charIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  timeText: {
    fontSize: 52,
    letterSpacing: -1,
  },
  statusLabel: {
    fontSize: 13,
    marginTop: -4,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 28,
  },
  sideBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  mainBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  cycleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cycleLabel: {
    fontSize: 12,
  },
  dots: {
    flexDirection: "row",
    gap: 7,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    width: "100%",
    justifyContent: "center",
  },
  statsText: {
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 26,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    opacity: 0.5,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 15,
    color: "#fff",
  },
});
