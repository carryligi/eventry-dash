import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLAMP, COLORS, FONT_FAMILY } from "../components/tokens";
import { Wordmark } from "../components/Wordmark";

// Scene 1 — The hook.
// Delivers the exact user-requested tagline "Introducing Eventry Keyword Dashboard"
// with a layered, cinematic reveal:
//   1. "Introducing" small label fades up with blur
//   2. EVENTRY wordmark spring-scales in with sheen sweep
//   3. "KEYWORD DASHBOARD" kicker expands via letter-spacing
//   4. Entire composition zooms out slightly and fades at the end
export const IntroHookScene: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "Introducing" label — frames 10..35
  const introOpacity = interpolate(frame, [10, 35], [0, 1], CLAMP);
  const introY = interpolate(frame, [10, 40], [22, 0], CLAMP);
  const introBlur = interpolate(frame, [10, 40], [8, 0], CLAMP);

  // Wordmark spring — frames 40..95
  const wordmarkSpring = spring({
    frame: frame - 40,
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.9 },
  });
  const wordmarkScale = 0.72 + wordmarkSpring * 0.28;
  const wordmarkOpacity = interpolate(frame, [40, 70], [0, 1], CLAMP);

  // Sheen sweep on the wordmark — frames 55..105
  const sheenProgress = interpolate(frame, [55, 105], [0, 1], CLAMP);

  // "KEYWORD DASHBOARD" kicker — letter-spacing expands 4px -> 18px, fades in
  const kickerOpacity = interpolate(frame, [60, 95], [0, 1], CLAMP);
  const kickerSpacing = interpolate(frame, [60, 110], [4, 18], CLAMP);

  // Macro parallax: whole scene pushes in slightly 100..135
  const pushIn = interpolate(frame, [0, 120], [1.0, 1.035], CLAMP);

  // Scene fade-out + zoom-out on the last 30 frames
  const fadeStart = durationInFrames - 30;
  const sceneOpacity = interpolate(
    frame,
    [fadeStart, durationInFrames],
    [1, 0],
    CLAMP
  );
  const fadeScale = interpolate(
    frame,
    [fadeStart, durationInFrames],
    [1, 0.97],
    CLAMP
  );
  const fadeBlur = interpolate(
    frame,
    [fadeStart, durationInFrames],
    [0, 6],
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
        transform: `scale(${pushIn * fadeScale})`,
        filter: `blur(${fadeBlur}px)`,
      }}
    >
      {/* "Introducing" small label */}
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 500,
          fontSize: 34,
          color: COLORS.textSecondary,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          opacity: introOpacity,
          transform: `translateY(${introY}px)`,
          filter: `blur(${introBlur}px)`,
        }}
      >
        Introducing
      </div>

      {/* EVENTRY wordmark */}
      <div
        style={{
          transform: `scale(${wordmarkScale})`,
          opacity: wordmarkOpacity,
        }}
      >
        <Wordmark size={210} letterSpacing={14} sheenProgress={sheenProgress} />
      </div>

      {/* KEYWORD DASHBOARD kicker */}
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 500,
          fontSize: 44,
          color: COLORS.textPrimary,
          textTransform: "uppercase",
          letterSpacing: `${kickerSpacing}px`,
          opacity: kickerOpacity,
          marginTop: 6,
        }}
      >
        Keyword Dashboard
      </div>
    </AbsoluteFill>
  );
};
