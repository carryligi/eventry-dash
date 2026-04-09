import React from "react";
import { COLORS, FONT_FAMILY, SILVER_GRADIENT } from "./tokens";

interface WordmarkProps {
  size?: number;
  letterSpacing?: number;
  // 0..1 drives the diagonal sheen sweep position. 0 = off-screen left, 1 = off-screen right.
  sheenProgress?: number;
}

// Reusable silver-gradient EVENTRY wordmark with an optional diagonal sheen sweep.
// The sheen is achieved by sliding a wide gradient across a stationary text element
// via `backgroundPosition` — the element itself does not move, so nothing overflows.
export const Wordmark: React.FC<WordmarkProps> = ({
  size = 180,
  letterSpacing = 12,
  sheenProgress,
}) => {
  const showSheen =
    sheenProgress !== undefined && sheenProgress > 0 && sheenProgress < 1;
  // Slide gradient background-position from 100% (band off-screen right) to 0% (band off-screen left).
  // But we want the sheen to travel LEFT -> RIGHT across the text, so invert: 100% -> 0%.
  const sheenBgPos = showSheen ? 100 - (sheenProgress as number) * 100 : 0;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: size,
          fontWeight: 900,
          letterSpacing,
          lineHeight: 1,
          background: SILVER_GRADIENT,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textShadow: `0 0 ${size * 0.3}px ${COLORS.accentGlow}`,
          userSelect: "none",
        }}
      >
        EVENTRY
      </div>
      {showSheen && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            fontFamily: FONT_FAMILY,
            fontSize: size,
            fontWeight: 900,
            letterSpacing,
            lineHeight: 1,
            backgroundImage:
              "linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 65%)",
            backgroundSize: "300% 100%",
            backgroundRepeat: "no-repeat",
            backgroundPosition: `${sheenBgPos}% 0%`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            pointerEvents: "none",
          }}
        >
          EVENTRY
        </div>
      )}
    </div>
  );
};
