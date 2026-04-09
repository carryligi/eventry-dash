import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const HelloWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1
        style={{
          color: "white",
          fontSize: 120,
          fontFamily: "sans-serif",
          opacity,
        }}
      >
        Hello Remotion
      </h1>
    </AbsoluteFill>
  );
};
