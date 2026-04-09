import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLAMP, COLORS, FONT_FAMILY } from "../components/tokens";
import { StatCard } from "../components/StatCard";

// Scene 3 — "Your command center."
// 2x2 grid of dashboard stat cards. Values count up via interpolate.
// Pinger status card has a pulsing green ping dot.
// Container has a subtle 3D perspective tilt that eases in over the first 2s.

interface CardDef {
  label: string;
  formatter: (f: number) => React.ReactNode;
  accent?: "default" | "success";
  badge?: (f: number) => React.ReactNode;
}

const CARD_DEFS: CardDef[] = [
  {
    label: "Keywords",
    formatter: (f) => Math.round(interpolate(f, [30, 100], [0, 23], CLAMP)),
  },
  {
    label: "Total Matches",
    formatter: (f) => {
      const n = Math.round(interpolate(f, [30, 115], [0, 1847], CLAMP));
      return n.toLocaleString("en-US");
    },
  },
  {
    label: "Pinger",
    formatter: () => "Active",
    accent: "success",
    badge: (f) => {
      const pulse = Math.abs(Math.sin((f - 30) / 6));
      return (
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: COLORS.success,
            boxShadow: `0 0 ${8 + pulse * 14}px ${COLORS.success}`,
            opacity: 0.55 + pulse * 0.45,
          }}
        />
      );
    },
  },
  {
    label: "Today",
    formatter: (f) => Math.round(interpolate(f, [30, 105], [0, 42], CLAMP)),
  },
];

export const DashboardOverviewScene: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleOpacity = interpolate(frame, [5, 30], [0, 1], CLAMP);
  const titleY = interpolate(frame, [5, 32], [18, 0], CLAMP);

  // Perspective tilt eases in over frames 0..60
  const tiltProgress = interpolate(frame, [0, 60], [0, 1], CLAMP);
  const rotateX = tiltProgress * 3;
  const rotateY = tiltProgress * -2;

  // Scene fade-out
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
        gap: 42,
        opacity: sceneOpacity,
      }}
    >
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 500,
          fontSize: 54,
          color: COLORS.textPrimary,
          letterSpacing: "-0.01em",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        Your command center.
      </div>

      <div
        style={{
          perspective: "1600px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 26,
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {CARD_DEFS.map((def, i) => {
            const cardStart = 10 + i * 10;
            const cardSpring = spring({
              frame: frame - cardStart,
              fps,
              config: { damping: 14, stiffness: 90, mass: 0.9 },
            });
            const cardOpacity = interpolate(
              frame,
              [cardStart, cardStart + 20],
              [0, 1],
              CLAMP
            );
            const cardY = (1 - cardSpring) * 42;
            return (
              <div
                key={def.label}
                style={{
                  transform: `translateY(${cardY}px)`,
                  opacity: cardOpacity,
                }}
              >
                <StatCard
                  label={def.label}
                  value={def.formatter(frame)}
                  accent={def.accent}
                  badge={def.badge ? def.badge(frame) : undefined}
                  width={360}
                />
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
