interface CharacterProps {
  isRunning: boolean;
  isBreak: boolean;
  timeUp: boolean;
}

export function Character({ isRunning, isBreak, timeUp }: CharacterProps) {
  if (timeUp) {
    return (
      <div className="text-center bounce-in">
        <div className="text-6xl">🎉</div>
        <div className="text-xs font-bold mt-1 text-primary">Done!</div>
      </div>
    );
  }

  if (isBreak) {
    return (
      <div className={`text-center ${isRunning ? 'float' : ''}`}>
        <div className="text-5xl">🌸</div>
        <div className="text-xs font-bold mt-1" style={{ color: 'hsl(270, 55%, 65%)' }}>
          {isRunning ? 'relaxing...' : 'break time'}
        </div>
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className="text-center wiggle">
        <div className="text-5xl">🐱</div>
        <div className="text-xs font-bold mt-1 text-primary">focusing!</div>
      </div>
    );
  }

  return (
    <div className="text-center pulse-soft">
      <div className="text-5xl">😴</div>
      <div className="text-xs font-bold mt-1 text-muted-foreground">ready?</div>
    </div>
  );
}
