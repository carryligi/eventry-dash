import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLAMP, COLORS, FONT_FAMILY } from "../components/tokens";

// Scene 8 — "Every match. Logged."
// Five activity-log rows cascade in from y+20 with 8-frame stagger.
// Each row shows: keyword chip, channel, time, and status badge.
interface ActivityRow {
  keyword: string;
  channel: string;
  time: string;
  ok: boolean;
}

const ROWS: ActivityRow[] = [
  { keyword: "Rosalia", channel: "#releases", time: "12s ago", ok: true },
  { keyword: "Bad Bunny", channel: "#tours", time: "54s ago", ok: true },
  { keyword: "Coldplay", channel: "#alerts", time: "2m ago", ok: true },
  { keyword: "3500636CC21CAC39", channel: "#ids", time: "3m ago", ok: false },
  { keyword: "Ariana Grande", channel: "#drops", time: "4m ago", ok: true },
];

export const ActivityFeedScene: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [5, 25], [0, 1], CLAMP);
  const titleY = interpolate(frame, [5, 28], [16, 0], CLAMP);

  // Container
  const containerSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 16, stiffness: 90, mass: 1 },
  });
  const containerScale = 0.95 + containerSpring * 0.05;
  const containerOpacity = interpolate(frame, [10, 30], [0, 1], CLAMP);

  // Glow pulse on row 0 (top/newest) — tightened for 90-frame scene.
  const pulseIntensity = interpolate(frame, [55, 65, 78], [0, 1, 0], CLAMP);

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
        gap: 34,
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
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        Every match. Logged.
      </div>

      <div
        style={{
          backgroundColor: COLORS.bgSecondary,
          border: `1px solid ${COLORS.borderSubtle}`,
          borderRadius: 16,
          padding: "28px 32px",
          minWidth: 960,
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.8)",
          transform: `scale(${containerScale})`,
          opacity: containerOpacity,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1.2fr 1fr 0.6fr",
            gap: 18,
            padding: "10px 16px",
            borderBottom: `1px solid ${COLORS.borderSubtle}`,
            marginBottom: 6,
          }}
        >
          {["Keyword", "Channel", "Time", "Status"].map((h) => (
            <div
              key={h}
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: 500,
                fontSize: 16,
                color: COLORS.textTertiary,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {ROWS.map((row, i) => {
          const rowStart = 15 + i * 8;
          const rowOpacity = interpolate(
            frame,
            [rowStart, rowStart + 14],
            [0, 1],
            CLAMP
          );
          const rowY = interpolate(
            frame,
            [rowStart, rowStart + 18],
            [22, 0],
            CLAMP
          );
          const badgeStart = rowStart + 10;
          const badgeSpring = spring({
            frame: frame - badgeStart,
            fps,
            config: { damping: 11, stiffness: 160, mass: 0.6 },
          });
          const badgeScale = 0.4 + badgeSpring * 0.6;

          const isTop = i === 0;
          return (
            <div
              key={`${row.keyword}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1.2fr 1fr 0.6fr",
                gap: 18,
                padding: "14px 16px",
                borderBottom:
                  i === ROWS.length - 1
                    ? "none"
                    : `1px solid ${COLORS.borderSubtle}`,
                opacity: rowOpacity,
                transform: `translateY(${rowY}px)`,
                alignItems: "center",
                backgroundColor: isTop
                  ? `rgba(229, 229, 234, ${0.04 * pulseIntensity})`
                  : "transparent",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_FAMILY,
                  fontWeight: 500,
                  fontSize: 22,
                  color: COLORS.textPrimary,
                }}
              >
                {row.keyword}
              </div>
              <div
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontWeight: 400,
                  fontSize: 20,
                  color: COLORS.textSecondary,
                }}
              >
                {row.channel}
              </div>
              <div
                style={{
                  fontFamily: FONT_FAMILY,
                  fontWeight: 400,
                  fontSize: 20,
                  color: COLORS.textTertiary,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {row.time}
              </div>
              <div
                style={{
                  transform: `scale(${badgeScale})`,
                  transformOrigin: "left center",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: row.ok ? COLORS.success : "#FF453A",
                    boxShadow: row.ok
                      ? `0 0 16px ${COLORS.success}`
                      : "0 0 16px #FF453A",
                  }}
                >
                  {row.ok ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12L10 17L19 7"
                        stroke="#000"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 6L18 18M18 6L6 18"
                        stroke="#000"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
