import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLAMP, COLORS, FONT_FAMILY, SILVER_GRADIENT } from "../components/tokens";

// Scene 6 — "Alerts, routed your way."
// Notification card slides in from the right, then four routing badges
// fade in below with animated SVG connecting lines reaching from the card
// down to each badge.
const ROUTES = ["Push", "Pushover", "Webhook", "Discord DM"] as const;

export const NotifyScene: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOpacity = interpolate(frame, [5, 25], [0, 1], CLAMP);

  // Notification slides in from the right
  const cardSpring = spring({
    frame: frame - 12,
    fps,
    config: { damping: 18, stiffness: 90, mass: 1 },
  });
  const cardX = (1 - cardSpring) * 420;
  const cardOpacity = interpolate(frame, [12, 30], [0, 1], CLAMP);

  // Silver glow pulse around frame 40
  const glowIntensity = interpolate(frame, [32, 42, 60], [0, 1, 0], CLAMP);

  // SVG line reveal — strokeDashoffset animates from 220 -> 0 over frames 55..100
  const lineProgress = interpolate(frame, [55, 100], [220, 0], CLAMP);

  const sceneOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    CLAMP
  );

  // Badge geometry — four badges across roughly 880px wide band.
  // Lines go from a single anchor point at the bottom of the card
  // (anchor ~ x=0 relative to the band center) down to each badge center.
  const BAND_WIDTH = 920;
  const badgeCenters = [-360, -120, 120, 360];

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
        Alerts, routed your way.
      </div>

      {/* Notification card */}
      <div
        style={{
          backgroundColor: COLORS.bgSecondary,
          border: `1px solid ${COLORS.borderDefault}`,
          borderRadius: 18,
          padding: "28px 34px",
          width: 760,
          display: "flex",
          gap: 20,
          alignItems: "flex-start",
          transform: `translateX(${cardX}px)`,
          opacity: cardOpacity,
          boxShadow: `0 24px 80px rgba(0, 0, 0, 0.8), 0 0 ${40 * glowIntensity}px rgba(229, 229, 234, ${0.5 * glowIntensity})`,
        }}
      >
        {/* Silver square icon */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 12,
            background: SILVER_GRADIENT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 900,
              fontSize: 30,
              color: COLORS.bgRoot,
            }}
          >
            E
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: 600,
                fontSize: 22,
                color: COLORS.textPrimary,
              }}
            >
              Eventry
            </div>
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: 400,
                fontSize: 16,
                color: COLORS.textTertiary,
              }}
            >
              now
            </div>
          </div>
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 400,
              fontSize: 22,
              color: COLORS.textPrimary,
              lineHeight: 1.35,
            }}
          >
            Keyword{" "}
            <span style={{ fontWeight: 600 }}>&ldquo;Rosalia&rdquo;</span> matched in
            #releases
          </div>
        </div>
      </div>

      {/* Routing band: SVG connecting lines + badges */}
      <div
        style={{
          position: "relative",
          width: BAND_WIDTH,
          height: 140,
          marginTop: 6,
        }}
      >
        {/* SVG lines behind the badges */}
        <svg
          width={BAND_WIDTH}
          height={140}
          viewBox={`${-BAND_WIDTH / 2} 0 ${BAND_WIDTH} 140`}
          style={{
            position: "absolute",
            inset: 0,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          <defs>
            <linearGradient id="notifyLineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={COLORS.accentEnd} stopOpacity="0.9" />
              <stop offset="100%" stopColor={COLORS.accentStart} stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {badgeCenters.map((cx, i) => (
            <path
              key={i}
              d={`M 0 0 C 0 50, ${cx} 40, ${cx} 100`}
              stroke="url(#notifyLineGrad)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="220"
              strokeDashoffset={lineProgress}
            />
          ))}
        </svg>

        {/* Badges */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 100,
            transform: "translate(-50%, 0)",
            display: "flex",
            gap: 0,
            width: BAND_WIDTH,
            justifyContent: "center",
          }}
        >
          {ROUTES.map((route, i) => {
            const badgeStart = 70 + i * 8;
            const badgeOpacity = interpolate(
              frame,
              [badgeStart, badgeStart + 16],
              [0, 1],
              CLAMP
            );
            const badgeY = interpolate(
              frame,
              [badgeStart, badgeStart + 20],
              [14, 0],
              CLAMP
            );
            return (
              <div
                key={route}
                style={{
                  position: "absolute",
                  left: `calc(50% + ${badgeCenters[i]}px)`,
                  transform: `translate(-50%, ${badgeY}px)`,
                  padding: "12px 24px",
                  borderRadius: 999,
                  border: `1px solid ${COLORS.borderStrong}`,
                  backgroundColor: COLORS.bgPrimary,
                  color: COLORS.textPrimary,
                  fontFamily: FONT_FAMILY,
                  fontWeight: 500,
                  fontSize: 20,
                  letterSpacing: "0.01em",
                  opacity: badgeOpacity,
                  whiteSpace: "nowrap",
                  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.6)",
                }}
              >
                {route}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
