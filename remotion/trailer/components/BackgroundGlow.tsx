import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "./tokens";

// Full-screen cinematic radial glow that subtly breathes across the whole trailer.
export const BackgroundGlow: React.FC = () => {
  const frame = useCurrentFrame();
  // Gentle pulse: 0.75 -> 1.0 -> 0.75 over ~4s (120 frames)
  const pulse = 0.75 + (Math.sin(frame / 19) + 1) * 0.125;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgRoot }}>
      {/* Central radial glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(229, 229, 234, ${
            0.08 * pulse
          }) 0%, rgba(161, 161, 166, ${0.03 * pulse}) 30%, rgba(0, 0, 0, 0) 65%)`,
        }}
      />
      {/* Subtle vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
