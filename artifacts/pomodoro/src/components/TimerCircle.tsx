interface TimerCircleProps {
  progress: number;
  isBreak: boolean;
  isRunning: boolean;
  children: React.ReactNode;
}

export function TimerCircle({ progress, isBreak, isRunning, children }: TimerCircleProps) {
  const size = 280;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
        style={{ transition: 'all 0.3s ease' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted opacity-30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${isBreak ? 'timer-circle-break' : 'timer-circle-work'} ${isRunning ? 'progress-glow' : ''}`}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
        />
      </svg>
      <div
        className="relative z-10 flex items-center justify-center rounded-full glass"
        style={{
          width: size - strokeWidth * 4,
          height: size - strokeWidth * 4,
        }}
      >
        {children}
      </div>

      {isRunning && (
        <>
          <span className="absolute top-4 right-8 text-lg sparkle-1">✨</span>
          <span className="absolute bottom-6 left-6 text-base sparkle-2">⭐</span>
          <span className="absolute top-10 left-4 text-sm sparkle-3">🌟</span>
        </>
      )}
    </div>
  );
}
