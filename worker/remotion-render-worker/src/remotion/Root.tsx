import React from "react";
import { Composition } from "remotion";
import { RgsCampaignVideo, type RgsCampaignVideoProps } from "./VideoComposition.js";
export const RemotionRoot: React.FC = () => (
  <Composition<RgsCampaignVideoProps> id="RgsCampaignVideo" component={RgsCampaignVideo} durationInFrames={450} fps={30} width={1080} height={1920} defaultProps={{ scenePlan: null }} />
);
