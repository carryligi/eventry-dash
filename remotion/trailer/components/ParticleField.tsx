import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// Deterministic pseudo-random in [0, 1) — seeded by index, no Math.random() so
// Remotion's per-frame rendering stays flicker-free.
const rand = (i: number, salt: number): number => {
  const x = Math.sin(i * 9301 + salt * 49297) * 233280;
  return x - Math.floor(x);
};

const PARTICLE_COUNT = 45;

export const ParticleField: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const baseX = rand(i, 1) * width;
        const baseY = rand(i, 2) * height;
        const speed = 0.2 + rand(i, 3) * 0.4; // px per frame
        const size = 1 + rand(i, 4) * 2.5;
        const opacity = 0.15 + rand(i, 5) * 0.35;
        const drift = Math.sin((frame + i * 13) / 60) * 8;

        // Drift upward slowly, wrap around bottom
        const y = (baseY - frame * speed) % height;
        const wrappedY = y < 0 ? y + height : y;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: baseX + drift,
              top: wrappedY,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: `rgba(229, 229, 234, ${opacity})`,
              boxShadow: `0 0 ${size * 3}px rgba(229, 229, 234, ${opacity * 0.6})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
