import React from "react";
import { COLORS, FONT_FAMILY, SILVER_GRADIENT } from "./tokens";

interface ChipProps {
  label: string;
  variant?: "silver" | "outline" | "ghost";
  size?: "md" | "lg";
  style?: React.CSSProperties;
  withCross?: boolean;
}

// Reusable chip primitive shared by Keywords / Filters / BeforeAfter scenes.
// Three variants:
//   - silver : solid silver-gradient pill (primary/active state)
//   - outline: dashed border (add/placeholder)
//   - ghost  : subtle filled pill for neutral tags
export const Chip: React.FC<ChipProps> = ({
  label,
  variant = "silver",
  size = "md",
  style,
  withCross = false,
}) => {
  const padding = size === "lg" ? "16px 26px" : "12px 20px";
  const fontSize = size === "lg" ? 26 : 22;

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding,
    borderRadius: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: 600,
    fontSize,
    letterSpacing: "-0.005em",
    lineHeight: 1,
  };

  const variantStyle: React.CSSProperties =
    variant === "silver"
      ? {
          background: SILVER_GRADIENT,
          color: COLORS.bgRoot,
          boxShadow: "0 6px 20px rgba(229, 229, 234, 0.18)",
        }
      : variant === "outline"
        ? {
            border: `1px dashed ${COLORS.borderStrong}`,
            color: COLORS.textSecondary,
            fontWeight: 500,
          }
        : {
            backgroundColor: COLORS.bgTertiary,
            color: COLORS.textPrimary,
            border: `1px solid ${COLORS.borderSubtle}`,
            fontWeight: 500,
          };

  return (
    <div style={{ ...base, ...variantStyle, ...style }}>
      <span>{label}</span>
      {withCross && (
        <span
          style={{
            fontSize: fontSize * 0.75,
            opacity: 0.55,
            lineHeight: 1,
            marginLeft: 2,
          }}
        >
          ✕
        </span>
      )}
    </div>
  );
};
