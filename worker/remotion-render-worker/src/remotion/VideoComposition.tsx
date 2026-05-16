import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
export interface RgsCampaignVideoProps { scenePlan: { scenes?: { duration_seconds?: number; on_screen_text?: string }[]; brand?: { background?: string; foreground?: string } } | null; }
export const RgsCampaignVideo: React.FC<RgsCampaignVideoProps> = ({ scenePlan }) => {
  const { fps } = useVideoConfig();
  const scenes = scenePlan?.scenes ?? [];
  const bg = scenePlan?.brand?.background ?? "#1F1F1F";
  const fg = scenePlan?.brand?.foreground ?? "#F5F5F5";
  let acc = 0;
  return (<AbsoluteFill style={{ backgroundColor: bg, color: fg }}>{scenes.map((s, i) => { const d = Math.round(Math.max(1, s.duration_seconds ?? 3) * fps); const from = acc; acc += d; return (<Sequence key={i} from={from} durationInFrames={d}><Frame text={s.on_screen_text ?? ""} /></Sequence>); })}</AbsoluteFill>);
};
const Frame: React.FC<{ text: string }> = ({ text }) => { const f = useCurrentFrame(); const o = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" }); return (<AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}><div style={{ opacity: o, fontSize: 72, fontWeight: 600, textAlign: "center" }}>{text}</div></AbsoluteFill>); };
