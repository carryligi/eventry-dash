import React from "react";
import { COLORS, FONT_FAMILY } from "./tokens";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  accent?: "default" | "success";
  badge?: React.ReactNode;
  width?: number | string;
}

// Minimal dashboard-style stat card. Matches the Eventry dashboard aesthetic:
// small uppercase label, large value, optional green-accent success state.
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  accent = "default",
  badge,
  width = 340,
}) => {
  return (
    <div
      style={{
        width,
        backgroundColor: COLORS.bgSecondary,
        border: `1px solid ${
          accent === "success" ? "rgba(48, 209, 88, 0.28)" : COLORS.borderSubtle
        }`,
        borderRadius: 16,
        padding: "28px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow:
          accent === "success"
            ? "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(48, 209, 88, 0.12)"
            : "0 20px 60px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontWeight: 500,
            fontSize: 18,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: COLORS.textSecondary,
          }}
        >
          {label}
        </div>
        {badge}
      </div>
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 600,
          fontSize: 56,
          letterSpacing: "-0.02em",
          color:
            accent === "success" ? COLORS.success : COLORS.textPrimary,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
};
