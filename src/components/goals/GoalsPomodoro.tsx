import { useEffect, useState, useRef, useCallback } from "react";
import { useAppStore } from "../../stores/appStore";
import type { Goal } from "../../types";
import * as db from "../../lib/db";

const POMODORO_WORK = 25 * 60;
const POMODORO_BREAK = 5 * 60;

export function GoalsPomodoro() {
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const todayStats = useAppStore((s) => s.todayStats);
  const setTodayStats = useAppStore((s) => s.setTodayStats);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [targetInput, setTargetInput] = useState("2000");
  const [showSettings, setShowSettings] = useState(false);

  // Pomodoro state
  const [timerState, setTimerState] = useState<"idle" | "work" | "break">("idle");
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_WORK);
  const [pomodorosDone, setPomodorosDone] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!activeWorkId) return;
    db.getActiveGoal(activeWorkId, "daily_words")
      .then((g) => setGoal(g))
      .catch(console.error);
    db.getTodayWordCount().then(setTodayStats).catch(console.error);
  }, [activeWorkId]);

  const progress = goal ? Math.min(todayStats.total_words / goal.target_value * 100, 100) : 0;

  const handleSetGoal = async () => {
    if (!activeWorkId) return;
    const val = parseInt(targetInput, 10);
    if (!val || val <= 0) return;
    const g = await db.createGoal(activeWorkId, "daily_words", val);
    setGoal(g);
    setShowSettings(false);
  };

  const handleDeactivate = async () => {
    if (!goal) return;
    await db.updateGoal(goal.id, goal.target_value, false);
    setGoal(null);
  };

  // Pomodoro
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const notify = (title: string, body: string) => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: undefined });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") new Notification(title, { body, icon: undefined });
        });
      }
    }
  };

  const startTimer = (type: "work" | "break", duration: number) => {
    stopTimer();
    setTimerState(type);
    setSecondsLeft(duration);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          if (type === "work") {
            setPomodorosDone((p) => p + 1);
            notify("番茄钟完成！", "专注时间结束，休息一下吧~");
            // Auto-start break after work
            startTimer("break", POMODORO_BREAK);
          } else {
            notify("休息结束", "可以开始新的番茄钟了~");
            setTimerState("idle");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartWork = () => startTimer("work", POMODORO_WORK);
  const handleStartBreak = () => startTimer("break", POMODORO_BREAK);
  const handleReset = () => {
    stopTimer();
    setTimerState("idle");
    setSecondsLeft(POMODORO_WORK);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!activeWorkId) {
    return (
      <div className="p-3 text-sm text-text-secondary">请先选择作品</div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-3">
      {/* Goal Section */}
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
        写作目标
      </h2>

      {!goal && !showSettings ? (
        <div className="text-center py-4">
          <p className="text-sm text-text-secondary mb-2">设置每日码字目标</p>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-accent text-white rounded text-sm hover:opacity-90"
          >
            设置目标
          </button>
        </div>
      ) : showSettings ? (
        <div className="bg-surface-alt rounded-lg p-3 space-y-2">
          <label className="text-xs text-text-secondary">每日目标字数</label>
          <input
            type="number"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-surface border border-border rounded text-text-primary focus:border-accent focus:outline-none"
            min="100"
            step="100"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSetGoal}
              className="flex-1 px-3 py-1 text-sm bg-accent text-white rounded hover:opacity-90"
            >
              确认
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-3 py-1 text-sm border border-border rounded hover:bg-surface text-text-primary"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-surface-alt rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">今日目标</span>
            <button
              onClick={() => {
                setTargetInput(String(goal!.target_value));
                setShowSettings(true);
              }}
              className="text-xs text-accent hover:underline"
            >
              修改
            </button>
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold text-accent">
              {todayStats.total_words.toLocaleString()}
            </span>
            <span className="text-text-secondary text-sm"> / {goal!.target_value.toLocaleString()} 字</span>
          </div>
          {/* Progress bar */}
          <div className="h-3 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="text-center text-xs text-text-secondary">
            {progress >= 100 ? "目标达成!" : `${Math.round(progress)}%`}
          </div>
          <button
            onClick={handleDeactivate}
            className="w-full text-xs text-text-secondary hover:text-red-500"
          >
            取消目标
          </button>
        </div>
      )}

      {/* Pomodoro Section */}
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mt-2">
        番茄钟
      </h2>

      <div className="bg-surface-alt rounded-lg p-3 space-y-3 text-center">
        <div className="text-xs text-text-secondary">
          {timerState === "idle"
            ? "准备开始"
            : timerState === "work"
              ? "专注写作中..."
              : "休息一下"}
        </div>

        <div
          className={`text-4xl font-mono font-bold ${
            timerState === "work"
              ? "text-red-500"
              : timerState === "break"
                ? "text-green-500"
                : "text-text-primary"
          }`}
        >
          {formatTime(secondsLeft)}
        </div>

        <div className="flex justify-center gap-2">
          {timerState === "idle" ? (
            <>
              <button
                onClick={handleStartWork}
                className="px-4 py-1.5 text-sm bg-red-500 text-white rounded hover:opacity-90"
              >
                开始专注 (25分钟)
              </button>
              <button
                onClick={handleStartBreak}
                className="px-4 py-1.5 text-sm bg-green-500 text-white rounded hover:opacity-90"
              >
                休息 (5分钟)
              </button>
            </>
          ) : (
            <button
              onClick={handleReset}
              className="px-4 py-1.5 text-sm border border-border rounded hover:bg-surface text-text-primary"
            >
              重置
            </button>
          )}
        </div>

        <div className="text-xs text-text-secondary">
          已完成 {pomodorosDone} 个番茄钟
        </div>
      </div>
    </div>
  );
}
