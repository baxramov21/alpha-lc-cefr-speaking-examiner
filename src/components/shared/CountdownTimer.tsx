'use client';

import { useEffect, useRef, useState } from 'react';

interface CountdownTimerProps {
  totalSeconds: number;
  onComplete?: () => void;
  phase: 'prep' | 'speak';
  isPaused?: boolean;
  size?: number;
}

export default function CountdownTimer({
  totalSeconds,
  onComplete,
  phase,
  isPaused = false,
  size = 140,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Reset when totalSeconds changes (new question)
  useEffect(() => {
    setTimeLeft(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => onCompleteRef.current?.(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, timeLeft]);

  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / totalSeconds;
  const strokeDashoffset = circumference * (1 - progress);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const strokeColor = phase === 'prep' ? '#f59e0b' : '#14b8a6';
  const bgStroke = phase === 'prep' ? '#fef3c7' : '#ccfbf1';
  const isLow = timeLeft <= Math.min(10, totalSeconds * 0.2);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgStroke}
          strokeWidth={8}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
          className={isLow ? 'animate-pulse' : ''}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-bold tabular-nums"
          style={{
            fontSize: size * 0.18,
            color: isLow ? '#ef4444' : strokeColor,
          }}
        >
          {timeStr}
        </span>
        <span className="text-xs text-muted-foreground font-medium mt-0.5">
          {phase === 'prep' ? 'prep' : 'speak'}
        </span>
      </div>
    </div>
  );
}
