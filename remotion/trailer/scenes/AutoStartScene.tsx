import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLAMP, COLORS, FONT_FAMILY } from "../components/tokens";

// Scene 7 — "The moment it hits, it fires."
// Lightning bolt springs in with a glow pulse, a sub-second countdown ticks
// down to 0.0s, and three task cards cascade in with tighter 5-frame stagger.
const TASKS = [
  "Task #1 fired",
  "Task #2 fired",
  "Task #3 fired",
] as const;

export const AutoStartScene: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOpacity = interpolate(frame, [5, 25], [0, 1], CLAMP);

  // Lightning bolt entrance
  const boltSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 10, stiffness: 140, mass: 0.8 },
  });
  const boltScale = 0.5 + boltSpring * 0.5;
  const boltOpacity = interpolate(frame, [10, 25], [0, 1], CLAMP);

  // Bolt glow pulse
  const boltGlow = interpolate(frame, [25, 40, 60], [0, 1, 0.4], CLAMP);

  // Sub-second countdown: 1.0s -> 0.0s over frames 20..55
  const timerValue = interpolate(frame, [20, 55], [1.0, 0.0], CLAMP);
  const timerOpacity = interpolate(frame, [20, 35], [0, 1], CLAMP);

  const sceneOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    CLAMP
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 38,
        opacity: sceneOpacity,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 500,
          fontSize: 52,
          color: COLORS.textPrimary,
          letterSpacing: "-0.01em",
          opacity: labelOpacity,
        }}
      >
        The moment it hits, it fires.
      </div>

      {/* Lightning bolt + timer */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            transform: `scale(${boltScale})`,
            opacity: boltOpacity,
            filter: `drop-shadow(0 0 ${30 * boltGlow}px rgba(229, 229, 234, ${0.8 * boltGlow}))`,
          }}
        >
          <svg width="140" height="160" viewBox="0 0 140 160" fill="none">
            <defs>
              <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={COLORS.accentStart} />
                <stop offset="100%" stopColor={COLORS.accentEnd} />
              </linearGradient>
            </defs>
            <path
              d="M78 0 L20 92 L60 92 L42 160 L120 60 L72 60 Z"
              fill="url(#boltGrad)"
            />
          </svg>
        </div>

        {/* Countdown */}
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontWeight: 600,
            fontSize: 24,
            color: COLORS.textSecondary,
            letterSpacing: "0.08em",
            opacity: timerOpacity,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          fires in {timerValue.toFixed(1)}s
        </div>
      </div>

      {/* Task cascade */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {TASKS.map((task, i) => {
          const taskStart = 55 + i * 5;
          const taskOpacity = interpolate(
            frame,
            [taskStart, taskStart + 14],
            [0, 1],
            CLAMP
          );
          const taskY = interpolate(
            frame,
            [taskStart, taskStart + 18],
            [-10, 0],
            CLAMP
          );
          return (
            <div
              key={task}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 26px",
                backgroundColor: COLORS.bgSecondary,
                border: `1px solid ${COLORS.borderSubtle}`,
                borderRadius: 12,
                minWidth: 360,
                fontFamily: FONT_FAMILY,
                fontWeight: 500,
                fontSize: 22,
                color: COLORS.textPrimary,
                opacity: taskOpacity,
                transform: `translateY(${taskY}px)`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: COLORS.success,
                  boxShadow: `0 0 12px ${COLORS.success}`,
                }}
              />
              <span>{task}</span>
              <span
                style={{
                  marginLeft: "auto",
                  color: COLORS.success,
                  fontSize: 18,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontWeight: 600,
                }}
              >
                ok
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
