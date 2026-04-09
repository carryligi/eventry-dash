import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLAMP, COLORS, FONT_FAMILY, SILVER_GRADIENT } from "../components/tokens";
import { Chip } from "../components/Chip";

// Scene 5 — "Smart filters. Precise control."
// Config card with:
//   1. Min stock slider (track fills 0 -> 50%, value counts 0 -> 5)
//   2. Schedule chip slides in
//   3. Three channel chips pop in sequentially
//   4. Success checkmark lands bottom-right
const CHANNELS = ["#drops", "#raffles", "#launches"] as const;

export const FiltersScene: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOpacity = interpolate(frame, [5, 25], [0, 1], CLAMP);
  const labelY = interpolate(frame, [5, 28], [16, 0], CLAMP);

  const cardSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 16, stiffness: 90, mass: 1 },
  });
  const cardScale = 0.94 + cardSpring * 0.06;
  const cardOpacity = interpolate(frame, [8, 30], [0, 1], CLAMP);

  // Slider fill 15..55, value 0..5
  const sliderFill = interpolate(frame, [15, 55], [0, 0.5], CLAMP);
  const sliderValue = Math.round(interpolate(frame, [15, 55], [0, 5], CLAMP));

  // Schedule chip slide in from left (frames 40..70)
  const schedX = interpolate(frame, [40, 70], [-50, 0], CLAMP);
  const schedOpacity = interpolate(frame, [40, 66], [0, 1], CLAMP);

  // Checkmark lands at frame 90
  const checkSpring = spring({
    frame: frame - 88,
    fps,
    config: { damping: 11, stiffness: 160, mass: 0.6 },
  });
  const checkScale = 0.4 + checkSpring * 0.6;
  const checkOpacity = interpolate(frame, [88, 102], [0, 1], CLAMP);

  const fadeStart = durationInFrames - 20;
  const sceneOpacity = interpolate(
    frame,
    [fadeStart, durationInFrames],
    [1, 0],
    CLAMP
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 36,
        opacity: sceneOpacity,
      }}
    >
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 500,
          fontSize: 52,
          color: COLORS.textPrimary,
          letterSpacing: "-0.01em",
          opacity: labelOpacity,
          transform: `translateY(${labelY}px)`,
        }}
      >
        Smart filters. Precise control.
      </div>

      <div
        style={{
          position: "relative",
          backgroundColor: COLORS.bgSecondary,
          border: `1px solid ${COLORS.borderSubtle}`,
          borderRadius: 16,
          padding: "44px 52px",
          minWidth: 880,
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.8)",
          transform: `scale(${cardScale})`,
          opacity: cardOpacity,
          display: "flex",
          flexDirection: "column",
          gap: 34,
        }}
      >
        {/* Row 1 — Min stock slider */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: 500,
                fontSize: 22,
                color: COLORS.textSecondary,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Min Stock
            </span>
            <span
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: 600,
                fontSize: 32,
                color: COLORS.textPrimary,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {sliderValue}
            </span>
          </div>
          <div
            style={{
              height: 10,
              backgroundColor: COLORS.bgTertiary,
              borderRadius: 999,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${sliderFill * 100}%`,
                background: SILVER_GRADIENT,
                borderRadius: 999,
                boxShadow: "0 0 20px rgba(229, 229, 234, 0.35)",
              }}
            />
            {/* slider thumb */}
            <div
              style={{
                position: "absolute",
                left: `calc(${sliderFill * 100}% - 14px)`,
                top: "50%",
                transform: "translateY(-50%)",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: SILVER_GRADIENT,
                boxShadow: "0 4px 16px rgba(229, 229, 234, 0.55)",
              }}
            />
          </div>
        </div>

        {/* Row 2 — Schedule */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <span
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 500,
              fontSize: 22,
              color: COLORS.textSecondary,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              minWidth: 160,
            }}
          >
            Schedule
          </span>
          <div
            style={{
              transform: `translateX(${schedX}px)`,
              opacity: schedOpacity,
            }}
          >
            <Chip label="09:00 → 23:59" variant="ghost" />
          </div>
        </div>

        {/* Row 3 — Channels */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <span
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 500,
              fontSize: 22,
              color: COLORS.textSecondary,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              minWidth: 160,
            }}
          >
            Channels
          </span>
          <div style={{ display: "flex", gap: 12 }}>
            {CHANNELS.map((ch, i) => {
              const chStart = 55 + i * 10;
              const chSpring = spring({
                frame: frame - chStart,
                fps,
                config: { damping: 12, stiffness: 150, mass: 0.7 },
              });
              const chScale = 0.5 + chSpring * 0.5;
              const chOpacity = interpolate(
                frame,
                [chStart, chStart + 18],
                [0, 1],
                CLAMP
              );
              return (
                <div
                  key={ch}
                  style={{
                    transform: `scale(${chScale})`,
                    opacity: chOpacity,
                    transformOrigin: "center",
                  }}
                >
                  <Chip label={ch} variant="ghost" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Checkmark */}
        <div
          style={{
            position: "absolute",
            right: 34,
            bottom: 34,
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: COLORS.success,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${checkScale})`,
            opacity: checkOpacity,
            boxShadow: `0 0 30px ${COLORS.success}`,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12L10 17L19 7"
              stroke="#000"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
