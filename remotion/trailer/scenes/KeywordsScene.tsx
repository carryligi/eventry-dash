import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLAMP, COLORS, FONT_FAMILY } from "../components/tokens";
import { Chip } from "../components/Chip";

// Scene 4 — "Your keywords. Your control."
// 6 silver chips spring-flip in 3D, search bar with blinking caret,
// + Add button softly glows in after the chips land.
const KEYWORDS = [
  "Rosalia",
  "3500636CC21CAC39",
  "Bad Bunny",
  "Coldplay",
  "Ariana Grande",
];

export const KeywordsScene: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOpacity = interpolate(frame, [5, 25], [0, 1], CLAMP);
  const labelY = interpolate(frame, [5, 28], [16, 0], CLAMP);

  const cardEntrance = spring({
    frame: frame - 10,
    fps,
    config: { damping: 16, stiffness: 90, mass: 1 },
  });
  const cardScale = 0.94 + cardEntrance * 0.06;
  const cardOpacity = interpolate(frame, [10, 34], [0, 1], CLAMP);

  // Blinking caret (15-frame half period)
  const caretVisible = Math.floor(frame / 15) % 2 === 0;

  // Add-button entrance — tightened so it fully lands inside the 120f window.
  const addSpring = spring({
    frame: frame - 68,
    fps,
    config: { damping: 12, stiffness: 140, mass: 0.7 },
  });
  const addScale = 0.7 + addSpring * 0.3;
  const addOpacity = interpolate(frame, [68, 86], [0, 1], CLAMP);
  const addGlow = interpolate(frame, [72, 90, 108], [0, 1, 0.4], CLAMP);

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
        Your keywords. Your control.
      </div>

      <div
        style={{
          backgroundColor: COLORS.bgSecondary,
          border: `1px solid ${COLORS.borderSubtle}`,
          borderRadius: 16,
          padding: "40px 48px",
          minWidth: 920,
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.8)",
          transform: `scale(${cardScale})`,
          opacity: cardOpacity,
          perspective: "1400px",
        }}
      >
        {/* Card header + search bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 26,
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
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              backgroundColor: COLORS.bgPrimary,
              border: `1px solid ${COLORS.borderSubtle}`,
              borderRadius: 10,
              minWidth: 260,
              fontFamily: FONT_FAMILY,
              fontSize: 18,
              color: COLORS.textSecondary,
            }}
          >
            <span style={{ opacity: 0.55 }}>⌕</span>
            <span>Search</span>
            <span
              style={{
                marginLeft: "auto",
                width: 2,
                height: 20,
                backgroundColor: COLORS.textSecondary,
                opacity: caretVisible ? 1 : 0,
              }}
            />
          </div>
        </div>

        {/* Chips */}
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            transformStyle: "preserve-3d",
          }}
        >
          {KEYWORDS.map((keyword, i) => {
            const chipStart = 20 + i * 10;
            const chipSpring = spring({
              frame: frame - chipStart,
              fps,
              config: { damping: 12, stiffness: 130, mass: 0.7 },
            });
            const chipOpacity = interpolate(
              frame,
              [chipStart, chipStart + 16],
              [0, 1],
              CLAMP
            );
            const rotateY = (1 - chipSpring) * 60;
            const chipY = (1 - chipSpring) * 14;

            return (
              <div
                key={keyword}
                style={{
                  transform: `translateY(${chipY}px) rotateY(${rotateY}deg)`,
                  opacity: chipOpacity,
                  transformOrigin: "center",
                  transformStyle: "preserve-3d",
                }}
              >
                <Chip label={keyword} variant="silver" withCross />
              </div>
            );
          })}

          {/* Add button */}
          <div
            style={{
              transform: `scale(${addScale})`,
              opacity: addOpacity,
              filter: `drop-shadow(0 0 ${18 * addGlow}px rgba(229, 229, 234, ${0.5 * addGlow}))`,
            }}
          >
            <Chip label="+ Add" variant="outline" />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
