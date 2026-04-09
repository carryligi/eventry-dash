import React from "react";
import { AbsoluteFill, Audio, interpolate, Series, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { BackgroundGlow } from "./trailer/components/BackgroundGlow";
import { ParticleField } from "./trailer/components/ParticleField";
import {
  SCENE_FRAMES,
  COLORS,
  CLAMP,
  TRAILER_TOTAL_FRAMES,
} from "./trailer/components/tokens";
import { IntroHookScene } from "./trailer/scenes/IntroHookScene";
import { BeforeAfterScene } from "./trailer/scenes/BeforeAfterScene";
import { DashboardOverviewScene } from "./trailer/scenes/DashboardOverviewScene";
import { KeywordsScene } from "./trailer/scenes/KeywordsScene";
import { FiltersScene } from "./trailer/scenes/FiltersScene";
import { NotifyScene } from "./trailer/scenes/NotifyScene";
import { AutoStartScene } from "./trailer/scenes/AutoStartScene";
import { ActivityFeedScene } from "./trailer/scenes/ActivityFeedScene";
import { CTAScene } from "./trailer/scenes/CTAScene";

// Load Inter in all needed weights so every scene has a matching glyph set.
loadFont("normal", { weights: ["300", "400", "500", "600", "900"] });

// --- Audio -----------------------------------------------------------------
// Background track: JxnBeatz "ICE" (trap instrumental, ~120 BPM, 4:29).
// File lives at public/trailer-music.webm (opus/webm from yt-dlp). Chromium
// plays webm/opus natively, so Remotion renders it without conversion.
//
// Scene durations in tokens.ts are bar-aligned to 120 BPM (1 bar = 60 frames)
// and the NotifyScene → AutoStartScene cut lands on the track's beat drop
// at t=30s (frame 900) — lightning bolt drops on the beat drop.
//
// Volume curve holds at 0.85 across the whole composition with quick fade
// in/out. The track's own dynamics (quiet intro → loud drop) carry the
// cinematic build; no ducking needed.
const audioVolume = (frame: number): number => {
  return interpolate(
    frame,
    [0, 15, TRAILER_TOTAL_FRAMES - 30, TRAILER_TOTAL_FRAMES],
    [0, 0.85, 0.85, 0],
    CLAMP
  );
};
// ---------------------------------------------------------------------------

export const Trailer: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgRoot }}>
      {/* Background music — beat-synced trap instrumental, drops at frame 900. */}
      <Audio src={staticFile("trailer-music.webm")} volume={audioVolume} />

      {/* Persistent background layers shared across all scenes */}
      <BackgroundGlow />
      <ParticleField />

      {/* Sequential scene timeline — total duration comes from SCENE_FRAMES */}
      <Series>
        <Series.Sequence durationInFrames={SCENE_FRAMES.introHook}>
          <IntroHookScene durationInFrames={SCENE_FRAMES.introHook} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_FRAMES.beforeAfter}>
          <BeforeAfterScene durationInFrames={SCENE_FRAMES.beforeAfter} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_FRAMES.dashboard}>
          <DashboardOverviewScene
            durationInFrames={SCENE_FRAMES.dashboard}
          />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_FRAMES.keywords}>
          <KeywordsScene durationInFrames={SCENE_FRAMES.keywords} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_FRAMES.filters}>
          <FiltersScene durationInFrames={SCENE_FRAMES.filters} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_FRAMES.notify}>
          <NotifyScene durationInFrames={SCENE_FRAMES.notify} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_FRAMES.autoStart}>
          <AutoStartScene durationInFrames={SCENE_FRAMES.autoStart} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_FRAMES.activity}>
          <ActivityFeedScene durationInFrames={SCENE_FRAMES.activity} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_FRAMES.cta}>
          <CTAScene durationInFrames={SCENE_FRAMES.cta} />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
