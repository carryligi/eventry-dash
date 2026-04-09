// Shared design tokens for the Eventry trailer.
// Mirrors src/app/globals.css:117-141 so the trailer matches the live dashboard.

export const COLORS = {
  bgRoot: "#000000",
  bgPrimary: "#0A0A0A",
  bgSecondary: "#1C1C1E",
  bgTertiary: "#2C2C2E",
  textPrimary: "rgba(255, 255, 255, 0.87)",
  textSecondary: "#86868B",
  textTertiary: "#6E6E73",
  accentStart: "#A1A1A6",
  accentEnd: "#E5E5EA",
  accentGlow: "rgba(229, 229, 234, 0.12)",
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  borderDefault: "rgba(255, 255, 255, 0.10)",
  borderStrong: "rgba(255, 255, 255, 0.16)",
  success: "#30D158",
} as const;

export const SILVER_GRADIENT = `linear-gradient(135deg, ${COLORS.accentStart} 0%, ${COLORS.accentEnd} 100%)`;

export const FONT_FAMILY = "Inter, -apple-system, sans-serif";

// Shared interpolate options: clamp on both sides. Reused ~80× across scenes —
// keep as a module constant so every call site reads identically.
export const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// Scene durations in frames (at 30fps). Sums to 40 seconds @ 30fps.
//
// Beat-synced to public/trailer-music.webm (JxnBeatz "ICE", ~120 BPM).
// 1 bar = 60 frames (2s). Scene cuts land on bar boundaries so every
// transition hits on a downbeat. The beat drop in the music is at t=30s
// (frame 900) — deliberately placed at the NotifyScene → AutoStartScene
// cut so the lightning bolt drops in ON the beat drop.
//
//   scene         | frames | sec  | bars | cumulative (start)
//   IntroHook     |  180   | 6.0  | 3    |    0
//   BeforeAfter   |  120   | 4.0  | 2    |  180
//   Dashboard     |  180   | 6.0  | 3    |  300
//   Keywords      |  120   | 4.0  | 2    |  480
//   Filters       |  120   | 4.0  | 2    |  600
//   Notify        |  180   | 6.0  | 3    |  720
//   AutoStart     |  120   | 4.0  | 2    |  900  <-- BEAT DROP
//   Activity      |   90   | 3.0  | 1.5  | 1020
//   CTA           |   90   | 3.0  | 1.5  | 1110
//   Total         | 1200   |40.0  |20    | 1200
export const SCENE_FRAMES = {
  introHook: 180,
  beforeAfter: 120,
  dashboard: 180,
  keywords: 120,
  filters: 120,
  notify: 180,
  autoStart: 120,
  activity: 90,
  cta: 90,
} as const;

export const TRAILER_TOTAL_FRAMES = Object.values(SCENE_FRAMES).reduce(
  (sum, n) => sum + n,
  0
);
