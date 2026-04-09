import React from "react";
import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { Trailer } from "./Trailer";
import { TRAILER_TOTAL_FRAMES } from "./trailer/components/tokens";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="EventryTrailer"
        component={Trailer}
        durationInFrames={TRAILER_TOTAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
