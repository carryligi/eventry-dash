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

// Scene 2 — The upgrade story.
// Left half: old Discord slash-command terminal fades in (desaturated, "the old way").
// A silver gradient sweep line crosses the screen L->R, wiping into the right half.
// Right half: modern Eventry dashboard card with keyword chips slides in.
// Bottom caption: "The upgrade is here."
const OLD_COMMANDS = [
  "> /keyword add drop",
  "> /keyword list",
  "> /notify pushover enable",
  "> /autostart on",
] as const;

const NEW_KEYWORDS = ["Rosalia", "Bad Bunny", "Coldplay"] as const;

export const BeforeAfterScene: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Terminal (left) fades/slides in
  const terminalOpacity = interpolate(frame, [0, 20], [0, 0.9], CLAMP);
  const terminalX = interpolate(frame, [0, 25], [-40, 0], CLAMP);

  // Terminal fades down (to textTertiary) once the sweep passes
  const terminalDim = interpolate(frame, [55, 80], [1, 0.25], CLAMP);

  // Sweep line — vertical silver gradient travels across the full width
  const sweepProgress = interpolate(frame, [50, 85], [0, 1], CLAMP);
  const sweepVisible = frame >= 48 && frame <= 92;

  // Dashboard card (right) slides in from the right with spring
  const cardSpring = spring({
    frame: frame - 68,
    fps,
    config: { damping: 18, stiffness: 95, mass: 1 },
  });
  const cardX = (1 - cardSpring) * 80;
  const cardOpacity = interpolate(frame, [68, 95], [0, 1], CLAMP);

  // Bottom caption — lands early enough to be readable before the 120f scene ends.
  const captionOpacity = interpolate(frame, [80, 100], [0, 1], CLAMP);
  const captionY = interpolate(frame, [80, 103], [14, 0], CLAMP);

  // Scene fade-out
  const fadeStart = durationInFrames - 15;
  const sceneOpacity = interpolate(
    frame,
    [fadeStart, durationInFrames],
    [1, 0],
    CLAMP
  );

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* LEFT HALF — old terminal */}
      <div
        style={{
          position: "absolute",
          left: 140,
          top: "50%",
          transform: `translate(${terminalX}px, -50%)`,
          opacity: terminalOpacity * terminalDim,
          width: 680,
        }}
      >
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontWeight: 500,
            fontSize: 18,
            color: COLORS.textTertiary,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 18,
          }}
        >
          The Old Way
        </div>
        <div
          style={{
            backgroundColor: COLORS.bgPrimary,
            border: `1px solid ${COLORS.borderSubtle}`,
            borderRadius: 14,
            padding: "32px 34px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.7)",
            filter: "grayscale(1)",
          }}
        >
          {/* Fake terminal traffic lights */}
          <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#3a3a3c",
                }}
              />
            ))}
          </div>
          {OLD_COMMANDS.map((cmd, i) => {
            const cmdStart = 8 + i * 8;
            const cmdOpacity = interpolate(
              frame,
              [cmdStart, cmdStart + 14],
              [0, 1],
              CLAMP
            );
            return (
              <div
                key={cmd}
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontWeight: 500,
                  fontSize: 24,
                  color: COLORS.textTertiary,
                  lineHeight: 1.6,
                  opacity: cmdOpacity,
                }}
              >
                {cmd}
              </div>
            );
          })}
        </div>
      </div>

      {/* SWEEP LINE */}
      {sweepVisible && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${sweepProgress * 100}%`,
            width: 12,
            background: SILVER_GRADIENT,
            filter: "blur(14px)",
            boxShadow: "0 0 80px rgba(229, 229, 234, 0.6)",
            transform: "translateX(-50%)",
          }}
        />
      )}

      {/* RIGHT HALF — dashboard card */}
      <div
        style={{
          position: "absolute",
          right: 140,
          top: "50%",
          transform: `translate(${cardX}px, -50%)`,
          opacity: cardOpacity,
          width: 680,
        }}
      >
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontWeight: 500,
            fontSize: 18,
            color: COLORS.textSecondary,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 18,
            textAlign: "right",
          }}
        >
          Eventry Dashboard
        </div>
        <div
          style={{
            backgroundColor: COLORS.bgSecondary,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: 16,
            padding: "32px 36px",
            boxShadow:
              "0 24px 80px rgba(0, 0, 0, 0.8), 0 0 60px rgba(229, 229, 234, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 22,
            }}
          >
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: 500,
                fontSize: 20,
                color: COLORS.textSecondary,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Keywords
            </div>
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: 500,
                fontSize: 18,
                color: COLORS.success,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: COLORS.success,
                  boxShadow: `0 0 10px ${COLORS.success}`,
                }}
              />
              Active
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {NEW_KEYWORDS.map((kw) => (
              <Chip key={kw} label={kw} variant="silver" withCross />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom caption */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 120,
          textAlign: "center",
          fontFamily: FONT_FAMILY,
          fontWeight: 500,
          fontSize: 40,
          color: COLORS.textPrimary,
          letterSpacing: "-0.01em",
          opacity: captionOpacity,
          transform: `translateY(${captionY}px)`,
        }}
      >
        The upgrade is here.
      </div>
    </AbsoluteFill>
  );
};
