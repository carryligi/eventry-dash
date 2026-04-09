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

// Scene 9 — Final CTA. Shortened to 90 frames (3s).
// Wordmark springs in with a silver sheen sweep, tagline fades up, URL lands,
// scene fades out with a soft blur.
export const CTAScene: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 4,
    fps,
    config: { damping: 14, stiffness: 90, mass: 1 },
  });
  const scale = 0.9 + entrance * 0.1;
  const wordmarkOpacity = interpolate(frame, [4, 22], [0, 1], CLAMP);

  // Sheen sweep frames 10..55
  const sheenProgress = interpolate(frame, [10, 55], [0, 1], CLAMP);

  // Tagline
  const taglineOpacity = interpolate(frame, [22, 42], [0, 1], CLAMP);
  const taglineY = interpolate(frame, [22, 48], [14, 0], CLAMP);

  // URL
  const urlOpacity = interpolate(frame, [38, 60], [0, 1], CLAMP);
  const urlY = interpolate(frame, [38, 64], [10, 0], CLAMP);

  // Final fade + blur
  const fadeStart = durationInFrames - 25;
  const sceneOpacity = interpolate(
    frame,
    [fadeStart, durationInFrames],
    [1, 0],
    CLAMP
  );
  const fadeBlur = interpolate(
    frame,
    [fadeStart, durationInFrames],
    [0, 10],
    CLAMP
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 32,
        opacity: sceneOpacity,
        filter: `blur(${fadeBlur}px)`,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity: wordmarkOpacity,
        }}
      >
        <Wordmark size={190} letterSpacing={12} sheenProgress={sheenProgress} />
      </div>

      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 500,
          fontSize: 44,
          color: COLORS.textPrimary,
          letterSpacing: "-0.01em",
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
        }}
      >
        The Keyword Dashboard.
      </div>

      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 400,
          fontSize: 24,
          color: COLORS.textSecondary,
          letterSpacing: "0.02em",
          opacity: urlOpacity,
          transform: `translateY(${urlY}px)`,
          marginTop: 6,
        }}
      >
        eventry-dash.vercel.app
      </div>
    </AbsoluteFill>
  );
};
